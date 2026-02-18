from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

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
    id: str  # MongoDB ObjectId is a string
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
    id: str  # MongoDB ObjectId is a string
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
    id: str  # MongoDB ObjectId is a string
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

class WorkerCreate(WorkerBase):
    pass

class WorkerUpdate(BaseModel):
    shift: Optional[str] = None
    status: Optional[str] = None
    assigned_zone: Optional[str] = None
    is_onsite: Optional[str] = None

class WorkerResponse(WorkerBase):
    id: str  # MongoDB ObjectId is a string
    photo_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class ShiftUpdatePayload(BaseModel):
    worker_ids: List[str]  # MongoDB IDs are strings
    new_shift: str
