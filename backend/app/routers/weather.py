from fastapi import APIRouter
from app.services.weather_service import weather_service

router = APIRouter(prefix="/weather", tags=["Weather Intelligence"])

@router.get("/current")
async def get_current_weather():
    """
    Returns current weather data, risk score, and safety status.
    """
    return await weather_service.get_current_weather()

@router.get("/forecast")
async def get_weather_forecast():
    """
    Returns 5-day weather forecast.
    """
    return await weather_service.get_forecast()

@router.get("/risk")
async def get_weather_risk():
    """
    Specific endpoint for just risk assessment (re-uses current weather logic).
    """
    data = await weather_service.get_current_weather()
    return {
        "risk_score": data.get("risk_score"),
        "status": data.get("status"),
        "recommendation": data.get("recommendation")
    }

@router.get("/decision")
async def get_weather_decision():
    data = await weather_service.get_current_weather()
    return {
        "temperature": data['temperature'],
        "condition": data['condition'],
        "wind_speed": data['wind_speed'],
        "rainfall": data['rainfall'],
        "risk_score": data['risk_score'],
        "risk_level": data['risk_level'],
        "decision": "SAFE" if data['risk_level'] == "LOW" else "UNSAFE", # Legacy frontend compat
        "status": data['status'],
        "recommendation": data['recommendation'],
        "reason": data['reason']
    }
