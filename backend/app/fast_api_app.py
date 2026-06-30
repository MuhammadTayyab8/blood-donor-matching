import os
from uuid import uuid4
import sys
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict

try:
    import google.auth
    HAS_GOOGLE_AUTH = True
except ImportError:
    HAS_GOOGLE_AUTH = False
    
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

# Setup paths and environment
AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if AGENT_DIR not in sys.path:
    sys.path.append(AGENT_DIR)

from app.database import get_db, init_db, SessionLocal
from app.models import (
    Donor, BloodRequest, OutreachWave, DonorOutreach,
    TimelineEvent, SystemSettings, AILog, SystemNotification,
    DonorCreate, DonorUpdate, DonorResponse,
    BloodRequestCreate, BloodRequestResponse, RequestDetailResponse,
    SettingsUpdate, NotificationResponse, AILogResponse, ChatMessageRequest,
    get_coordinates_for_location
)
from app.email_utils import (
    MOCK_EMAIL_INBOX, 
    send_donor_outreach_email, 
    send_requester_confirmation_email, 
    send_requester_donor_update_email,
    send_requester_fulfillment_summary_email,
    send_donor_verification_email, 
    send_requester_verification_email,
    schedule_post_donation_verification,
)
from app.whatsapp_utils import MOCK_WHATSAPP_LOGS
from app.mcp_server import launch_wave_outreach_background

# Import agents only if available
try:
    from app.agents import process_chat_message
    HAS_AGENTS = True
except ImportError:
    HAS_AGENTS = False
    async def process_chat_message(msg: str) -> str:
        return "Chat service unavailable. Please ensure all dependencies are installed."

# Create FastAPI app
app: FastAPI = FastAPI()

# Check for GCP Credentials safely
if HAS_GOOGLE_AUTH:
    try:
        _, project_id = google.auth.default()
        os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
    except Exception:
        project_id = "mock-project"
        os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
else:
    project_id = "mock-project"
    os.environ["GOOGLE_CLOUD_PROJECT"] = project_id

app.title = "RedLine Blood AI Dispatcher API"
app.description = "API endpoints for the AI-driven blood donation routing and notification system"

# Configure CORS for local frontend support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and seed mock data
init_db()
print("Database initialized and mock data seeded.")

# --- Background Task for Automated AI Dispatching ---
def launch_wave_outreach_background(request_id: int, wave_number: int):
    """Orchestrates donor matching and outreach waves in the background."""
    db: Session = SessionLocal()
    try:
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        settings = db.query(SystemSettings).first()
        if not settings:
            settings = SystemSettings()
            
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
        from app.mcp_server import search_donors
        match_result = search_donors(blood_group=request.blood_group, location=request.hospital, limit=12)
        
        if match_result["status"] != "success" or not match_result["donors"]:
            # Log failure in activity and timeline
            db.add(AILog(agent_name="Matcher Agent", action_taken="No eligible matching donors found.", request_id=request_id))
            db.add(TimelineEvent(request_id=request_id, event_content="AI Search: No matching donors found."))
            db.add(SystemNotification(message=f"Urgent: No donors found for Request #{request_id}", notification_type="Escalation"))
            db.commit()
            return
            
        donors_pool = match_result["donors"]
        
        # Calculate how many donors to contact
        # Formula: units needed * wave multiplier
        multiplier = settings.wave_multiplier
        needed = request.units_required - request.units_confirmed
        target_contact_count = min(
            needed * multiplier,
            len(donors_pool)
        )
        
        # Paginate based on wave number (e.g. Wave 1 gets first batch, Wave 2 gets next)
        start_idx = (wave_number - 1) * target_contact_count
        end_idx = start_idx + target_contact_count
        target_donors = donors_pool[start_idx:end_idx]
        
        if not target_donors:
            # Escalation
            db.add(TimelineEvent(request_id=request_id, event_content="Outreach Escalated: Out of donor pool."))
            db.add(SystemNotification(message=f"Request #{request_id} escalated: Exhausted donor list.", notification_type="Escalation"))
            request.urgency = "Critical"
            db.commit()
            return
            
        # Create Outreach Wave Record
        wave = OutreachWave(
            request_id=request_id,
            wave_number=wave_number,
            status="Completed",
            launched_at=datetime.utcnow()
        )
        db.add(wave)
        db.commit()
        db.refresh(wave)
        
        # Log Outreach Agent start
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
        
        # Contact each donor
        for donor_data in target_donors:
            donor_id = donor_data["id"]
            donor = db.query(Donor).filter(Donor.id == donor_id).first()
            if donor:
                # 1. Save outreach tracking record
                outreach = DonorOutreach(
                    wave_id=wave.id,
                    donor_id=donor_id,
                    status="Pending"
                )
                db.add(outreach)
                db.commit()
                
                # 2. Dispatch simulated email
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
                
                # 3. Dispatch simulated WhatsApp
                from app.whatsapp_utils import send_whatsapp_message
                wa_msg = f"RedLine Alert: Emergency blood need ({request.blood_group}) at {request.hospital}. Can you donate? Reply YES to confirm."
                send_whatsapp_message(donor.phone, wa_msg)
                
    except Exception as e:
        print(f"Error in background dispatcher: {e}")
    finally:
        db.close()


# --- REST API Endpoints ---

# 1. Dashboard Statistics
@app.get("/api/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)):
    # Calculate KPIs
    active_requests = db.query(BloodRequest).filter(BloodRequest.status == "Active").count()
    
    # Confirmed Donors (total accepts)
    confirmed_donors = db.query(DonorOutreach).filter(DonorOutreach.status == "Accepted").count()
    
    # Success Rate (Fulfilled / Total * 100)
    total_reqs = db.query(BloodRequest).count()
    fulfilled_reqs = db.query(BloodRequest).filter(BloodRequest.status == "Fulfilled").count()
    success_rate = round((fulfilled_reqs / total_reqs * 100), 1) if total_reqs > 0 else 100.0
    
    # Total Donors Contacted
    total_contacted = db.query(DonorOutreach).count()
    
    # Response Rate (Accepted + Declined / Total Contacted * 100)
    responded = db.query(DonorOutreach).filter(DonorOutreach.status.in_(["Accepted", "Declined"])).count()
    response_rate = round((responded / total_contacted * 100), 1) if total_contacted > 0 else 0.0
    
    # Pending Responses
    pending_responses = db.query(DonorOutreach).filter(DonorOutreach.status == "Pending").count()
    
    # Units Secured Today (dummy seed or aggregation)
    units_today = db.query(func.sum(BloodRequest.units_confirmed)).filter(
        BloodRequest.created_at >= datetime.utcnow().date()
    ).scalar() or 0
    
    # Active Emergency Requests Table
    emergency_requests = db.query(BloodRequest).filter(
        BloodRequest.status == "Active",
        BloodRequest.urgency.in_(["Critical", "High"])
    ).all()
    
    # Request trends (past 7 days)
    today = datetime.utcnow().date()
    trends = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = db.query(BloodRequest).filter(
            func.date(BloodRequest.created_at) == day
        ).count()
        trends.append({"date": day.strftime("%b %d"), "requests": count})
        
    # Demand by Blood Group
    blood_demand_raw = db.query(
        BloodRequest.blood_group, func.sum(BloodRequest.units_required)
    ).group_by(BloodRequest.blood_group).all()
    blood_demand = [{"blood_group": grp, "units": int(units)} for grp, units in blood_demand_raw if grp]
    
    # Hospital request distribution
    hosp_raw = db.query(
        BloodRequest.hospital, func.count(BloodRequest.id)
    ).group_by(BloodRequest.hospital).all()
    hospital_dist = [{"hospital": hosp, "count": count} for hosp, count in hosp_raw if hosp]
    
    # AI Activity Metrics
    agent_raw = db.query(
        AILog.agent_name, func.count(AILog.id)
    ).group_by(AILog.agent_name).all()
    agent_perf = [{"agent_name": name, "count": count} for name, count in agent_raw]

    return {
        "kpis": {
            "active_requests": active_requests,
            "confirmed_donors": confirmed_donors,
            "success_rate": f"{success_rate}%",
            "average_match_time": "4.5 Min",
            "units_secured_today": int(units_today),
            "total_donors_contacted": total_contacted,
            "response_rate": f"{response_rate}%",
            "pending_responses": pending_responses,
            "average_fulfillment_time": "35 Min"
        },
        "active_emergency_requests": [
            {
                "id": r.id,
                "urgency": r.urgency,
                "blood_group": r.blood_group,
                "hospital": r.hospital,
                "units_required": r.units_required,
                "units_confirmed": r.units_confirmed
            } for r in emergency_requests
        ],
        "analytics": {
            "request_trends": trends,
            "blood_group_demand": blood_demand,
            "donor_response_rate": {
                "Accepted": db.query(DonorOutreach).filter(DonorOutreach.status == "Accepted").count(),
                "Declined": db.query(DonorOutreach).filter(DonorOutreach.status == "Declined").count(),
                "Pending": pending_responses
            },
            "fulfillment_rate": {
                "Fulfilled": fulfilled_reqs,
                "Active": active_requests,
                "Canceled": db.query(BloodRequest).filter(BloodRequest.status == "Canceled").count()
            },
            "hospital_distribution": hospital_dist,
            "ai_agent_performance": agent_perf
        }
    }


# 2. Blood Requests Management
@app.post("/api/requests", response_model=BloodRequestResponse)
def create_request(
    request: BloodRequestCreate, 
    background_tasks: BackgroundTasks, 
    email: str = Query(None), 
    db: Session = Depends(get_db)
):
    # Log intake activity
    db.add(AILog(agent_name="Intake Agent", action_taken=f"Parsing request details: {request.blood_group} required at {request.hospital}"))
    db.commit()
    
    # Save blood request
    db_request = BloodRequest(
        patient_id=request.patient_id,
        requester_email=email,
        hospital=request.hospital,
        blood_group=request.blood_group,
        units_required=request.units_required,
        urgency=request.urgency,
        status="Active",
        created_at=datetime.utcnow()
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Log creation timeline
    db.add(TimelineEvent(request_id=db_request.id, event_content="Request Created"))
    db.add(SystemNotification(
        message=f"Blood Request #{db_request.id} ({request.blood_group}) created for {request.hospital}.",
        notification_type="Request Intake"
    ))
    db.commit()
    
    # Send email tracking confirmation if email provided
    if email:
        send_requester_confirmation_email(
            requester_email=email,
            request_id=db_request.id,
            blood_group=request.blood_group,
            hospital=request.hospital,
            units=request.units_required
        )
        
    # Queue AI Outreach Matching & Wave 1 background task
    background_tasks.add_task(launch_wave_outreach_background, db_request.id, 1)
    
    return db_request

@app.get("/api/requests")
def list_requests(
    hospital: Optional[str] = None, 
    status: Optional[str] = None, 
    blood_group: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(BloodRequest)
    if hospital:
        query = query.filter(BloodRequest.hospital.contains(hospital))
    if status:
        query = query.filter(BloodRequest.status == status)
    if blood_group:
        query = query.filter(BloodRequest.blood_group == blood_group)
        
    requests = query.all()
    
    return [
        {
            "id": r.id,
            "patient_id": r.patient_id,
            "hospital": r.hospital,
            "blood_group": r.blood_group,
            "units_required": r.units_required,
            "units_confirmed": r.units_confirmed,
            "urgency": r.urgency,
            "status": r.status,
            "created_at": r.created_at
        } for r in requests
    ]

@app.get("/api/requests/{request_id}")
def get_request_details(request_id: int, db: Session = Depends(get_db)):
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Blood request not found")
        
    timeline = db.query(TimelineEvent).filter(TimelineEvent.request_id == request_id).order_by(TimelineEvent.event_time.asc()).all()
    
    # Progress percentage
    progress = 100.0
    if request.units_required > 0:
        progress = round((request.units_confirmed / request.units_required * 100), 0)
        
    # Live donor counts
    accepted = 0
    pending = 0
    declined = 0
    
    waves_list = []
    for wave in request.waves:
        wave_donors = []
        for out in wave.outreaches:
            if out.status == "Accepted":
                accepted += 1
            elif out.status == "Declined":
                declined += 1
            else:
                pending += 1
                
            wave_donors.append({
                "donor_name": out.donor.name,
                "status": out.status,
                "phone": out.donor.phone
            })
            
        waves_list.append({
            "wave_number": wave.wave_number,
            "launched_at": wave.launched_at,
            "donors": wave_donors
        })

    return {
        "request": {
            "id": request.id,
            "patient_id": request.patient_id,
            "hospital": request.hospital,
            "blood_group": request.blood_group,
            "units_required": request.units_required,
            "units_confirmed": request.units_confirmed,
            "urgency": request.urgency,
            "status": request.status,
            "created_at": request.created_at
        },
        "timeline": [
            {
                "id": t.id,
                "event_time": t.event_time,
                "event_content": t.event_content
            } for t in timeline
        ],
        "progress_percentage": progress,
        "live_donor_status": {
            "Accepted": accepted,
            "Pending": pending,
            "Declined": declined,
            "Unavailable": 0
        },
        "waves": waves_list
    }

@app.post("/api/requests/{request_id}/wave")
def launch_next_wave(request_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if request.status != "Active":
        raise HTTPException(status_code=400, detail="Outreach can only be triggered for active requests.")
        
    next_wave_num = len(request.waves) + 1
    
    background_tasks.add_task(launch_wave_outreach_background, request_id, next_wave_num)
    
    return {"status": "success", "message": f"Queued launch for Wave {next_wave_num}"}

@app.post("/api/requests/{request_id}/fulfill")
def fulfill_request(request_id: int, db: Session = Depends(get_db)):
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    request.status = "Fulfilled"
    db.add(TimelineEvent(request_id=request_id, event_content="Blood request marked as fulfilled manually"))
    db.add(SystemNotification(message=f"Request #{request_id} marked as fulfilled.", notification_type="Complete"))
    db.commit()
    
    return {"status": "success", "message": "Request fulfilled."}

@app.post("/api/requests/{request_id}/escalate")
def escalate_request(request_id: int, db: Session = Depends(get_db)):
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    request.urgency = "Critical"
    db.add(TimelineEvent(request_id=request_id, event_content="Request escalated to Critical priority"))
    db.add(SystemNotification(message=f"Emergency: Request #{request_id} escalated.", notification_type="Escalation"))
    db.commit()
    
    return {"status": "success", "message": "Request escalated to Critical."}


# 3. Donor Management
@app.post("/api/donors", response_model=DonorResponse)
def add_donor(donor: DonorCreate, db: Session = Depends(get_db)):
    # Check duplicate email  -  removing this logic for development
    # existing = db.query(Donor).filter(Donor.email == donor.email).first()
    # if existing:
    #     raise HTTPException(status_code=400, detail="Email already registered")
        
    coords = get_coordinates_for_location(donor.location)
    db_donor = Donor(
        name=donor.name,
        email=donor.email,
        phone=donor.phone,
        blood_group=donor.blood_group,
        location=donor.location,
        latitude=donor.latitude or coords["lat"],
        longitude=donor.longitude or coords["lon"],
        is_available=donor.is_available,
        donation_count=0
    )
    db.add(db_donor)
    db.commit()
    db.refresh(db_donor)
    return db_donor

@app.get("/api/donors")
def search_donors_route(
    blood_group: Optional[str] = None, 
    hospital_location: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(Donor)
    if blood_group:
        query = query.filter(Donor.blood_group == blood_group)
        
    donors = query.all()
    
    # If location is provided, calculate distance and sort
    if hospital_location:
        from app.mcp_server import get_coordinates_for_location, haversine_distance
        target_coords = get_coordinates_for_location(hospital_location)
        
        result_donors = []
        for donor in donors:
            dist = haversine_distance(target_coords["lat"], target_coords["lon"], donor.latitude, donor.longitude)
            result_donors.append({
                "id": donor.id,
                "name": donor.name,
                "email": donor.email,
                "phone": donor.phone,
                "blood_group": donor.blood_group,
                "location": donor.location,
                "distance_km": round(dist, 2),
                "is_available": donor.is_available,
                "donation_count": donor.donation_count,
                "last_donation_date": donor.last_donation_date
            })
        result_donors.sort(key=lambda x: x["distance_km"])
        return result_donors
    else:
        return [
            {
                "id": d.id,
                "name": d.name,
                "email": d.email,
                "phone": d.phone,
                "blood_group": d.blood_group,
                "location": d.location,
                "distance_km": 0.0,
                "is_available": d.is_available,
                "donation_count": d.donation_count,
                "last_donation_date": d.last_donation_date
            } for d in donors
        ]

@app.put("/api/donors/{donor_id}", response_model=DonorResponse)
def update_donor(donor_id: int, donor: DonorUpdate, db: Session = Depends(get_db)):
    db_donor = db.query(Donor).filter(Donor.id == donor_id).first()
    if not db_donor:
        raise HTTPException(status_code=404, detail="Donor not found")
        
    update_data = donor.model_dump(exclude_unset=True)
    
    if "location" in update_data and update_data["location"]:
        coords = get_coordinates_for_location(update_data["location"])
        db_donor.latitude = coords["lat"]
        db_donor.longitude = coords["lon"]
        
    for key, value in update_data.items():
        setattr(db_donor, key, value)
        
    db.commit()
    db.refresh(db_donor)
    return db_donor


# 4. Settings Management
@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@app.put("/api/settings")
def update_settings(settings_data: SettingsUpdate, db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    update_data = settings_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
        
    db.commit()
    db.refresh(settings)
    return settings


# 5. Simulated Channels & Notifications
@app.get("/api/notifications/emails")
def get_simulated_emails():
    """Mock Inbox Viewer route to allow inspecting sent emails and clicking actions."""
    return MOCK_EMAIL_INBOX

@app.get("/api/notifications/whatsapp")
def get_simulated_whatsapp():
    """Mock WhatsApp log viewer."""
    return MOCK_WHATSAPP_LOGS

@app.get("/api/notifications", response_model=List[NotificationResponse])
def get_system_notifications(db: Session = Depends(get_db)):
    return db.query(SystemNotification).order_by(SystemNotification.timestamp.desc()).limit(50).all()

@app.get("/api/ai-logs", response_model=List[AILogResponse])
def get_ai_audit_logs(db: Session = Depends(get_db)):
    return db.query(AILog).order_by(AILog.timestamp.desc()).limit(50).all()


# 6. Interactive Bot Chat Intake
@app.post("/api/chat")
async def chat_intake(request: ChatMessageRequest):
    try:
        # Use existing session ID, or create a brand new one if it's the first message
        active_session_id = request.sessionId or str(uuid4())
        
        ai_reply = await process_chat_message(
            user_message=request.message, 
            user_email=request.email, 
            session_id=active_session_id
        )
        
        # Return the session ID back to frontend so it can pass it next time
        return {
            "status": "success", 
            "reply": ai_reply, 
            "sessionId": active_session_id
        }
    except Exception as e:
        print(e)
        return {"status": "error", "reply": f"Sorry, I had an error coordinating with my agents: {e}"}


# 7. Interactive Callbacks from outreach emails (Accept / Decline)
@app.get("/api/interactions/outreach-response", response_class=HTMLResponse)
def handle_outreach_response(
    status: str, 
    request_id: int, 
    wave_id: int, 
    donor_id: int, 
    db: Session = Depends(get_db)
):
    # Find outreach record
    outreach = db.query(DonorOutreach).filter(
        DonorOutreach.wave_id == wave_id,
        DonorOutreach.donor_id == donor_id
    ).first()
    
    if not outreach:
        return """
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #e53e3e;">Outreach Record Not Found</h1>
                <p>This request link is invalid or expired.</p>
            </body>
        </html>
        """
        
    if outreach.status != "Pending":
        return f"""
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>Already Responded</h1>
                <p>You have already marked this request as <strong>{outreach.status}</strong>.</p>
            </body>
        </html>
        """
        
    # Update outreach status
    outreach.status = status
    outreach.responded_at = datetime.utcnow()
    db.commit()
    
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    donor = db.query(Donor).filter(Donor.id == donor_id).first()
    
    if status == "Accepted" and request and donor:
        # Secure the unit
        request.units_confirmed += 1
        
        # Log to timeline
        db.add(TimelineEvent(
            request_id=request_id,
            event_content=f"{donor.name} Accepted ({request.units_confirmed} of {request.units_required} units secured)"
        ))
        
        # Log AI activity
        db.add(AILog(
            agent_name="Conversation Agent",
            action_taken=f"Notified requester: {donor.name} accepted Request #{request_id} ({request.units_confirmed} of {request.units_required} units secured)",
            request_id=request_id
        ))
        
        # Log system notification
        db.add(SystemNotification(
            message=f"{donor.name} accepted Request #{request_id} ({request.units_confirmed} of {request.units_required} units secured).",
            notification_type="Accept"
        ))
        db.commit()

        # Email update to requester about donor acceptance
        if request.requester_email:
            send_requester_donor_update_email(
                requester_email=request.requester_email,
                request_id=request_id,
                donor_name=donor.name,
                blood_group=request.blood_group,
                hospital=request.hospital,
                units_confirmed=request.units_confirmed,
                units_required=request.units_required,
            )

        # Schedule donor/requester verification after configured follow-up delay
        settings = db.query(SystemSettings).first()
        delay_minutes = settings.follow_up_delay if settings else 60
        if request.requester_email:
            schedule_post_donation_verification(
                request_id=request_id,
                donor_id=donor_id,
                donor_email=donor.email,
                donor_name=donor.name,
                requester_email=request.requester_email,
                delay_minutes=delay_minutes,
            )

        # Check completion
        if request.units_confirmed >= request.units_required:
            request.status = "Fulfilled"
            db.add(TimelineEvent(
                request_id=request_id,
                event_content="Request fully completed — all units secured."
            ))
            db.add(SystemNotification(
                message=f"Request #{request_id} fully completed — all {request.units_required} units secured.",
                notification_type="Complete"
            ))
            
            # Send final fulfillment summary to requester
            accepted_outreaches = db.query(DonorOutreach).join(OutreachWave).filter(
                OutreachWave.request_id == request_id,
                DonorOutreach.status == "Accepted"
            ).all()
            donor_list = []
            for outreach in accepted_outreaches:
                donor_list.append({
                    "name": outreach.donor.name,
                    "blood_group": outreach.donor.blood_group,
                    "phone": outreach.donor.phone,
                })
            if request.requester_email:
                send_requester_fulfillment_summary_email(
                    requester_email=request.requester_email,
                    request_id=request_id,
                    blood_group=request.blood_group,
                    hospital=request.hospital,
                    units_required=request.units_required,
                    donor_list=donor_list,
                )
        
        db.commit()
        
    elif status == "Declined" and donor:
        db.add(TimelineEvent(request_id=request_id, event_content=f"Donor {donor.name} Declined"))
        db.add(SystemNotification(message=f"Donor {donor.name} rejected Request #{request_id}.", notification_type="Reject"))
        db.commit()
        
    # HTML Response styling matching design tokens
    page_title = "Response Registered"
    body_content = ""
    if status == "Accepted":
        body_content = f"""
        <h1 style="color: #48bb78;">Thank you, {donor.name}!</h1>
        <p style="font-size: 18px;">You have accepted the request for <strong>{request.blood_group}</strong> at <strong>{request.hospital}</strong>.</p>
        <p>The patient's family has been notified and we have shared your contact details. Please proceed to the blood bank as soon as possible.</p>
        """
    else:
        body_content = f"""
        <h1 style="color: #e53e3e;">Response Registered</h1>
        <p style="font-size: 18px;">Thank you for letting us know, {donor.name or "Donor"}.</p>
        <p>We will contact other matching donors to fulfill the request. If your availability status changes, you can update it in your profile.</p>
        """
        
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{page_title}</title>
        <style>
            body {{ font-family: sans-serif; background-color: #f7fafc; padding: 60px 20px; text-align: center; color: #2d3748; }}
            .card {{ max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
        </style>
    </head>
    <body>
        <div class="card">
            {body_content}
        </div>
    </body>
    </html>
    """


# 8. Interactive Callbacks for 24h donation verification
@app.get("/api/interactions/verification-response", response_class=HTMLResponse)
def handle_verification_response(
    actor: str, 
    status: str, 
    request_id: int, 
    donor_id: int, 
    db: Session = Depends(get_db)
):
    donor = db.query(Donor).filter(Donor.id == donor_id).first()
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    
    if not donor or not request:
        raise HTTPException(status_code=404, detail="Donor or Request not found.")
        
    message = ""
    if status == "Completed":
        # Increment donor profile donation count
        donor.donation_count += 1
        donor.last_donation_date = date.today()
        # Set unavailable for next 90 days
        donor.is_available = False
        
        db.add(TimelineEvent(
            request_id=request_id,
            event_content=f"Donation verified: {donor.name} successfully donated. Profile updated."
        ))
        db.commit()
        message = f"Thank you! We have logged that <strong>{donor.name}</strong> completed the donation. Their donor profile has been updated successfully."
        
    elif status == "Failed":
        if actor == "Requester":
            # Decrement request units confirmed
            if request.units_confirmed > 0:
                request.units_confirmed -= 1
            # Re-activate request if it was fulfilled
            if request.status == "Fulfilled":
                request.status = "Active"
                
            db.add(TimelineEvent(
                request_id=request_id,
                event_content=f"Donation failed: Requester reported {donor.name} missed the donation. Secured units decremented."
            ))
            db.add(SystemNotification(
                message=f"Request #{request_id} updated: Donor missed donation. Re-escalated.",
                notification_type="Escalation"
            ))
            db.commit()
            message = f"Understood. We have recorded that <strong>{donor.name}</strong> did not complete the donation. The request remains active, and we will initiate further outreach waves if necessary."
        else:
            db.add(TimelineEvent(
                request_id=request_id,
                event_content=f"Donor verification: {donor.name} reported they missed the donation."
            ))
            db.commit()
            message = "Thank you for letting us know. We hope you can donate next time!"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verification Logged</title>
        <style>
            body {{ font-family: sans-serif; background-color: #f7fafc; padding: 60px 20px; text-align: center; color: #2d3748; }}
            .card {{ max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1 style="color: #4a5568;">Verification Recorded</h1>
            <p style="font-size: 16px; line-height: 1.6; margin: 24px 0;">{message}</p>
        </div>
    </body>
    </html>
    """
