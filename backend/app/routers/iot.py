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
