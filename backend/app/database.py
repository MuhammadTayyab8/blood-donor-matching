import os
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.models import Base, Donor, SystemSettings, BloodRequest, OutreachWave, DonorOutreach, TimelineEvent, SystemNotification, AILog, get_coordinates_for_location

# Load database URL from environment or fallback to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./blood_donation.db")

# For SQLite, we need to allow access from multiple threads
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # NeonDB / PostgreSQL connection
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:

        settings = db.query(SystemSettings).first()

        if not settings:

            settings = SystemSettings(
                wave_multiplier=3,
                max_waves=3,
                follow_up_delay=60,
                response_timeout=30,
                emergency_threshold=2,
                preferred_channels="Email,WhatsApp"
            )

            db.add(settings)
            db.commit()

    finally:
        db.close()






def reset_database():

    db = SessionLocal()

    try:

        tables = [
            DonorOutreach,
            OutreachWave,
            TimelineEvent,
            SystemNotification,
            AILog,
            BloodRequest,
            Donor,
            SystemSettings
        ]

        for table in tables:
            db.query(table).delete()

        db.commit()

        print("Database cleared")

    except Exception as e:
        db.rollback()
        print(e)

    finally:
        db.close()