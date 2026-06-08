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

    # Health Details
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_condition: Optional[str] = "None"
    fitness_status: str = "Fit" # Fit, Unfit, Review
    last_health_update: datetime = Field(default_factory=datetime.utcnow)

    # Shift Management
    next_shift: Optional[str] = None # Morning, Evening, Night
    shift_start: Optional[str] = None # e.g. "08:00 AM"
    shift_end: Optional[str] = None # e.g. "04:00 PM"

    class Settings:
        name = "workers"
        indexes = [
            "user_id",
            "name"
        ]

class AIDetection(Document):
    device_id: str
    risk_level: str
    confidence: float
    crack_coordinates: List[float] # [x, y]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_stable: bool = False

    class Settings:
        name = "ai_detections"
        indexes = ["device_id", "timestamp"]

class WorkerTelemetry(Document):
    worker_id: str
    latitude: float
    longitude: float
    battery: int
    status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "worker_telemetry"
        indexes = ["worker_id", "timestamp"]

class HardwareDevice(Document):
    device_id: str
    device_type: str # Monitoring, Wearable, Alert
    status: str
    battery_level: Optional[int] = None
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "hardware_devices"

class AlertEvent(Document):
    command: str
    zone: str
    risk_level: str
    status: str = "ACTIVE" # ACTIVE or STOP
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "alert_events"

class RiskHeatmapData(Document):
    zone: str
    risk_level: str
    coordinates: List[float]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "risk_heatmap_data"

class DeviceHealthLog(Document):
    device_id: str
    status: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "device_health_logs"
