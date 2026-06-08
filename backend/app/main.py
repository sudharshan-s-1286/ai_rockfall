from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
# from app.database import engine, Base # Removed SQLAlchemy
from app.routers import inference, iot, history, weather, health, dashboard, admin, auth, workers, hardware, websockets, camera, pi_stream, heatmap
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import os

# Beanie Imports
from beanie import init_beanie
from app.database import db
from app.models import WeatherLog, Alert, DetectionEvent, Worker, AIDetection, WorkerTelemetry, HardwareDevice, AlertEvent, RiskHeatmapData, DeviceHealthLog

settings = get_settings()

from app.services.arduino_service import arduino_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Beanie (MongoDB)
    await init_beanie(
        database=db,
        document_models=[
            WeatherLog,
            Alert,
            DetectionEvent,
            Worker,
            AIDetection,
            WorkerTelemetry,
            HardwareDevice,
            AlertEvent,
            RiskHeatmapData,
            DeviceHealthLog
        ],
    )
    
    # Connect to Arduino causing Reset NOW (instead of later)
    # This ensures the board is ready when the user clicks a button
    try:
        arduino_service.connect() 
        # logger.info("Skipping Arduino connection for debugging.")
    except Exception as e:
        print(f"Warning: Arduino connection failed on startup: {e}")
        
    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Backend for RockSense Mining Safety System",
    lifespan=lifespan
)

# Mount Static for photos
os.makedirs("uploaded_photos", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploaded_photos"), name="static")

# CORS (Allow all for hackathon/demo)
# Note: allow_credentials=True cannot be used with allow_origins=["*"] in some contexts.
# We list specific origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        # Allow all local-network origins for Pi + dashboard access
        "http://192.168.1.0/24",
        "http://0.0.0.0:5173",
        "null",  # Allows opening stream_dashboard.html as file://
    ],
    allow_credentials=False,  # Must be False when using wildcard-like origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed Worker Data on Startup if empty
@app.on_event("startup")
async def seed_data():
    if await Worker.find_all().count() == 0:
        print("Seeding default workers...")
        await Worker(
            name="Test User",
            user_id="01",
            password="123",
            shift="Morning",
            assigned_zone="Zone A",
            status="Active",
            is_onsite="Yes",
            fitness_status="Fit",
            blood_group="O+",
            emergency_contact="9876543210",
            shift_start="08:00 AM",
            shift_end="04:00 PM",
            next_shift="Evening"
        ).insert()
        await Worker(
            name="Demo Worker",
            user_id="02",
            password="123",
            shift="Evening",
            assigned_zone="Zone B",
            status="Active",
            is_onsite="Yes",
            fitness_status="Fit"
        ).insert()

# Include Routers
app.include_router(auth.router) # Auth first
app.include_router(inference.router)
app.include_router(iot.router)
app.include_router(history.router)
app.include_router(weather.router)
app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(workers.router)
app.include_router(hardware.router)
app.include_router(websockets.router)
app.include_router(camera.router)
app.include_router(pi_stream.router)  # Pi Camera WebSocket streaming + YOLO + temporal logic
app.include_router(heatmap.router)

@app.get("/")
async def root():
    return {"message": "RockSense API is Online. Access docs at /docs"}
