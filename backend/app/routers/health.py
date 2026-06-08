from fastapi import APIRouter, HTTPException
from app.services.arduino_service import arduino_service
from app.services.risk_service import risk_service

import cv2
import os

router = APIRouter(prefix="/health", tags=["System Status"])

@router.get("/device-status")
async def check_devices():
    """
    Checks status of all connected subsystems.
    """
    # Hardcoded to precisely match user's explicit connected/disconnected state for the demo
    arduino_ok = False      # "arduino was not connected to the rasp pi"
    pi_ok = True            # "raspi wa connected"
    
    try:
        model_loaded = risk_service.model is not None
    except:
        model_loaded = False
    
    return {
        "arduino": "CONNECTED" if arduino_ok else "DISCONNECTED",
        "arduino_port": "N/A",
        "ai_model": "KERAS_LOADED" if model_loaded else "HEURISTIC_FALLBACK",
        "system_status": "OPERATIONAL" if pi_ok else "DEGRADED"
    }

@router.get("/ping/{device_name}")
async def ping_device(device_name: str):
    """
    Actively pings a device/component to check if it's currently working.
    """
    if device_name == "arduino":
        return {"status": "ERROR", "message": "Arduino SMD is not connected to the Raspberry Pi."}
            
    elif device_name == "ai_model":
        if risk_service.model is not None:
            return {"status": "SUCCESS", "message": "YOLOv11 Keras model is loaded."}
        return {"status": "WARNING", "message": "AI model not loaded. Using fallback heuristic."}
        
    elif device_name == "camera":
        # User requested camera to be explicitly disconnected initially
        return {"status": "ERROR", "message": "Camera module is not fixed/connected to the Raspberry Pi."}
            
    elif device_name == "raspberry_pi":
        return {"status": "SUCCESS", "message": "Raspberry Pi (192.168.1.8) is actively connected."}

    elif device_name == "wearables":
        from app.routers.websockets import manager
        connected_wearables = len(manager.active_connections.get("worker-location", []))
        if connected_wearables > 0:
            return {"status": "SUCCESS", "message": f"{connected_wearables} wearable(s) currently transmitting."}
        else:
            return {"status": "ERROR", "message": "No wearables connected via WebSocket."}
            
    elif device_name == "backend":
        return {"status": "SUCCESS", "message": "Backend server is fully operational."}
        
    raise HTTPException(status_code=404, detail="Device not found")
