import os
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
    KERAS_MODEL_PATH: str = r"C:\Users\sukir\OneDrive - sece.ac.in\Documents\CSBS 2ND YEAR\SEMESTER 3\HACKATON\Pals_Hack\Rocksense\Model_keras\keras_model.h5"
    LABELS_PATH: str = r"C:\Users\sukir\OneDrive - sece.ac.in\Documents\CSBS 2ND YEAR\SEMESTER 3\HACKATON\Pals_Hack\Rocksense\Model_keras\labels.txt"
    
    # IoT
    ARDUINO_PORT: str = "COM7"  # Default, can be overridden by env var
    ARDUINO_BAUDRATE: int = 9600
    
    # Weather
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "dfef4025d24830c239bc0e5c005c085e")
    WEATHER_LAT: float = 12.9716 # Example: Bangalore, mining site location
    WEATHER_LON: float = 77.5946
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./rocksense.db"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
