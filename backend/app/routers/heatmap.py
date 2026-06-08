from fastapi import APIRouter
from typing import List, Dict
import random
from app.models import RiskHeatmapData

router = APIRouter(prefix="/heatmap", tags=["Heatmap"])

# Base coordinates (Centered logically)
BASE_LAT = 12.9915
BASE_LNG = 80.2337

@router.get("")
async def get_heatmap_data():
    """
    Returns real-time heatmap data based on worker location and risk data.
    If database has data, it uses it. Otherwise, returns simulated data for the demo.
    """
    db_data = await RiskHeatmapData.find_all().to_list()
    
    if db_data:
        # Convert DB data to the requested format
        results = []
        for item in db_data:
            if len(item.coordinates) >= 2:
                results.append({
                    "lat": item.coordinates[0],
                    "lng": item.coordinates[1],
                    "risk": item.risk_level
                })
        return results

    # --- Simulated Data for Schematic Mine (Clustered Rings) ---
    simulated_results = []
    CENTER_X = 500
    CENTER_Y = 500
    
    # Red Clumps (HIGH)
    for i in range(25):
        simulated_results.append({
            "lat": CENTER_Y + 50 + random.uniform(-60, 60),
            "lng": CENTER_X + 50 + random.uniform(-60, 60),
            "risk": "HIGH"
        })
        
    # Yellow Clumps (MEDIUM)
    for i in range(40):
        simulated_results.append({
            "lat": CENTER_Y - 150 + random.uniform(-100, 100),
            "lng": CENTER_X - 150 + random.uniform(-100, 100),
            "risk": "MEDIUM"
        })

    # Green Spread (LOW)
    for i in range(80):
        simulated_results.append({
            "lat": random.uniform(100, 900),
            "lng": random.uniform(100, 900),
            "risk": "LOW"
        })

    return simulated_results
