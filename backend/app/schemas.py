from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from beanie import PydanticObjectId

# Weather Schemas
class WeatherBase(BaseModel):
    temperature: float
    rainfall: float
    humidity: float
    wind_speed: float
    risk_score: float
    condition: str
    is_safe: str

class WeatherCreate(WeatherBase):
    pass

class WeatherResponse(WeatherBase):
    id: PydanticObjectId
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Alert Schemas
class AlertBase(BaseModel):
    alert_type: str
    severity: str
    source: str
    area_id: Optional[str] = None
    message: str
    status: str = "ACTIVE"

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: PydanticObjectId
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Crack/Detection Schemas
class DetectionEventBase(BaseModel):
    source: str
    camera_id: Optional[str] = None
    crack_count: int
    max_confidence: float
    risk_level: str
    bbox_data: Optional[str] = None
    image_path: Optional[str] = None
    notes: Optional[str] = None

class DetectionEventResponse(DetectionEventBase):
    id: PydanticObjectId
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Worker Schemas
class WorkerBase(BaseModel):
    name: str
    user_id: str
    shift: str
    assigned_zone: str
    status: str = "Active"
    is_onsite: str = "No"
    
    # Health & Shift Extras
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_condition: Optional[str] = "None"
    fitness_status: str = "Fit"
    next_shift: Optional[str] = None

class WorkerCreate(WorkerBase):
    password: str

class WorkerUpdate(BaseModel):
    shift: Optional[str] = None
    status: Optional[str] = None
    assigned_zone: Optional[str] = None
    is_onsite: Optional[str] = None
    
    # Health Updates
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_condition: Optional[str] = None
    fitness_status: Optional[str] = None
    fitness_status: Optional[str] = None
    next_shift: Optional[str] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None

class WorkerResponse(WorkerBase):
    id: PydanticObjectId
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    photo_url: Optional[str] = None
    last_health_update: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ShiftUpdatePayload(BaseModel):
    worker_ids: List[str]  # MongoDB IDs are strings
    new_shift: str

# Hardware IoT Schemas
class MonitoringDataIn(BaseModel):
    device_id: str
    risk_level: str
    confidence: float
    crack_coordinates: List[float]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WorkerTelemetryIn(BaseModel):
    worker_id: str
    latitude: float
    longitude: float
    battery: int
    status: str

class MineAlertIn(BaseModel):
    command: str
    zone: str
    risk_level: str
