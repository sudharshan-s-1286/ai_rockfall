#!/usr/bin/env python3
"""
=============================================================================
  RockSense — Raspberry Pi Streaming Client
  ==========================================
  Hardware : Raspberry Pi 4/5  +  Pi Camera Module V1.3
             Arduino UNO  (mine alert system)
             Arduino Nano + GSM Module (worker tracking)

  Pipeline:
    Pi Camera ──JPEG──► Backend Server (YOLO11 + 15s validation)
                    ◄── Confirmed Detection Result
    Pi ──► Random Forest ──► Risk Level
    HIGH risk ──► Arduino UNO (LED + buzzer)
                ──► GSM Module (worker alert)

  Run:
    python3 pi_client.py --server ws://192.168.1.100:8000/ws/pi-frame
    python3 pi_client.py --server ws://192.168.1.100:8000/ws/pi-frame --headless

  Ctrl+C to quit.
=============================================================================
"""

import argparse
import asyncio
import base64
import json
import logging
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

import cv2
import joblib
import numpy as np
import serial
import websockets

# ── picamera2 (Pi native) or fallback to OpenCV ──────────────────────────
try:
    from picamera2 import Picamera2
    _PICAM2 = True
except ImportError:
    _PICAM2 = False

# ── Configuration ─────────────────────────────────────────────────────────
FRAME_WIDTH   = 640
FRAME_HEIGHT  = 480
TARGET_FPS    = 8          # Frames per second to send
JPEG_QUALITY  = 65         # JPEG compression quality (60-70 recommended)
FRAME_SKIP    = 1          # Send every N-th captured frame (1 = all)

DEFAULT_RF_MODEL  = "rocksense_random_forest.pkl"
DEFAULT_ARD_PORT  = "/dev/ttyUSB0"   # Arduino UNO (mine alert)
DEFAULT_GSM_PORT  = "/dev/ttyUSB1"   # Arduino Nano + GSM (worker tracking)
DEFAULT_BAUD      = 9600
RECONNECT_DELAY   = 3      # Seconds between reconnect attempts

# Risk label mapping — must match training labels
RF_LABEL_MAP = {0: "HIGH", 1: "MEDIUM", 2: "LOW"}

# ── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("pi_client.log", mode="a"),
    ],
)
log = logging.getLogger("RockSense-Pi")


# =============================================================================
# CLI
# =============================================================================
def parse_args():
    p = argparse.ArgumentParser(description="RockSense Pi Streaming Client")
    p.add_argument("--server",    required=True,
                   help="Backend WebSocket URL  e.g. ws://192.168.1.100:8000/ws/pi-frame")
    p.add_argument("--rf-model",  default=DEFAULT_RF_MODEL)
    p.add_argument("--ard-port",  default=DEFAULT_ARD_PORT,  help="Arduino UNO serial port")
    p.add_argument("--gsm-port",  default=DEFAULT_GSM_PORT,  help="GSM module serial port")
    p.add_argument("--baud",      default=DEFAULT_BAUD,      type=int)
    p.add_argument("--fps",       default=TARGET_FPS,        type=int,
                   help="Target FPS to stream (5-10 recommended)")
    p.add_argument("--quality",   default=JPEG_QUALITY,      type=int,
                   help="JPEG quality 1-100")
    p.add_argument("--headless",  action="store_true",
                   help="Disable preview window (use on SSH / no display)")
    p.add_argument("--backend",   choices=["auto", "picamera2", "v4l2"], default="auto")
    return p.parse_args()


# =============================================================================
# CameraCapture — picamera2 / V4L2 fallback
# =============================================================================
class CameraCapture:
    """Unified camera interface. Tries picamera2 first, then V4L2."""

    def __init__(self, backend: str = "auto"):
        self._picam2 = None
        self._cap    = None
        self._source = None
        self._open(backend)

    def _open(self, backend: str):
        if backend in ("auto", "picamera2") and _PICAM2:
            if self._try_picamera2():
                return
        if backend in ("auto", "v4l2"):
            if self._try_v4l2():
                return
        raise RuntimeError(
            "Cannot open camera. Check CSI ribbon / raspi-config / /boot/config.txt"
        )

    def _try_picamera2(self) -> bool:
        try:
            log.info("Opening camera via picamera2 …")
            cam = Picamera2()
            cfg = cam.create_preview_configuration(
                main={"size": (FRAME_WIDTH, FRAME_HEIGHT), "format": "RGB888"}
            )
            cam.configure(cfg)
            cam.start()
            time.sleep(0.5)
            self._picam2  = cam
            self._source  = "picamera2 (libcamera)"
            log.info("Camera: picamera2 OK")
            return True
        except Exception as e:
            log.warning(f"picamera2 failed: {e}")
            return False

    def _try_v4l2(self) -> bool:
        log.info("Opening camera via V4L2 /dev/video0 …")
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
            cap.set(cv2.CAP_PROP_FPS, 30)
            self._cap    = cap
            self._source = "V4L2 /dev/video0"
            log.info("Camera: V4L2 OK")
            return True
        cap.release()
        log.warning("V4L2 failed")
        return False

    def read(self):
        """Returns (ok: bool, BGR-frame: np.ndarray)."""
        if self._picam2:
            try:
                rgb = self._picam2.capture_array()
                return True, cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            except Exception as e:
                log.error(f"picamera2 read error: {e}")
                return False, None
        if self._cap:
            return self._cap.read()
        return False, None

    def release(self):
        if self._picam2:
            try:
                self._picam2.stop()
                self._picam2.close()
            except Exception:
                pass
        if self._cap:
            self._cap.release()
        log.info("Camera released.")


# =============================================================================
# RandomForestClassifier
# =============================================================================
class RiskClassifier:
    """
    Runs the pre-trained Random Forest model on the Pi.
    Input features (from backend detection result):
        [avg_confidence, max_confidence, detection_frequency,
         avg_bbox_area, persistence_duration]
    Output: 'LOW' | 'MEDIUM' | 'HIGH'
    """

    def __init__(self, model_path: str):
        path = Path(model_path)
        if not path.exists():
            raise FileNotFoundError(
                f"RF model not found: {path.resolve()}\n"
                "Copy rocksense_random_forest.pkl to the same folder."
            )
        log.info(f"Loading Random Forest model: {path.resolve()}")
        self.model = joblib.load(str(path))
        log.info("Random Forest model loaded.")

    def predict(self, features: list) -> str:
        arr = np.array(features, dtype=float).reshape(1, -1)
        raw = self.model.predict(arr)[0]
        if isinstance(raw, (int, np.integer)):
            return RF_LABEL_MAP.get(int(raw), "HIGH")
        label = str(raw).strip().upper()
        return label if label in ("LOW", "MEDIUM", "HIGH") else "HIGH"


# =============================================================================
# ArduinoAlert — Mine Alert System (UNO)
# =============================================================================
class ArduinoAlert:
    """
    Sends state-change commands to Arduino UNO via serial.
    Commands:
        HIGH_RISK  →  LED ON, Buzzer ON
        STOP       →  LED OFF, Buzzer OFF
    Only sends when state changes (avoids flooding serial port).
    """

    def __init__(self, port: str, baud: int):
        self.ser        = None
        self._last_risk = None
        try:
            self.ser = serial.Serial(port, baud, timeout=1)
            time.sleep(2)   # Wait for Arduino bootloader reset
            log.info(f"Arduino UNO connected: {port} @ {baud} baud")
        except serial.SerialException as e:
            log.warning(f"Arduino UNO not available ({e}) — alerts disabled for mine system")

    def update(self, risk: str):
        """Send alert if risk level changed to/from HIGH."""
        if risk == self._last_risk:
            return
        if risk == "HIGH" and self._last_risk != "HIGH":
            self._send("HIGH_RISK")
            log.warning("⚠️  ARDUINO UNO: HIGH_RISK alert sent")
        elif risk != "HIGH" and self._last_risk == "HIGH":
            self._send("STOP")
            log.info("✅  ARDUINO UNO: STOP signal sent (risk cleared)")
        self._last_risk = risk

    def _send(self, msg: str):
        if self.ser and self.ser.is_open:
            try:
                self.ser.write(f"{msg}\n".encode())
            except serial.SerialException as e:
                log.error(f"Arduino UNO serial error: {e}")
        else:
            log.info(f"[Arduino unavailable] Would send: {msg}")

    def close(self):
        if self.ser and self.ser.is_open:
            self.ser.close()


# =============================================================================
# GSMAlert — Worker Tracking Device (Nano + GSM)
# =============================================================================
class GSMAlert:
    """
    Sends state-change commands to Arduino Nano + GSM module.
    Commands:
        WORKER_ALERT  →  Vibration ON, Buzzer ON, LED ON (+ GSM SMS)
        WORKER_CLEAR  →  All OFF
    """

    def __init__(self, port: str, baud: int):
        self.ser        = None
        self._last_risk = None
        try:
            self.ser = serial.Serial(port, baud, timeout=1)
            time.sleep(2)
            log.info(f"GSM Module connected: {port} @ {baud} baud")
        except serial.SerialException as e:
            log.warning(f"GSM module not available ({e}) — worker alerts disabled")

    def update(self, risk: str):
        if risk == self._last_risk:
            return
        if risk == "HIGH" and self._last_risk != "HIGH":
            self._send("WORKER_ALERT")
            log.warning("⚠️  GSM: WORKER_ALERT sent to tracking device")
        elif risk != "HIGH" and self._last_risk == "HIGH":
            self._send("WORKER_CLEAR")
            log.info("✅  GSM: WORKER_CLEAR sent")
        self._last_risk = risk

    def _send(self, msg: str):
        if self.ser and self.ser.is_open:
            try:
                self.ser.write(f"{msg}\n".encode())
            except serial.SerialException as e:
                log.error(f"GSM serial error: {e}")
        else:
            log.info(f"[GSM unavailable] Would send: {msg}")

    def close(self):
        if self.ser and self.ser.is_open:
            self.ser.close()


# =============================================================================
# Frame Encoder
# =============================================================================
def encode_frame(frame: np.ndarray, quality: int = JPEG_QUALITY) -> str:
    """
    Encode a BGR frame to base64 JPEG string.
    Returns empty string on failure.
    """
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("utf-8")


# =============================================================================
# Pi Streaming Client — async WebSocket loop
# =============================================================================
class PiStreamClient:
    """
    Manages the WebSocket connection to the backend, streams frames,
    and processes incoming detection results.
    """

    def __init__(self, server_url: str, classifier: RiskClassifier,
                 arduino: ArduinoAlert, gsm: GSMAlert,
                 fps: int, quality: int, headless: bool):
        self.server_url    = server_url
        self.classifier    = classifier
        self.arduino       = arduino
        self.gsm           = gsm
        self.fps           = fps
        self.quality       = quality
        self.headless      = headless
        self._connected    = False
        self._current_risk = "UNKNOWN"

    async def run_forever(self, camera: CameraCapture):
        """Main loop with automatic reconnection on disconnect."""
        attempt = 0
        while True:
            attempt += 1
            log.info(f"Connecting to backend: {self.server_url}  (attempt {attempt})")
            try:
                async with websockets.connect(
                    self.server_url,
                    ping_interval=20,
                    ping_timeout=10,
                    max_size=None,          # Unlimited message size
                ) as ws:
                    self._connected = True
                    log.info("✅ Connected to backend server")
                    attempt = 0

                    # Run sender and receiver concurrently
                    await asyncio.gather(
                        self._send_frames(ws, camera),
                        self._receive_results(ws),
                    )
            except (websockets.ConnectionClosed, OSError, ConnectionRefusedError) as e:
                self._connected = False
                log.warning(f"Disconnected from backend: {e}")
            except Exception as e:
                self._connected = False
                log.error(f"Unexpected error: {e}")

            wait = min(RECONNECT_DELAY * attempt, 30)
            log.info(f"Reconnecting in {wait}s …")
            await asyncio.sleep(wait)

    async def _send_frames(self, ws, camera: CameraCapture):
        """Capture and send frames at target FPS."""
        interval      = 1.0 / self.fps
        frame_count   = 0
        fps_timer     = time.time()
        fps_display   = 0.0

        while True:
            t_start = time.time()

            ok, frame = camera.read()
            if not ok or frame is None:
                log.warning("Frame grab failed — skipping")
                await asyncio.sleep(0.05)
                continue

            frame_count += 1

            # Calculate live FPS
            elapsed = time.time() - fps_timer
            if elapsed >= 2.0:
                fps_display = frame_count / elapsed
                frame_count = 0
                fps_timer   = time.time()

            # Encode frame
            b64 = encode_frame(frame, self.quality)
            if not b64:
                continue

            # Build message
            msg = json.dumps({
                "type":      "frame",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "frame":     b64,
                "width":     FRAME_WIDTH,
                "height":    FRAME_HEIGHT,
                "fps":       round(fps_display, 1),
            })

            await ws.send(msg)
            log.debug(f"Frame sent ({fps_display:.1f} FPS)")

            # Preview window on Pi (if not headless)
            if not self.headless:
                # Draw status overlay on preview
                display = frame.copy()
                risk_colour = {
                    "HIGH":    (0,   0,   255),
                    "MEDIUM":  (0,   165, 255),
                    "LOW":     (0,   220, 80),
                    "UNKNOWN": (200, 200, 200),
                }.get(self._current_risk, (200, 200, 200))
                cv2.putText(display, f"Risk: {self._current_risk}",
                            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, risk_colour, 2)
                cv2.putText(display, f"FPS: {fps_display:.1f}",
                            (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1)
                connected_txt = "Server: CONNECTED" if self._connected else "Server: DISCONNECTED"
                cv2.putText(display, connected_txt,
                            (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                            (0,220,80) if self._connected else (0,0,255), 1)
                ts = datetime.now().strftime("%H:%M:%S")
                cv2.putText(display, ts, (FRAME_WIDTH - 80, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 0), 1)
                cv2.imshow("RockSense | Pi Camera", display)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    log.info("'q' pressed — quitting")
                    raise KeyboardInterrupt

            # Maintain target FPS
            elapsed_frame = time.time() - t_start
            sleep_time    = max(0, interval - elapsed_frame)
            await asyncio.sleep(sleep_time)

    async def _receive_results(self, ws):
        """
        Receive confirmed detection results from backend.
        Backend sends results ONLY after 15-second temporal validation.
        Runs Random Forest and triggers alerts.
        """
        async for raw_msg in ws:
            try:
                data = json.loads(raw_msg)
                msg_type = data.get("type", "")

                if msg_type == "detection_confirmed":
                    self._handle_confirmed_detection(data)

                elif msg_type == "detection_cleared":
                    # Detection no longer persistent — run RF with cleared state
                    log.info("Detection cleared by backend (crack disappeared)")
                    self._update_risk("LOW")

                elif msg_type == "status":
                    log.info(f"Backend: {data.get('message', '')}")

            except json.JSONDecodeError:
                log.warning("Received non-JSON message from backend")
            except Exception as e:
                log.error(f"Error handling received message: {e}")

    def _handle_confirmed_detection(self, data: dict):
        """
        Backend has confirmed a crack after 15-second validation.
        Run Random Forest to classify risk level.
        Trigger alerts if HIGH.
        """
        features = data.get("features", {})
        detections = data.get("detections", [])

        log.info(
            f"✅ CONFIRMED DETECTION from backend — "
            f"{len(detections)} crack(s), "
            f"avg_conf={features.get('avg_confidence', 0):.2f}"
        )

        # Build feature vector for Random Forest
        feature_vector = [
            features.get("avg_confidence",      0.0),
            features.get("max_confidence",      0.0),
            features.get("detection_frequency", 0.0),
            features.get("avg_bbox_area",       0.0),
            features.get("persistence_duration", 0.0),
        ]

        # Run Random Forest classification
        try:
            risk = self.classifier.predict(feature_vector)
        except Exception as e:
            log.error(f"Random Forest prediction failed: {e}")
            risk = "HIGH"   # Fail-safe: treat as HIGH

        log.info(f"🎯 Random Forest → Risk = {risk}")
        self._update_risk(risk)

    def _update_risk(self, risk: str):
        """Update internal risk state and trigger Arduino/GSM alerts."""
        self._current_risk = risk
        self.arduino.update(risk)
        self.gsm.update(risk)


# =============================================================================
# Entry Point
# =============================================================================
def main():
    args = parse_args()

    log.info("=" * 62)
    log.info("  RockSense — Pi Streaming Client — Starting")
    log.info("=" * 62)
    log.info(f"Backend server : {args.server}")
    log.info(f"RF model       : {args.rf_model}")
    log.info(f"Arduino port   : {args.ard_port}")
    log.info(f"GSM port       : {args.gsm_port}")
    log.info(f"Target FPS     : {args.fps}")
    log.info(f"JPEG quality   : {args.quality}")
    log.info(f"Headless       : {args.headless}")
    log.info(f"picamera2      : {'available' if _PICAM2 else 'NOT installed'}")

    # --- Initialise subsystems ---
    try:
        camera = CameraCapture(backend=args.backend)
    except RuntimeError as e:
        log.critical(f"Camera error: {e}")
        sys.exit(1)

    try:
        classifier = RiskClassifier(args.rf_model)
    except FileNotFoundError as e:
        log.critical(str(e))
        camera.release()
        sys.exit(1)

    arduino = ArduinoAlert(args.ard_port, args.baud)
    gsm     = GSMAlert(args.gsm_port, args.baud)

    client = PiStreamClient(
        server_url = args.server,
        classifier = classifier,
        arduino    = arduino,
        gsm        = gsm,
        fps        = args.fps,
        quality    = args.quality,
        headless   = args.headless,
    )

    log.info("Starting streaming loop — Ctrl+C to quit")
    try:
        asyncio.run(client.run_forever(camera))
    except KeyboardInterrupt:
        log.info("Ctrl+C received — shutting down")
    finally:
        camera.release()
        arduino.close()
        gsm.close()
        if not args.headless:
            cv2.destroyAllWindows()
        log.info("Pi client shut down cleanly.")


if __name__ == "__main__":
    main()
