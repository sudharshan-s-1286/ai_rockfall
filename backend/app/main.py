from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
# from app.database import engine, Base # Removed SQLAlchemy
from app.routers import inference, iot, history, weather, health, dashboard, admin, auth
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import os

# Beanie Imports
from beanie import init_beanie
from app.database import db
from app.models import WeatherLog, Alert, DetectionEvent, Worker

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
            Worker
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router) # Auth first
app.include_router(inference.router)
app.include_router(iot.router)
app.include_router(history.router)
app.include_router(weather.router)
app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {"message": "RockSense API is Online. Access docs at /docs"}
