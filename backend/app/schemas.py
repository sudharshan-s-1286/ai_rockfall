from pydantic import BaseModel
from typing import Optional, List

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
    id: int
    photo_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class ShiftUpdatePayload(BaseModel):
    worker_ids: List[int]
    new_shift: str
