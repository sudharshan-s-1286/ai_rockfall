from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.database import get_db
from app import models, schemas
import hashlib
import os
import shutil
import uuid

router = APIRouter(prefix="/admin", tags=["Admin"])

UPLOAD_DIR = "uploaded_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/users/create", response_model=schemas.WorkerResponse)
async def create_worker(
    name: str = Form(...),
    user_id: str = Form(...),
    password: str = Form(...), # New field
    shift: str = Form(...),
    assigned_zone: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    # Check ID uniqueness
    result = await db.execute(select(models.Worker).where(models.Worker.user_id == user_id))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Worker ID already exists")

    photo_url = None
    if photo:
        file_ext = photo.filename.split(".")[-1]
        file_name = f"{user_id}_{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
            
        photo_url = f"/static/{file_name}"

    # Hash Password
    hashed_password = hashlib.sha256(password.encode()).hexdigest()

    new_worker = models.Worker(
        name=name,
        user_id=user_id,
        password=hashed_password,
        shift=shift,
        assigned_zone=assigned_zone,
        photo_url=photo_url,
        status="Active",
        is_onsite="Yes" if shift == "Morning" else "No" # Default logic, to be refined if needed
    )
    
    db.add(new_worker)
    await db.commit()
    await db.refresh(new_worker)
    return new_worker

@router.get("/users", response_model=List[schemas.WorkerResponse])
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Worker))
    return result.scalars().all()

@router.put("/users/update-shift")
async def update_shift(payload: schemas.ShiftUpdatePayload, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Worker).where(models.Worker.id.in_(payload.worker_ids)))
    workers = result.scalars().all()
    
    for worker in workers:
        worker.shift = payload.new_shift
        # Set to Active/Onsite if shift is updated, assuming immediate activation
        worker.status = "Active"
        worker.is_onsite = "Yes" 
    
    await db.commit()
    return {"message": "Shift updated successfully"}

@router.get("/users/3d-map-data")
async def get_map_data(db: AsyncSession = Depends(get_db)):
    # Return data formatted for the 3D map
    # Only return workers who are On-site (or all, and frontend filters? Requirement says 'Worker becomes visible')
    result = await db.execute(select(models.Worker).where(models.Worker.is_onsite == "Yes"))
    workers = result.scalars().all()
    
    data = []
    for w in workers:
        data.append({
            "id": w.id,
            "name": w.name,
            "zone": w.assigned_zone,
            "status": w.status,
            "photo_url": w.photo_url,
            "shift": w.shift
        })
    return data
