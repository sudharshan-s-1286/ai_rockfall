from typing import Optional, List
from beanie import Document
from datetime import datetime
from pydantic import Field

from enum import Enum

class RiskLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class WeatherLog(Document):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    temperature: float
    rainfall: float = 0.0
    humidity: float = 0.0
    wind_speed: float = 0.0
    risk_score: float = 0.0
    risk_level: str # LOW / MEDIUM / HIGH
    condition: str
    recommendation: str # Message to user
    is_safe: str # "SAFE" / "UNSAFE" / "MONITOR" - keeping for compatibility

    class Settings:
        name = "weather_history" # Updated collection name
        indexes = [
            "timestamp",
            "risk_level"
        ]

class Alert(Document):
    alert_type: str # CRACK / WEATHER / DEVICE
    severity: str # LOW / MEDIUM / HIGH
    source: str
    area_id: Optional[str] = None
    message: str
    status: str = "ACTIVE" # ACTIVE / RESOLVED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

    class Settings:
        name = "weather_alerts" # Updated collection name
        indexes = [
            "severity",
            "created_at",
            "area_id"
        ]

class DetectionEvent(Document):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str # "camera" or "upload"
    camera_id: Optional[str] = None
    
    # AI Results
    crack_count: int = 0
    max_confidence: float = 0.0
    risk_level: str # HIGH, MEDIUM, LOW
    bbox_data: Optional[str] = None # JSON string or can be dict with Beanie
    
    # Metadata
    image_path: Optional[str] = None
    notes: Optional[str] = None

    class Settings:
        name = "detection_events"
        indexes = [
            "timestamp",
            "risk_level"
        ]

class Worker(Document):
    name: str
    user_id: str
    password: Optional[str] = None # Optional to prevent crashes on existing data
    shift: str
    photo_url: Optional[str] = None
    assigned_zone: str
    status: str = "Active"
    is_onsite: str = "No"

    class Settings:
        name = "workers"
        indexes = [
            "user_id",
            "name"
        ]
