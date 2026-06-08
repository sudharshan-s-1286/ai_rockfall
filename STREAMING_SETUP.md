# RockSense — Real-Time Pi Camera Streaming System
## Complete Setup & Run Guide

---

## System Architecture

```
┌──────────── RASPBERRY PI ────────────────────────────────────────────┐
│  Pi Camera V1.3                                                       │
│       │   picamera2 — 640×480 @ 5-10 FPS — JPEG quality 65           │
│       ▼                                                               │
│  pi_client.py  (WebSocket CLIENT)                                     │
│       │  Streams JPEG frames continuously                             │
│       │  Receives confirmed detection results from backend            │
│       │  Runs Random Forest → LOW / MEDIUM / HIGH risk               │
│       ▼                                                               │
│  ArduinoAlert   GSMAlert                                              │
│  (/dev/ttyUSB0) (/dev/ttyUSB1)                                        │
│  LED + Buzzer   Vibration + Buzzer + LED + SMS                        │
└──────────────────────────────────────────────────────────────────────┘
          │WebSocket ws://LAPTOP_IP:8000/ws/pi-frame
          ▼
┌──────────── LAPTOP BACKEND (FastAPI) ───────────────────────────────┐
│  pi_stream.py router                                                 │
│  ┌──── YOLO11 Inference ────────────────────────────────────────┐   │
│  │  Detects cracks in each frame                               │   │
│  │  Returns: {class, confidence, bbox, area}                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌──── 15-Second Sliding Window ───────────────────────────────┐   │
│  │  Buffers last 15s of detection results                      │   │
│  │  If crack in >60% of frames → CONFIRMED                     │   │
│  │  Sends confirmed result BACK to Pi with features            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  /ws/live-feed  ─────────────────────────────────────────────────   │
│  Broadcasts frames + status to frontend browsers                    │
└──────────────────────────────────────────────────────────────────────┘
          │WebSocket ws://LAPTOP_IP:8000/ws/live-feed
          ▼
┌──────────── BROWSER / FRONTEND ─────────────────────────────────────┐
│  stream_dashboard.html  (standalone — no build required)             │
│  LiveStreamPage.jsx      (React dashboard integration)               │
│  Shows: Live video | SAFE/WARNING/DANGER badge | Detection log       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Step 1 — Backend Setup (Laptop)

### 1.1 Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 1.2 Copy YOLO Model
Place your `Yolo11.pt` model file in the `backend/` directory:
```
backend/
  Yolo11.pt          ← put it here
  app/
    routers/
      pi_stream.py   ← reads Yolo11.pt from backend/ directory
```
> If the model file is missing, the system runs in **placeholder mode** (no crash, no false positives).

### 1.3 Find Your Laptop IP
```bash
# Windows
ipconfig        # Look for IPv4 Address under Wi-Fi

# Linux/Mac
ip addr show    # or: hostname -I
```
> Example: `192.168.1.100`

### 1.4 Start the Backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Backend is now live at: `http://192.168.1.100:8000`

---

## Step 2 — Raspberry Pi Setup

### 2.1 Enable Pi Camera
```bash
sudo raspi-config
# → Interface Options → Camera → Enable
# Add to /boot/firmware/config.txt (Pi 5) or /boot/config.txt (Pi 4):
#   camera_auto_detect=1
```

Test camera:
```bash
libcamera-hello --timeout 3000
```

### 2.2 Install Python Dependencies
```bash
cd raspberrypi_rocksence
pip install -r requirements_pi.txt --break-system-packages
# Or inside a virtualenv:
python3 -m venv venv && source venv/bin/activate
pip install -r requirements_pi.txt
```

### 2.3 Copy the Random Forest Model
Ensure `rocksense_random_forest.pkl` is in `raspberrypi_rocksence/`.

### 2.4 Connect Arduino Hardware
| Device            | Pi Port      | Config arg    |
|-------------------|-------------|---------------|
| Arduino UNO       | /dev/ttyUSB0 | `--ard-port`  |
| Arduino Nano+GSM  | /dev/ttyUSB1 | `--gsm-port`  |

Check available ports:
```bash
ls /dev/ttyUSB* /dev/ttyACM*
```

### 2.5 Flash Arduino Code
Upload from `arduino/` folder using Arduino IDE:
- `arduino/mine_alert/mine_alert.ino` → Upload to **Arduino UNO**
- `arduino/worker_tracking/worker_tracking.ino` → Upload to **Arduino Nano**

> Edit `ALERT_NUMBER` in `worker_tracking.ino` before uploading!

---

## Step 3 — Run the System

### Run Order:
```
1. Backend (Laptop) — must be running FIRST
2. Pi Client (Raspberry Pi)
3. Open Dashboard (Browser)
```

### Command Reference:

**Backend (Laptop):**
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Pi Client (Raspberry Pi):**
```bash
cd raspberrypi_rocksence

# With display (preview window on Pi):
python3 pi_client.py --server ws://192.168.1.100:8000/ws/pi-frame

# Headless (SSH / no monitor):
python3 pi_client.py \
  --server ws://192.168.1.100:8000/ws/pi-frame \
  --headless \
  --ard-port /dev/ttyUSB0 \
  --gsm-port /dev/ttyUSB1 \
  --fps 8 \
  --quality 65

# If only UNO is connected (no GSM):
python3 pi_client.py \
  --server ws://192.168.1.100:8000/ws/pi-frame \
  --headless \
  --ard-port /dev/ttyUSB0 \
  --gsm-port /dev/ttyUSB99  # Invalid port → GSM alerts silently disabled
```

**Open Dashboard (Any Browser on local network):**
```
# Standalone HTML (no server needed):
open file:///path/to/raspberrypi_rocksence/dashboard/stream_dashboard.html
# Then set server URL to: ws://192.168.1.100:8000/ws/live-feed

# Or React frontend (if running Vite dev server):
http://localhost:5173/live-stream
```

---

## Step 4 — Verify

### Backend Health Check
Open: `http://192.168.1.100:8000/api/pi-stream/status`

Expected response when Pi is connected:
```json
{
  "pi_connected": true,
  "server_fps": 8.2,
  "yolo_available": true,
  "current_ratio": 0.0,
  "detection_confirmed": false,
  "frontend_clients": 1
}
```

### MJPEG Snapshot (no WebSocket needed)
```
http://192.168.1.100:8000/api/pi-stream/snapshot   (single frame)
http://192.168.1.100:8000/api/pi-stream/mjpeg       (continuous stream)
```

---

## Data Flow (Step by Step)

```
1. Pi Camera captures frame (640×480 RGB)
2. pi_client.py encodes → JPEG (quality 65) → base64
3. Sends JSON over WebSocket every ~125ms (8 FPS)
4. Backend receives → decodes JPEG → BGR numpy array
5. YOLO11 runs (Yolo11.pt) → list of {class, confidence, bbox}
6. SlidingWindowBuffer records detections for each frame
7. Every frame: checks buffer (last 15s)
      → if crack present in >60% of frames AND ≥5 frames seen:
         CONFIRMED → send result back to Pi + broadcast to frontend
8. Pi receives confirmed result → extracts features →
      Random Forest predicts: LOW / MEDIUM / HIGH risk
9. If HIGH:
      → Arduino UNO: HIGH_RISK command → LED + Buzzer ON
      → Arduino Nano+GSM: WORKER_ALERT → vibration + buzzer + SMS
10. Frontend receives frame + status via /ws/live-feed
      → renders live video + DANGER badge + detection boxes
```

---

## Performance Tuning

| Parameter         | Value   | How to change              |
|-------------------|---------|---------------------------|
| Target FPS        | 8       | `--fps 5` (for slower Pi) |
| JPEG quality      | 65      | `--quality 55` (lower bandwidth) |
| Resolution        | 640×480 | Edit `FRAME_WIDTH/FRAME_HEIGHT` in `pi_client.py` |
| Temporal window   | 15s     | Edit `STAB_WINDOW_SECS` in `pi_stream.py` |
| Confirm threshold | 60%     | Edit `CONFIRM_THRESHOLD` in `pi_stream.py` |
| YOLO confidence   | 0.5     | Edit `YOLO_CONF_THRESHOLD` in `pi_stream.py` |

---

## Folder Structure

```
Rocksense/
├── raspberrypi_rocksence/
│   ├── pi_client.py                ← NEW: Pi streaming client
│   ├── rocksense_random_forest.pkl ← RF model (used by pi_client.py)
│   ├── requirements_pi.txt         ← Updated Pi dependencies
│   └── dashboard/
│       └── stream_dashboard.html   ← NEW: Standalone HTML dashboard
│
├── backend/
│   ├── Yolo11.pt                   ← YOLO model (place here)
│   ├── requirements.txt            ← Updated (added websockets)
│   └── app/
│       ├── main.py                 ← Updated: pi_stream router registered
│       └── routers/
│           └── pi_stream.py        ← NEW: WebSocket server + YOLO + 15s logic
│
├── frontend/
│   └── src/
│       └── pages/
│           └── LiveStreamPage.jsx  ← NEW: React live stream page
│
└── arduino/
    ├── mine_alert/
    │   └── mine_alert.ino          ← NEW: Arduino UNO (LED + Buzzer)
    └── worker_tracking/
        └── worker_tracking.ino     ← NEW: Arduino Nano + GSM
```

---

## Adding React Route (Optional)

In your `App.jsx` / router config, add:
```jsx
import LiveStreamPage from './pages/LiveStreamPage';

// Inside routes:
<Route path="/live-stream" element={<LiveStreamPage />} />
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Camera cannot open` | Run `libcamera-hello`, check CSI ribbon cable |
| `Connection refused` | Check laptop IP + firewall: `sudo ufw allow 8000` |
| `YOLO not available` | Place `Yolo11.pt` in `backend/` directory |
| `Arduino not detected` | Check `ls /dev/ttyUSB*`, try `--ard-port /dev/ttyACM0` |
| Choppy video | Reduce `--fps 5` or `--quality 50` |
| WebSocket keeps disconnecting | Check Wi-Fi stability; reconnect logic handles this automatically |
