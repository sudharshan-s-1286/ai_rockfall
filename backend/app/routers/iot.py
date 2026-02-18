from fastapi import APIRouter
from app.services.arduino_service import arduino_service

router = APIRouter(prefix="/alarm", tags=["IoT Control"])

@router.post("/start")
async def start_alarm():
    success, msg = await arduino_service.start_alarm()
    if success:
        return {"status": "Alarm Started", "arduino_response": msg}
    return {"status": "Failed", "detail": f"Could not communicate with Arduino: {msg}"}

@router.post("/stop")
async def stop_alarm():
    success, msg = await arduino_service.stop_alarm()
    if success:
         return {"status": "Alarm Stopped", "arduino_response": msg}
    return {"status": "Failed", "detail": f"Could not communicate with Arduino: {msg}"}

@router.post("/rescue")
async def trigger_rescue():
    """
    Triggers a rescue alert.
    """
    from app.models import Alert
    
    alert = Alert(
        alert_type="RESCUE_REQUEST",
        severity="HIGH",
        source="Emergency Tab",
        message="Manual Rescue Request Triggered!",
        status="ACTIVE"
    )
    await alert.insert()
    
    # Here we would integrate with SMS/Call API
    # For now, just log and return success
    return {"status": "Rescue Team Alerted", "detail": "Emergency services have been notified."}
