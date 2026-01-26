from fastapi import APIRouter
import random

router = APIRouter(prefix="/dashboard", tags=["3D Dashboard"])

@router.get("/zones")
async def get_mine_zones():
    """
    Mock data for 3D visualization of mine zones.
    """
    zones = []
    for i in range(1, 6):
        risk = random.choice(["LOW", "MEDIUM", "HIGH"])
        zones.append({
            "zone_id": f"Z-{i:02d}",
            "location": {"x": i*10, "y": 0, "z": 0},
            "risk_level": risk,
            "status": "ACTIVE" if risk != "HIGH" else "EVACUATED"
        })
    return zones

@router.get("/workers")
async def get_workers():
    return [
        {"id": "W01", "name": "John Doe", "status": "active", "zone": "Z-01"},
        {"id": "W02", "name": "Jane Smith", "status": "off-site", "zone": None},
        {"id": "W03", "name": "Bob Alert", "status": "active", "zone": "Z-03"}
    ]
