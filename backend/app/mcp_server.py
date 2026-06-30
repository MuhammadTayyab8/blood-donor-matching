import math
import threading
from datetime import datetime, date, timedelta
from mcp.server.fastmcp import FastMCP
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import (
    Donor, BloodRequest, OutreachWave, DonorOutreach, 
    TimelineEvent, SystemSettings, AILog, SystemNotification,
    get_coordinates_for_location
)
from app.email_utils import (
    send_donor_outreach_email,
    send_requester_confirmation_email,
)
from app.whatsapp_utils import send_whatsapp_message

# Initialize FastMCP Server
mcp = FastMCP("BloodDonationServer")


def launch_wave_outreach_background(request_id: int, wave_number: int):
    """Orchestrates donor matching and outreach waves for a request."""
    db: Session = SessionLocal()
    try:
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        settings = db.query(SystemSettings).first()
        if not settings:
            settings = SystemSettings()
            db.add(settings)
            db.commit()
            db.refresh(settings)
            db.expunge(settings)

        if not request or request.status != "Active":
            return

        # Log AI Matcher Agent start
        log_ai = AILog(
            agent_name="Matcher Agent",
            action_taken=f"Searching compatible donors for Request #{request_id} ({request.blood_group})",
            request_id=request_id
        )
        db.add(log_ai)
        db.commit()

        # Proximity sorting centered at request's hospital
        match_result = search_donors(blood_group=request.blood_group, location=request.hospital, limit=12)

        if match_result.get("status") != "success" or not match_result.get("donors"):
            db.add(AILog(agent_name="Matcher Agent", action_taken="No eligible matching donors found.", request_id=request_id))
            db.add(TimelineEvent(request_id=request_id, event_content="AI Search: No matching donors found."))
            db.add(SystemNotification(message=f"Urgent: No donors found for Request #{request_id}", notification_type="Escalation"))
            db.commit()
            return

        donors_pool = match_result["donors"]
        needed = request.units_required - request.units_confirmed
        target_contact_count = min(needed * settings.wave_multiplier, len(donors_pool))

        start_idx = (wave_number - 1) * target_contact_count
        end_idx = start_idx + target_contact_count
        target_donors = donors_pool[start_idx:end_idx]

        if not target_donors:
            db.add(TimelineEvent(request_id=request_id, event_content="Outreach Escalated: Out of donor pool."))
            db.add(SystemNotification(message=f"Request #{request_id} escalated: Exhausted donor list.", notification_type="Escalation"))
            request.urgency = "Critical"
            db.commit()
            return

        wave = OutreachWave(
            request_id=request_id,
            wave_number=wave_number,
            status="Completed",
            launched_at=datetime.utcnow()
        )
        db.add(wave)
        db.commit()
        db.refresh(wave)

        donor_names = ", ".join([d["name"] for d in target_donors])
        db.add(AILog(
            agent_name="Outreach Agent",
            action_taken=f"Launching Wave {wave_number} outreach to {len(target_donors)} donors: {donor_names}",
            request_id=request_id
        ))
        db.add(TimelineEvent(
            request_id=request_id,
            event_content=f"Outreach Wave {wave_number} Launched ({len(target_donors)} donors)"
        ))
        db.add(SystemNotification(
            message=f"Wave {wave_number} launched for Request #{request_id}, contacting {len(target_donors)} donors.",
            notification_type="Wave Launch"
        ))
        db.commit()

        for donor_data in target_donors:
            donor_id = donor_data["id"]
            donor = db.query(Donor).filter(Donor.id == donor_id).first()
            if donor:
                outreach = DonorOutreach(
                    wave_id=wave.id,
                    donor_id=donor_id,
                    status="Pending"
                )
                db.add(outreach)
                db.commit()

                send_donor_outreach_email(
                    donor_email=donor.email,
                    donor_name=donor.name,
                    request_id=request_id,
                    wave_id=wave.id,
                    donor_id=donor_id,
                    blood_group=request.blood_group,
                    hospital=request.hospital,
                    urgency=request.urgency
                )

                wa_msg = f"RedLine Alert: Emergency blood need ({request.blood_group}) at {request.hospital}. Can you donate? Reply YES to confirm."
                send_whatsapp_message(donor.phone, wa_msg)

    except Exception as e:
        print(f"Error in background dispatcher: {e}")
    finally:
        db.close()


def schedule_wave_outreach(request_id: int, wave_number: int):
    thread = threading.Thread(
        target=launch_wave_outreach_background,
        args=(request_id, wave_number),
        daemon=True,
    )
    thread.start()

# --- Location Proximity Helper ---
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the Haversine distance in kilometers between two points."""
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- Blood Group Compatibility Rules ---
# Key can donate to values
BLOOD_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"]
}

def is_blood_compatible(donor_group: str, recipient_group: str) -> bool:
    """Returns True if the donor's blood group can be received by the recipient."""
    # Convert O negative and others to normalized keys
    d_grp = donor_group.strip().upper()
    r_grp = recipient_group.strip().upper()
    
    # Exact match is always compatible
    if d_grp == r_grp:
        return True
        
    return r_grp in BLOOD_COMPATIBILITY.get(d_grp, [])

# --- MCP Tools ---

@mcp.tool()
def search_donors(blood_group: str, location: str, limit: int = 10) -> dict:
    """Search and rank eligible donors based on blood group compatibility and location proximity.
    
    Args:
        blood_group: The blood group required for the recipient (e.g. 'O-', 'A+').
        location: Hospital name or area where the blood is needed (e.g. 'Indus Hospital', 'Gulshan-e-Iqbal').
        limit: Maximum number of donors to return (default 10).
        
    Returns:
        A dictionary containing status, recipient details, and a sorted list of matching eligible donors.
    """
    db: Session = SessionLocal()
    try:
        # Resolve target coordinates for sorting
        print(location, "location: 1.1")
        target_coords = get_coordinates_for_location(location)
        print(target_coords, "target_coords: 1.2")
        
        # Query all available donors
        donors = db.query(Donor).filter(Donor.is_available == True).all()
        print(donors, "donors: 1.3")

        matched_donors = []
        ninety_days_ago = date.today() - timedelta(days=90)
        
        for donor in donors:
            # 1. Check blood compatibility
            if not is_blood_compatible(donor.blood_group, blood_group):
                continue
                
            # 2. Check donation eligibility (must not have donated in last 90 days)
            if donor.last_donation_date and donor.last_donation_date > ninety_days_ago:
                continue
                
            # 3. Calculate distance
            dist = haversine_distance(
                target_coords["lat"], target_coords["lon"],
                donor.latitude, donor.longitude
            )
            
            matched_donors.append({
                "id": donor.id,
                "name": donor.name,
                "email": donor.email,
                "phone": donor.phone,
                "blood_group": donor.blood_group,
                "location": donor.location,
                "distance_km": round(dist, 2),
                "donation_count": donor.donation_count
            })
            
        # Sort by distance
        matched_donors.sort(key=lambda x: x["distance_km"])
        
        return {
            "status": "success",
            "blood_group_needed": blood_group,
            "target_location": location,
            "donors_matched_count": len(matched_donors),
            "donors": matched_donors[:limit]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@mcp.tool()
def create_blood_request(patient_id: str, requester_email:str, blood_group: str, hospital: str, units: int, urgency: str) -> dict:
    """Create a new blood request in the system.
    
    Args:
        patient_id: Identifier for the patient (e.g. 'PT-88412').
        requester_email: Required to notify requester.
        blood_group: Required blood group (e.g. 'O-').
        hospital: Hospital name (e.g. 'Indus Hospital').
        units: Number of units required.
        urgency: Urgency level (e.g. 'Critical', 'High', 'Medium', 'Low').
        
    Returns:
        A dictionary containing the created request details.
    """
    db: Session = SessionLocal()
    try:
        new_request = BloodRequest(
            patient_id=patient_id,
            requester_email=requester_email,
            hospital=hospital,
            blood_group=blood_group,
            units_required=units,
            units_confirmed=0,
            urgency=urgency,
            status="Active",
            created_at=datetime.utcnow()
        )
        db.add(new_request)
        db.commit()
        db.refresh(new_request)
        
        # Log request creation to timeline
        timeline_event = TimelineEvent(
            request_id=new_request.id,
            event_time=datetime.utcnow(),
            event_content="Request Created"
        )
        db.add(timeline_event)
        
        # Log system notification
        notif = SystemNotification(
            message=f"New blood request #{new_request.id} ({blood_group}) created for {hospital}.",
            notification_type="Request Intake",
            timestamp=datetime.utcnow()
        )
        db.add(notif)
        db.commit()

        # Send the requester confirmation email and start the first outreach wave
        if new_request.requester_email:
            send_requester_confirmation_email(
                requester_email=new_request.requester_email,
                request_id=new_request.id,
                blood_group=new_request.blood_group,
                hospital=new_request.hospital,
                units=new_request.units_required,
            )

        schedule_wave_outreach(new_request.id, 1)

        return {
            "status": "success",
            "request_id": new_request.id,
            "patient_id": new_request.patient_id,
            "hospital": new_request.hospital,
            "blood_group": new_request.blood_group,
            "units_required": new_request.units_required,
            "urgency": new_request.urgency,
            "status_str": new_request.status
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@mcp.tool()
def log_timeline_event(request_id: int, event: str) -> dict:
    """Log an activity event for a specific request's timeline.
    
    Args:
        request_id: The ID of the blood request.
        event: Text description of the event (e.g. 'Outreach Wave 1 Launched').
        
    Returns:
        A dictionary confirming the logged event.
    """
    db: Session = SessionLocal()
    try:
        db_event = TimelineEvent(
            request_id=request_id,
            event_time=datetime.utcnow(),
            event_content=event
        )
        db.add(db_event)
        db.commit()
        return {"status": "success", "event_id": db_event.id, "request_id": request_id, "event": event}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@mcp.tool()
def log_ai_activity(agent_name: str, action: str, request_id: int = None) -> dict:
    """Log an action performed by an AI agent into the audit logs.
    
    Args:
        agent_name: Name of the AI agent (e.g. 'Matcher Agent').
        action: Action description (e.g. 'Matched 12 donors for Request #321').
        request_id: Optional ID of the related request.
        
    Returns:
        A dictionary confirming the logged activity.
    """
    db: Session = SessionLocal()
    try:
        log_entry = AILog(
            agent_name=agent_name,
            action_taken=action,
            request_id=request_id,
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        return {"status": "success", "log_id": log_entry.id, "agent_name": agent_name, "action": action}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@mcp.tool()
def send_outreach_email(donor_id: int, request_id: int, wave_id: int) -> dict:
    """Generate and send an HTML email outreach message to a specific donor.
    
    Args:
        donor_id: The ID of the donor to contact.
        request_id: The ID of the related blood request.
        wave_id: The ID of the active outreach wave.
        
    Returns:
        A dictionary confirming whether the email was queued/sent.
    """
    db: Session = SessionLocal()
    try:
        donor = db.query(Donor).filter(Donor.id == donor_id).first()
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        
        if not donor or not request:
            return {"status": "error", "message": "Donor or Request not found."}
            
        success = send_donor_outreach_email(
            donor_email=donor.email,
            donor_name=donor.name,
            request_id=request.id,
            wave_id=wave_id,
            donor_id=donor.id,
            blood_group=request.blood_group,
            hospital=request.hospital,
            urgency=request.urgency
        )
        
        # Log outreach in the wave details
        outreach = DonorOutreach(
            wave_id=wave_id,
            donor_id=donor_id,
            status="Pending"
        )
        db.add(outreach)
        db.commit()
        
        return {
            "status": "success" if success else "failed",
            "donor_email": donor.email,
            "donor_name": donor.name,
            "request_id": request.id,
            "wave_id": wave_id
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@mcp.tool()
def send_whatsapp_outreach(donor_id: int, message: str) -> dict:
    """Simulate sending a WhatsApp outreach message to a donor.
    
    Args:
        donor_id: The ID of the donor to message.
        message: The WhatsApp message body text.
        
    Returns:
        A dictionary confirming the WhatsApp dispatch.
    """
    db: Session = SessionLocal()
    try:
        donor = db.query(Donor).filter(Donor.id == donor_id).first()
        if not donor:
            return {"status": "error", "message": "Donor not found."}
            
        success = send_whatsapp_message(donor.phone, message)
        return {
            "status": "success" if success else "failed",
            "donor_phone": donor.phone,
            "donor_name": donor.name
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@mcp.tool()
def get_system_settings() -> dict:
    """Retrieve system configuration settings for wave dispatcher rules.
    
    Returns:
        A dictionary containing settings like wave multiplier, delay, etc.
    """
    db: Session = SessionLocal()
    try:
        settings = db.query(SystemSettings).first()
        if not settings:
            return {
                "wave_multiplier": 3,
                "max_waves": 3,
                "follow_up_delay": 60,
                "response_timeout": 30,
                "emergency_threshold": 2,
                "preferred_channels": "Email,WhatsApp"
            }
        return {
            "wave_multiplier": settings.wave_multiplier,
            "max_waves": settings.max_waves,
            "follow_up_delay": settings.follow_up_delay,
            "response_timeout": settings.response_timeout,
            "emergency_threshold": settings.emergency_threshold,
            "preferred_channels": settings.preferred_channels
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
