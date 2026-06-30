from datetime import datetime, date
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# --- Karachi Centroids for Proximity Matching ---
KARACHI_CENTROIDS: Dict[str, Dict[str, float]] = {
    "indus hospital": {"lat": 24.8458, "lon": 67.1265},
    "korangi": {"lat": 24.8415, "lon": 67.1472},
    "gulshan-e-iqbal": {"lat": 24.9180, "lon": 67.0971},
    "clifton": {"lat": 24.8138, "lon": 67.0336},
    "saddar": {"lat": 24.8605, "lon": 67.0261},
    "north nazimabad": {"lat": 24.9372, "lon": 67.0422},
    "dha": {"lat": 24.8080, "lon": 67.0620},
    "liaquatabad": {"lat": 24.9101, "lon": 67.0396},
    "federal b area": {"lat": 24.9312, "lon": 67.0792},
    "malir": {"lat": 24.8983, "lon": 67.1908},
    "gulistan-e-johar": {"lat": 24.9123, "lon": 67.1246},
    "jinnah hospital": {"lat": 24.8519, "lon": 67.0478},
    "civil hospital": {"lat": 24.8576, "lon": 67.0101},
    "aga khan hospital": {"lat": 24.8922, "lon": 67.0747},
    "liaquat national hospital": {"lat": 24.8943, "lon": 67.0772},
}

def get_coordinates_for_location(location_str: str) -> Dict[str, float]:
    """Resolves coordinates for location names, matching common Karachi areas."""
    loc_clean = location_str.strip().lower()
    for key, coords in KARACHI_CENTROIDS.items():
        if key in loc_clean:
            return coords
    # Default to Karachi city center
    return {"lat": 24.8607, "lon": 67.0011}


# --- SQLAlchemy DB Tables ---

class Donor(Base):
    __tablename__ = 'donors'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    blood_group = Column(String, nullable=False)  # O-, A+, etc.
    location = Column(String, nullable=False)  # e.g., "Gulshan-e-Iqbal"
    latitude = Column(Float, nullable=False, default=24.8607)
    longitude = Column(Float, nullable=False, default=67.0011)
    is_available = Column(Boolean, nullable=False, default=True)
    last_donation_date = Column(Date, nullable=True)
    donation_count = Column(Integer, nullable=False, default=0)


class BloodRequest(Base):
    __tablename__ = 'blood_requests'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, nullable=False)
    requester_email = Column(String, nullable=False)
    hospital = Column(String, nullable=False)
    blood_group = Column(String, nullable=False)
    units_required = Column(Integer, nullable=False)
    units_confirmed = Column(Integer, nullable=False, default=0)
    urgency = Column(String, nullable=False)  # Critical, High, Medium, Low
    status = Column(String, nullable=False, default="Active")  # Active, Fulfilled, Canceled
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    waves = relationship("OutreachWave", back_populates="request", cascade="all, delete-orphan")
    timeline = relationship("TimelineEvent", back_populates="request", cascade="all, delete-orphan")


class OutreachWave(Base):
    __tablename__ = 'outreach_waves'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey('blood_requests.id'), nullable=False)
    wave_number = Column(Integer, nullable=False)
    launched_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    status = Column(String, nullable=False, default="Pending")  # Pending, Completed
    
    # Relationships
    request = relationship("BloodRequest", back_populates="waves")
    outreaches = relationship("DonorOutreach", back_populates="wave", cascade="all, delete-orphan")


class DonorOutreach(Base):
    __tablename__ = 'donor_outreaches'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    wave_id = Column(Integer, ForeignKey('outreach_waves.id'), nullable=False)
    donor_id = Column(Integer, ForeignKey('donors.id'), nullable=False)
    status = Column(String, nullable=False, default="Pending")  # Pending, Accepted, Declined, No Response
    responded_at = Column(DateTime, nullable=True)
    
    # Relationships
    wave = relationship("OutreachWave", back_populates="outreaches")
    donor = relationship("Donor")


class TimelineEvent(Base):
    __tablename__ = 'timeline_events'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey('blood_requests.id'), nullable=False)
    event_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    event_content = Column(String, nullable=False)
    
    # Relationships
    request = relationship("BloodRequest", back_populates="timeline")


class SystemSettings(Base):
    __tablename__ = 'system_settings'
    
    id = Column(Integer, primary_key=True, default=1)
    wave_multiplier = Column(Integer, nullable=False, default=3)
    max_waves = Column(Integer, nullable=False, default=3)
    follow_up_delay = Column(Integer, nullable=False, default=60)  # minutes
    response_timeout = Column(Integer, nullable=False, default=30)  # minutes
    emergency_threshold = Column(Integer, nullable=False, default=2)  # hours
    preferred_channels = Column(String, nullable=False, default="Email,WhatsApp")


class AILog(Base):
    __tablename__ = 'ai_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_name = Column(String, nullable=False)
    action_taken = Column(String, nullable=False)
    request_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)


class SystemNotification(Base):
    __tablename__ = 'system_notifications'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    message = Column(String, nullable=False)
    notification_type = Column(String, nullable=False)  # Wave Launch, Accept, Complete, Reject, Escalation
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_read = Column(Boolean, nullable=False, default=False)


# --- Pydantic Models for API / Serializers ---

class DonorBase(BaseModel):
    name: str
    email: str
    phone: str
    blood_group: str
    location: str
    is_available: bool = True

class DonorCreate(DonorBase):
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DonorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    location: Optional[str] = None
    is_available: Optional[bool] = None
    last_donation_date: Optional[date] = None
    donation_count: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DonorResponse(DonorBase):
    id: int
    latitude: float
    longitude: float
    donation_count: int
    last_donation_date: Optional[date] = None

    class Config:
        from_attributes = True


class BloodRequestBase(BaseModel):
    patient_id: str
    hospital: str
    blood_group: str
    units_required: int
    urgency: str

class BloodRequestCreate(BloodRequestBase):
    pass

class BloodRequestResponse(BloodRequestBase):
    id: int
    units_confirmed: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TimelineEventResponse(BaseModel):
    id: int
    request_id: int
    event_time: datetime
    event_content: str

    class Config:
        from_attributes = True


class RequestDetailResponse(BaseModel):
    request: BloodRequestResponse
    timeline: List[TimelineEventResponse]
    progress_percentage: float
    live_donor_status: Dict[str, int]  # e.g., {"Accepted": 2, "Pending": 1, ...}
    waves: List[Dict]

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    wave_multiplier: Optional[int] = None
    max_waves: Optional[int] = None
    follow_up_delay: Optional[int] = None
    response_timeout: Optional[int] = None
    emergency_threshold: Optional[int] = None
    preferred_channels: Optional[str] = None


class NotificationResponse(BaseModel):
    id: int
    message: str
    notification_type: str
    timestamp: datetime
    is_read: bool

    class Config:
        from_attributes = True


class AILogResponse(BaseModel):
    id: int
    agent_name: str
    action_taken: str
    request_id: Optional[int]
    timestamp: datetime

    class Config:
        from_attributes = True


class ChatMessageRequest(BaseModel):
    message: str
    sessionId: str | None = Field(default=None, alias="sessionId")
    email: str  # to enable follow-ups and send tracking link
