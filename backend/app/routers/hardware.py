from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas import MonitoringDataIn, WorkerTelemetryIn, MineAlertIn
from app.models import AIDetection, WorkerTelemetry, HardwareDevice, AlertEvent, RiskHeatmapData, Worker
from app.routers.websockets import manager
from app.services.arduino_service import arduino_service
import json
import asyncio
from typing import List, Dict

router = APIRouter(prefix="/api/hardware", tags=["Hardware API"])

# In-memory storage for 15s stable detection logic
recent_detections: Dict[str, List[dict]] = {}

async def evaluate_stable_crack(device_id: str):
    """
    Evaluates detections for a device over the last 15 seconds to determine
    if a stable crack should be reported.
    """
    await asyncio.sleep(15) # 15-second tracking window
    
    if device_id not in recent_detections or len(recent_detections[device_id]) == 0:
        return
        
    detections = recent_detections[device_id]
    
    # Example logic: if a crack was consistently detected (e.g. > 3 times in 15s window with high risk)
    high_risk_count = sum(1 for d in detections if d['risk_level'] == 'HIGH')
    
    if high_risk_count >= 3: 
        # Create final stable result
        stable_result = AIDetection(
            device_id=device_id,
            risk_level="HIGH",
            confidence=max(d['confidence'] for d in detections),
            crack_coordinates=detections[-1]['crack_coordinates'],
            is_stable=True
        )
        await stable_result.insert()
        
        # Broadcast stable detection via WebSockets
        payload = stable_result.model_dump(mode="json")
            
        await manager.broadcast(json.dumps(payload), "ai-detections")
        
        # Update Risk Heatmap Data
        heatmap_entry = RiskHeatmapData(
            zone=f"Zone_near_{device_id}",
            risk_level="HIGH",
            coordinates=stable_result.crack_coordinates
        )
        await heatmap_entry.insert()
        
    # Clear memory window for next analysis block
    recent_detections[device_id].clear()

@router.post("/monitoring-data")
async def receive_monitoring_data(data: MonitoringDataIn, background_tasks: BackgroundTasks):
    # Store raw (unstable) detection for logging purposes if needed
    doc = AIDetection(
        device_id=data.device_id,
        risk_level=data.risk_level,
        confidence=data.confidence,
        crack_coordinates=data.crack_coordinates,
        is_stable=False
    )
    await doc.insert()
    
    # Append to recent_detections tracking for 15s window
    if data.device_id not in recent_detections or len(recent_detections[data.device_id]) == 0:
        recent_detections[data.device_id] = []
        # Start a 15-second evaluation task
        background_tasks.add_task(evaluate_stable_crack, data.device_id)
        
    recent_detections[data.device_id].append({
        "risk_level": data.risk_level,
        "confidence": data.confidence,
        "crack_coordinates": data.crack_coordinates
    })
    
    # Also forward raw data over websocket for the live monitoring feed (so it shows immediately, though unstable)
    payload = doc.model_dump(mode="json")
    await manager.broadcast(json.dumps(payload), "ai-detections")
    
    return {"status": "success", "message": "Monitoring data received."}

async def is_in_high_risk_zone(lat: float, lon: float) -> bool:
    """
    Checks if coordinates are near any HIGH risk heatmap entries.
    Using a simplistic bounding box coordinate check for demonstration.
    """
    # Fetch recent heatmap data
    high_risk_zones = await RiskHeatmapData.find(RiskHeatmapData.risk_level == "HIGH").to_list()
    for zone in high_risk_zones:
        if len(zone.coordinates) >= 2:
            z_lat, z_lon = zone.coordinates[0], zone.coordinates[1]
            # Simple distance coordinate check
            if abs(lat - z_lat) < 0.005 and abs(lon - z_lon) < 0.005: 
                return True
    return False

@router.post("/worker-telemetry")
async def receive_worker_telemetry(data: WorkerTelemetryIn):
    doc = WorkerTelemetry(
        worker_id=data.worker_id,
        latitude=data.latitude,
        longitude=data.longitude,
        battery=data.battery,
        status=data.status
    )
    await doc.insert()
    
    # Broadcast to worker-location
    payload = doc.model_dump(mode="json")
    await manager.broadcast(json.dumps(payload), "worker-location")
    
    # Check if worker is inside high-risk heatmap zone
    if await is_in_high_risk_zone(data.latitude, data.longitude):
        # Trigger an alert for the worker
        alert = AlertEvent(
            command="ALERT",
            zone=f"Worker {data.worker_id} Vicinity",
            risk_level="HIGH"
        )
        await alert.insert()
        
        alert_payload = alert.model_dump(mode="json")
            
        await manager.broadcast(json.dumps(alert_payload), "alerts")
        return {"status": "alert", "command": "ALERT"}
        
    return {"status": "success"}

@router.post("/mine-alert")
async def trigger_mine_alert(data: MineAlertIn):
    # API for external Area Warning System triggering
    doc = AlertEvent(
        command=data.command,
        zone=data.zone,
        risk_level=data.risk_level,
        status="ACTIVE" if data.command == "ALERT" else "STOP"
    )
    await doc.insert()
    
    # 2. Trigger Hardware (if command matches)
    if data.command == "ALERT":
        await arduino_service.start_alarm()
    elif data.command == "STOP":
        await arduino_service.stop_alarm()

    return {"status": "success", "message": f"Mine alert command '{data.command}' registered and sent to hardware."}
