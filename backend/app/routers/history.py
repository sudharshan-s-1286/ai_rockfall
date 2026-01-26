from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import DetectionEvent

router = APIRouter(prefix="/history", tags=["History"])

@router.get("/")
async def get_history(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DetectionEvent).order_by(DetectionEvent.timestamp.desc()).limit(limit))
    events = result.scalars().all()
    return events

@router.get("/{risk_level}")
async def get_history_by_risk(risk_level: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DetectionEvent)
        .where(DetectionEvent.risk_level == risk_level.upper())
        .order_by(DetectionEvent.timestamp.desc())
        .limit(50)
    )
    events = result.scalars().all()
    return events
