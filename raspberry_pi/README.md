# 🥧 RockSense Raspberry Pi Setup Guide

This folder contains the modular Python system for the RockSense Raspberry Pi. Follow these steps to get it running on your Pi.

## 1. Transfer the Folder
Copy the entire `raspberry_pi/` folder to your Raspberry Pi (via SCP, USB drive, or SFTP).

## 2. Install Dependencies
Run the following commands on your Raspberry Pi terminal:

```bash
# Update system
sudo apt update

# Install system dependencies for OpenCV and Camera
sudo apt install -y python3-picamera2 libopencv-dev python3-opencv

# Install Python packages
pip3 install "python-socketio[client]" pyserial joblib numpy scikit-learn
```

## 3. Configuration (IMPORTANT)
Open `main.py` and update the `LAPTOP_IP` to match your laptop's current IP address:

```python
# main.py
LAPTOP_IP = "192.168.X.X"  # <--- Change this to your laptop's IP
```

## 4. Hardware Connection
- **Camera**: Ensure the Pi Camera ribbon cable is firmly connected.
- **Arduino**: Plug the Arduino into one of the Pi's USB ports.
  - Default port is `/dev/ttyUSB0`.
  - If it doesn't work, try changing it to `/dev/ttyACM0` in `main.py`.

## 5. Run the System
Navigate to the folder and start the controller:

```bash
cd raspberry_pi
python3 main.py
```

---
### 🛠️ Module Overview
- `main.py`: The brain. Starts the loop and coordinates all modules.
- `camera_stream.py`: Grabs frames and sends them to the laptop.
- `websocket_client.py`: Handles the real-time data link.
- `rf_model.py`: Uses your trained `rocksense_random_forest.pkl` to classify risk.
- `arduino_serial.py`: Controls the Arduino alerts.
