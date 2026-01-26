from fastapi import APIRouter
from app.services.arduino_service import arduino_service
from app.services.risk_service import risk_service

router = APIRouter(prefix="/health", tags=["System Status"])

@router.get("/device-status")
async def check_devices():
    """
    Checks status of all connected subsystems.
    """
    arduino_ok = arduino_service.check_health()
    model_loaded = risk_service.model is not None
    
    return {
        "arduino": "CONNECTED" if arduino_ok else "DISCONNECTED",
        "ai_model": "KERAS_LOADED" if model_loaded else "HEURISTIC_FALLBACK",
        "system_status": "OPERATIONAL" if (arduino_ok) else "DEGRADED"
    }
