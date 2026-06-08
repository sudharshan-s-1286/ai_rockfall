import sys
import traceback
from app.config import get_settings
from ultralytics import YOLO
import os

print("CURRENT DIR:", os.getcwd())
settings = get_settings()
print("YOLO PATH:", settings.YOLO_PATH)
print("KERAS PATH:", settings.KERAS_MODEL_PATH)
print("EXISTS YOLO:", os.path.exists(settings.YOLO_PATH))
print("EXISTS KERAS:", os.path.exists(settings.KERAS_MODEL_PATH))

try:
    model = YOLO(settings.YOLO_PATH)
    print("YOLO LOADED SUCCESS")
except Exception as e:
    print("YOLO LOAD FAILED")
    traceback.print_exc()

from app.services.risk_service import risk_service
try:
    risk_service._load_resources()
    print("KERAS RISK SERVICE LOADED SUCCESS, MODEL:", "YES" if risk_service.model is not None else "NO")
except Exception as e:
    print("KERAS LOAD FAILED")
    traceback.print_exc()
