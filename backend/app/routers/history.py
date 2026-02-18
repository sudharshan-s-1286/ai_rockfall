from fastapi import APIRouter, Query
from app.models import DetectionEvent, WeatherLog, Alert
from datetime import datetime
from typing import Optional, List

router = APIRouter(prefix="/history", tags=["History"])

@router.get("/alerts")
async def get_alerts(
    severity: Optional[str] = None,
    limit: int = 50
):
    query = Alert.find_all().sort("-created_at").limit(limit)
    
    if severity:
        query = Alert.find(Alert.severity == severity.upper()).sort("-created_at").limit(limit)
        
    return await query.to_list()

@router.get("/weather")
async def get_weather_history(limit: int = 50):
    return await WeatherLog.find_all().sort("-timestamp").limit(limit).to_list()

@router.get("/cracks")
async def get_crack_history(limit: int = 50):
    return await DetectionEvent.find_all().sort("-timestamp").limit(limit).to_list()

@router.get("/today")
async def get_today_history():
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Weather
    weather_res = await WeatherLog.find(WeatherLog.timestamp >= today_start).sort("-timestamp").to_list()
    
    # Alerts
    alerts_res = await Alert.find(Alert.created_at >= today_start).sort("-created_at").to_list()
    
    # Cracks
    cracks_res = await DetectionEvent.find(DetectionEvent.timestamp >= today_start).sort("-timestamp").to_list()
    
    return {
        "weather": weather_res,
        "alerts": alerts_res,
        "cracks": cracks_res
    }

@router.get("/all")
async def get_all_history(limit: int = 50):
    # Fetch from all collections
    weather = await WeatherLog.find_all().sort("-timestamp").limit(limit).to_list()
    alerts = await Alert.find_all().sort("-created_at").limit(limit).to_list()
    cracks = await DetectionEvent.find_all().sort("-timestamp").limit(limit).to_list()
    
    # Normalize and merge
    combined = []
    
    for w in weather:
        combined.append({
            "id": str(w.id),
            "timestamp": w.timestamp,
            "type": "WEATHER",
            "risk_level": w.risk_level,
            "details": f"{w.condition}, {w.rainfall}mm rain",
            "source": "Weather API"
        })
        
    for a in alerts:
        combined.append({
            "id": str(a.id),
            "timestamp": a.created_at,
            "type": "ALERT",
            "risk_level": "HIGH" if a.severity == "CRITICAL" else "MEDIUM", 
            "details": a.message,
            "source": a.source
        })
        
    for c in cracks:
        combined.append({
            "id": str(c.id),
            "timestamp": c.timestamp,
            "type": "DETECTION",
            "risk_level": c.risk_level,
            "details": f"{c.crack_count} cracks detected ({c.max_confidence*100:.1f}%)",
            "source": c.source or "Camera"
        })
    
    # Sort by timestamp descending
    combined.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return combined[:limit]
