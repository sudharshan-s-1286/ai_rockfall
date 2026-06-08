
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from app.models import Worker, Alert
from app.schemas import WorkerResponse, WorkerUpdate, WorkerCreate, AlertResponse
from beanie import PydanticObjectId

router = APIRouter(prefix="/workers", tags=["Workers"])

# --- Worker Dashboard Endpoints ---

@router.get("/me", response_model=WorkerResponse)
async def get_current_worker_profile(user_id: str):
    """
    Get profile of the currently logged-in worker.
    In a real app, we'd get user_id from the JWT token.
    For this hackathon, we pass user_id as a query param or header.
    """
    worker = await Worker.find_one(Worker.user_id == user_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker

@router.get("/dashboard/alert", response_model=Optional[AlertResponse])
async def get_latest_finalized_alert():
    """
    Get the most recent finalized alert (active) for the dashboard.
    """
    # Fetch the latest alert sorted by creation time descending
    # Find all ACTIVE alerts, sort by created_at descending, then get first
    alert = await Alert.find_all(Alert.status == "ACTIVE").sort("-created_at").first_or_none()
    
    # Fetch the latest AI detection event
    # We need to import DetectionEvent inside function or at top to avoid circular deps if any
    from app.models import DetectionEvent
    detection = await DetectionEvent.find_all().sort("-timestamp").first_or_none()

    # If we have no data at all
    if not alert and not detection:
        return None

    # Compare to find the absolute latest
    latest_is_detection = False
    if detection and alert:
        if detection.timestamp > alert.created_at:
            latest_is_detection = True
    elif detection and not alert:
        latest_is_detection = True

    if latest_is_detection:
        # Convert DetectionEvent to AlertResponse format
        return AlertResponse(
            id=detection.id,
            alert_type="AI Detection",
            severity=detection.risk_level, # HIGH, MEDIUM, LOW
            source=detection.source,
            area_id=detection.camera_id or "Zone A (Camera)", # Placeholder if null
            message=f"Crack detected (Confidence: {detection.max_confidence:.2f})",
            status="ACTIVE",
            created_at=detection.timestamp
        )
    
    return alert

# --- Admin Management Endpoints ---

@router.get("/", response_model=List[WorkerResponse])
async def get_all_workers():
    """
    Admin: Get all workers.
    """
    return await Worker.find_all().to_list()

@router.get("/{id}", response_model=WorkerResponse)
async def get_worker_by_id(id: PydanticObjectId):
    """
    Admin: Get specific worker details.
    """
    worker = await Worker.get(id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker

@router.post("/", response_model=WorkerResponse)
async def create_worker(worker_in: WorkerCreate):
    """
    Admin: Create a new worker.
    """
    # Check if user_id exists
    existing = await Worker.find_one(Worker.user_id == worker_in.user_id)
    if existing:
        raise HTTPException(status_code=400, detail="Worker ID already exists")
    
    worker = Worker(**worker_in.dict())
    await worker.insert()
    return worker

@router.put("/{id}", response_model=WorkerResponse)
async def update_worker(id: PydanticObjectId, update_data: WorkerUpdate):
    """
    Admin: Update worker details (Health, Shift, etc.)
    """
    worker = await Worker.get(id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    if not update_dict:
        return worker
        
    await worker.update({"$set": update_dict})
    return worker

@router.delete("/{id}")
async def delete_worker(id: PydanticObjectId):
    """
    Admin: Delete a worker.
    """
    worker = await Worker.get(id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    await worker.delete()
    return {"status": "deleted"}
