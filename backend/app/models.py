from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from app.database import Base
from datetime import datetime
import enum

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source = Column(String) # "camera" or "upload"
    camera_id = Column(String, nullable=True)
    
    # AI Results
    crack_count = Column(Integer, default=0)
    max_confidence = Column(Float, default=0.0)
    risk_level = Column(String) # Storing as string to correspond to RiskLevel or raw string
    
    # Metadata
    image_path = Column(String, nullable=True) # Could store path if we saved images
    notes = Column(String, nullable=True)

class AlarmLog(Base):
    __tablename__ = "alarm_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String) # "START" or "STOP"
    status = Column(String) # "SUCCESS", "FAILED"
    details = Column(String, nullable=True)

class WeatherLog(Base):
    __tablename__ = "weather_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    condition = Column(String)
    temperature = Column(Float)
    is_safe = Column(String) # "SAFE" / "UNSAFE"

class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    user_id = Column(String, unique=True, index=True) # E.g. "WKR-001"
    password = Column(String) # Hashed password
    shift = Column(String) # "Morning", "Evening", "Night"
    photo_url = Column(String, nullable=True)
    assigned_zone = Column(String) # "Zone A", "Sector 4"
    status = Column(String, default="Active") # "Active", "Inactive"
    is_onsite = Column(String, default="No") # "Yes", "No" - Simplifies frontend logic

