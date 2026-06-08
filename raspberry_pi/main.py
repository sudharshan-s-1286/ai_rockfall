# main.py
import time
from camera_stream import CameraStream
from websocket_client import WebSocketClient
from rf_model import RiskModel
from arduino_serial import ArduinoSerial

# CONFIGURATION
LAPTOP_IP = "192.168.1.5" # REPLACE WITH YOUR LAPTOP IP
SERVER_URL = f"http://{LAPTOP_IP}:8000"

# Initialize Modules
camera = CameraStream()
ws = WebSocketClient(SERVER_URL)
rf = RiskModel()
arduino = ArduinoSerial(port='/dev/ttyUSB0') # Adjust port if needed

def process_logic(data):
    """
    Main Decision Logic:
    1. YOLO Result -> RF Classifier
    2. RF Classifier -> Arduino Trigger
    """
    status = data.get("status")
    
    if status == "HIGH_CRACK":
        # Run Random Forest Logic on Pi
        risk_level = rf.predict_risk(data)
        print(f"YOLO detection matched! RF Categorization: {risk_level}")
        
        if risk_level == "HIGH":
            arduino.send_high()
        else:
            arduino.send_stop()
            
    elif status == "STOP_SYSTEM":
        print("Forced STOP from Website")
        arduino.send_stop()

# Set the callback for websocket results
ws.set_callback(process_logic)

# Start Connection
ws.connect()

print("🚀 RockSense Pi System starting...")

try:
    while True:
        # 1. Capture Frame
        frame = camera.get_frame()
        
        # 2. Send to Laptop for YOLO
        if frame:
            ws.send_frame(frame)
            
        # Control Loop frequency
        time.sleep(0.1)

except KeyboardInterrupt:
    print("Shutting down...")
    arduino.send_stop()
    arduino.close()
