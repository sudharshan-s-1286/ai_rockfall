import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "RockSense API"
    DEBUG: bool = True
    API_PREFIX: str = "/api"
    
    # AI / Inference
    YOLO_API_KEY: str = "3d355909b94c5565ef33da097b9cb714e125267c6b"
    YOLO_MODEL_URL: str = "https://hub.ultralytics.com/models/HOtChEKhLM1OlprA5Uf9"
    YOLO_PREDICT_URL: str = "https://predict.ultralytics.com"
    
    # Keras Model
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    RESOURCE_ROOT: str = r"C:\Users\Dharanidharan\OneDrive - sece.ac.in\Documents\CSBS 2ND YEAR\SEMESTER 3\HACKATON\Pals_Hack\Rocksense\raspberrypi_rocksence"
    KERAS_MODEL_PATH: str = os.path.join(RESOURCE_ROOT, "Model_keras", "keras_model.h5")
    LABELS_PATH: str = os.path.join(RESOURCE_ROOT, "Model_keras", "labels.txt")
    YOLO_PATH: str = os.path.join(RESOURCE_ROOT, "Yolo11.pt")
    
    # IoT
    ARDUINO_PORT: str = "COM8"  # Primary
    ARDUINO_PORTS: list = ["COM8", "COM5", "COM6", "COM4", "COM7"]
    ARDUINO_BAUDRATE: int = 9600
    
    # Weather
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "dfef4025d24830c239bc0e5c005c085e")
    WEATHER_LAT: float = 12.9716 # Example: Bangalore, mining site location
    WEATHER_LON: float = 77.5946
    WEATHER_HISTORY_COLLECTION: str = "weather_history"
    WEATHER_ALERTS_COLLECTION: str = "weather_alerts"
    
    # Database
    MONGODB_URI: str = "mongodb+srv://admin:admin@cluster0.45t37tr.mongodb.net/?appName=Cluster0"
    MONGODB_DB_NAME: str = "rocksense_db"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
