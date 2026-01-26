from fastapi import APIRouter
from app.services.weather_service import weather_service

router = APIRouter(prefix="/weather", tags=["Weather Intelligence"])

@router.get("/decision")
async def get_mining_decision():
    """
    Returns SAFE/UNSAFE decision based on live weather data.
    """
    return await weather_service.get_mining_decision()
