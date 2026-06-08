#!/usr/bin/env python3
"""
=============================================================================
  RockSense — Raspberry Pi AI Rockfall Detection System
  ======================================================
  Hardware : Raspberry Pi 4 / 5  +  Pi Camera Module (v1 / v2 / v3 / HQ)
  Models   : YOLOv11  (Yolo11.pt)  +  Random Forest (rocksense_random_forest.pkl)
  Alert    : Arduino via USB serial (/dev/ttyUSB0 or /dev/ttyACM0)

  Pipeline:
    Pi Camera ─► YOLO Detection ─► 15-sec Stabilisation
              ─► Feature Extraction ─► Random Forest
              ─► Risk (LOW / MEDIUM / HIGH) ─► Arduino Alert

  ── Camera backend priority ───────────────────────────────────────────────
    1. picamera2  (recommended on Pi OS Bullseye / Bookworm — native & fast)
    2. libcamerasrc GStreamer pipeline (needs gstreamer1.0-libcamera installed)
    3. V4L2 via /dev/video0  (universal fallback)

  ── Raspberry Pi Setup ────────────────────────────────────────────────────
    # System packages
    sudo apt update && sudo apt install -y \
        python3-picamera2 \
        python3-libcamera \
        libcap-dev \
        gstreamer1.0-libcamera \
        gstreamer1.0-tools \
        libopencv-dev

    # Python packages  (in a venv or with --break-system-packages on Pi)
    pip install ultralytics joblib scikit-learn pyserial numpy

    # Enable camera (legacy stack NOT required for picamera2)
    sudo raspi-config → Interface Options → Camera → Enable
    # OR add to /boot/config.txt / /boot/firmware/config.txt :
    #   camera_auto_detect=1

    # Test camera
    libcamera-hello --timeout 5000

  Usage:
    python3 rocksense_pi.py                          # normal (with preview window)
    python3 rocksense_pi.py --headless               # no display / SSH session
    python3 rocksense_pi.py --port /dev/ttyACM0 --conf 0.55 --stab-time 10

  Press 'q' in the preview window (or Ctrl+C in terminal) to quit.
=============================================================================
"""

import argparse
import logging
import sys
import time
from collections import deque
from pathlib import Path

import cv2
import joblib
import numpy as np
import serial
from ultralytics import YOLO

# Optional — picamera2 is only available on Raspberry Pi
try:
    from picamera2 import Picamera2
    _PICAMERA2_AVAILABLE = True
except ImportError:
    _PICAMERA2_AVAILABLE = False

# ---------------------------------------------------------------------------
# Configuration — edit defaults here if you prefer not to use CLI arguments
# ---------------------------------------------------------------------------
DEFAULT_YOLO_MODEL = "Yolo11.pt"                       # Same folder as this script
DEFAULT_RF_MODEL   = "rocksense_random_forest.pkl"     # Same folder as this script
DEFAULT_PORT       = "/dev/ttyUSB0"                    # Try /dev/ttyACM0 if not found
DEFAULT_BAUD       = 9600
DEFAULT_CONF       = 0.5                               # YOLO minimum confidence
DEFAULT_STAB_SECS  = 15                                # Stabilisation window (seconds)

# Pi Camera resolution — lower = faster inference
CAMERA_WIDTH  = 640
CAMERA_HEIGHT = 480

# Process every N-th frame to reduce CPU load on Pi
FRAME_SKIP = 2

# Risk label mapping (must match training labels)
#   0 → HIGH   1 → MEDIUM   2 → LOW
RF_LABEL_MAP = {0: "HIGH", 1: "MEDIUM", 2: "LOW"}

# ---------------------------------------------------------------------------
# Colours (BGR)
# ---------------------------------------------------------------------------
CLR_GREEN  = (0, 220, 80)
CLR_YELLOW = (0, 210, 255)
CLR_RED    = (30, 30, 240)
CLR_WHITE  = (255, 255, 255)
CLR_BLACK  = (0, 0, 0)
CLR_CYAN   = (220, 200, 0)

RISK_COLOUR = {"LOW": CLR_GREEN, "MEDIUM": CLR_YELLOW, "HIGH": CLR_RED}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("rocksense_pi.log", mode="a"),
    ],
)
log = logging.getLogger("RockSense")


# =============================================================================
# CLI
# =============================================================================
def parse_args():
    p = argparse.ArgumentParser(description="RockSense — Pi Camera Rockfall Detector")
    p.add_argument("--yolo-model", default=DEFAULT_YOLO_MODEL)
    p.add_argument("--rf-model",   default=DEFAULT_RF_MODEL)
    p.add_argument("--port",       default=DEFAULT_PORT,      help="Arduino serial port")
    p.add_argument("--baud",       default=DEFAULT_BAUD,      type=int)
    p.add_argument("--conf",       default=DEFAULT_CONF,      type=float, help="YOLO confidence threshold")
    p.add_argument("--stab-time",  default=DEFAULT_STAB_SECS, type=int,   help="Stabilisation window (s)")
    p.add_argument(
        "--headless",
        action="store_true",
        help="Disable cv2.imshow preview (use when running over SSH / without display)",
    )
    p.add_argument(
        "--backend",
        choices=["auto", "picamera2", "gstreamer", "v4l2"],
        default="auto",
        help="Force a specific camera backend (default: auto-detect)",
    )
    return p.parse_args()


# =============================================================================
# CameraManager  —  Multi-backend Raspberry Pi Camera
# =============================================================================
class CameraManager:
    """
    Opens the Raspberry Pi Camera Module using one of three backends,
    tried in priority order (unless --backend forces a specific one):

      1. picamera2   — native libcamera Python API (Pi OS Bullseye/Bookworm)
      2. GStreamer   — libcamerasrc pipeline via OpenCV
      3. V4L2        — /dev/video0 generic fallback

    Exposes a unified  .read() → (ok, BGR-frame)  interface.
    """

    def __init__(self, backend: str = "auto"):
        self._backend  = backend
        self._picam2   = None   # picamera2 handle
        self._cap      = None   # cv2.VideoCapture handle
        self._source   = None
        self._open()

    # ── GStreamer pipeline string ────────────────────────────────────────────
    _GST_PIPELINE = (
        "libcamerasrc ! "
        "video/x-raw, width={w}, height={h}, framerate=30/1 ! "
        "videoconvert ! "
        "video/x-raw, format=BGR ! "
        "appsink drop=1"
    ).format(w=CAMERA_WIDTH, h=CAMERA_HEIGHT)

    # ── Open sequence ────────────────────────────────────────────────────────
    def _open(self):
        order = self._backend_order()
        for name in order:
            if self._try(name):
                log.info(f"Camera opened via: {self._source}")
                return
        raise RuntimeError(
            "Cannot open Raspberry Pi Camera Module.\n"
            "  • Ensure the CSI ribbon cable is seated correctly.\n"
            "  • Run:  sudo raspi-config → Interface Options → Camera → Enable\n"
            "  • Add to /boot/firmware/config.txt (Pi 5) or /boot/config.txt:\n"
            "      camera_auto_detect=1\n"
            "  • Install picamera2:  sudo apt install python3-picamera2\n"
            "  • Test with:  libcamera-hello --timeout 5000"
        )

    def _backend_order(self):
        if self._backend != "auto":
            return [self._backend]
        order = []
        if _PICAMERA2_AVAILABLE:
            order.append("picamera2")
        order += ["gstreamer", "v4l2"]
        return order

    def _try(self, name: str) -> bool:
        if name == "picamera2":
            return self._open_picamera2()
        if name == "gstreamer":
            return self._open_gstreamer()
        if name == "v4l2":
            return self._open_v4l2()
        return False

    def _open_picamera2(self) -> bool:
        if not _PICAMERA2_AVAILABLE:
            return False
        try:
            log.info("Trying picamera2 backend …")
            cam = Picamera2()
            cfg = cam.create_preview_configuration(
                main={"size": (CAMERA_WIDTH, CAMERA_HEIGHT), "format": "RGB888"}
            )
            cam.configure(cfg)
            cam.start()
            time.sleep(0.5)          # warm-up
            self._picam2 = cam
            self._source = "picamera2 (libcamera native)"
            return True
        except Exception as e:
            log.warning(f"picamera2 failed: {e}")
            return False

    def _open_gstreamer(self) -> bool:
        log.info("Trying GStreamer/libcamera backend …")
        cap = cv2.VideoCapture(self._GST_PIPELINE, cv2.CAP_GSTREAMER)
        if cap.isOpened():
            self._cap    = cap
            self._source = "GStreamer/libcamera"
            return True
        cap.release()
        log.warning("GStreamer pipeline failed.")
        return False

    def _open_v4l2(self) -> bool:
        log.info("Trying V4L2 /dev/video0 backend …")
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH,  CAMERA_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
            cap.set(cv2.CAP_PROP_FPS, 30)
            self._cap    = cap
            self._source = "V4L2 (/dev/video0)"
            return True
        cap.release()
        log.warning("V4L2 /dev/video0 failed.")
        return False

    # ── Public interface ─────────────────────────────────────────────────────
    def read(self):
        """Returns (ok: bool, frame: np.ndarray [BGR])."""
        if self._picam2 is not None:
            try:
                # picamera2 returns RGB; convert to BGR for OpenCV
                rgb = self._picam2.capture_array()
                bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
                return True, bgr
            except Exception as e:
                log.error(f"picamera2 capture error: {e}")
                return False, None
        if self._cap is not None:
            return self._cap.read()
        return False, None

    def release(self):
        if self._picam2 is not None:
            try:
                self._picam2.stop()
                self._picam2.close()
            except Exception:
                pass
        if self._cap is not None:
            self._cap.release()
        log.info("Camera released.")


# =============================================================================
# YOLODetector
# =============================================================================
class YOLODetector:
    """Runs YOLOv11 inference on BGR frames."""

    def __init__(self, model_path: str, conf_threshold: float):
        path = Path(model_path)
        if not path.exists():
            raise FileNotFoundError(
                f"YOLO model not found: {path.resolve()}\n"
                "Place Yolo11.pt in the same folder as this script."
            )
        log.info(f"Loading YOLO model: {path.resolve()}")
        self.model = YOLO(str(path))
        self.conf  = conf_threshold
        log.info("YOLO model loaded successfully.")

    def detect(self, frame: np.ndarray):
        """
        Returns:
            detections     : list of { box:[x1,y1,x2,y2], conf:float, cls:int }
            annotated_frame: BGR frame with YOLO-drawn bounding boxes
        """
        results    = self.model(frame, verbose=False)[0]
        detections = []

        for box in results.boxes:
            conf_val = float(box.conf[0])
            if conf_val >= self.conf:
                xyxy = box.xyxy[0].cpu().numpy().astype(int)
                detections.append({
                    "box":  xyxy.tolist(),
                    "conf": conf_val,
                    "cls":  int(box.cls[0]),
                })

        return detections, results.plot()


# =============================================================================
# RiskClassifier  (Random Forest)
# =============================================================================
class RiskClassifier:
    """Predicts LOW / MEDIUM / HIGH risk from a 5-element feature vector."""

    def __init__(self, model_path: str):
        path = Path(model_path)
        if not path.exists():
            raise FileNotFoundError(
                f"RF model not found: {path.resolve()}\n"
                "Place rocksense_random_forest.pkl next to this script."
            )
        log.info(f"Loading Random Forest model: {path.resolve()}")
        self.model = joblib.load(str(path))
        log.info("Random Forest model loaded successfully.")

    def predict(self, features: list) -> str:
        """
        Feature vector order (must match training):
          [avg_confidence, max_confidence, detection_count, avg_box_area, duration_s]
        """
        arr = np.array(features, dtype=float).reshape(1, -1)
        raw = self.model.predict(arr)[0]

        # Map numeric label → string  (0=HIGH, 1=MEDIUM, 2=LOW)
        if isinstance(raw, (int, np.integer)):
            return RF_LABEL_MAP.get(int(raw), "HIGH")
        return str(raw).strip().upper()


# =============================================================================
# ArduinoComm
# =============================================================================
class ArduinoComm:
    """
    State-based serial communication.
    Sends a message only when the risk STATE CHANGES to avoid flooding.
    """

    def __init__(self, port: str, baud: int):
        self.ser = None
        try:
            self.ser = serial.Serial(port, baud, timeout=1)
            time.sleep(2)            # wait for Arduino bootloader reset
            log.info(f"Arduino connected: {port} @ {baud} baud")
        except serial.SerialException as e:
            log.warning(
                f"Arduino not reachable on {port} ({e}).\n"
                "  Running without hardware alerts — detection/classification still active."
            )

    def send(self, msg: str):
        if self.ser and self.ser.is_open:
            try:
                self.ser.write(f"{msg}\n".encode())
                log.info(f"→ Arduino  [{msg}]")
            except serial.SerialException as e:
                log.error(f"Serial write error: {e}")
        else:
            log.info(f"[Serial unavailable] Would send: {msg}")

    def close(self):
        if self.ser and self.ser.is_open:
            self.ser.close()


# =============================================================================
# StabilisationWindow
# =============================================================================
class StabilisationWindow:
    """
    Accumulates YOLO detections over a configurable time window.

    Rules:
      • Detection starts  → window opens.
      • Detection disappears before window ends → window resets.
      • Detection persists for full window      → feature extraction + classification.
    """

    def __init__(self, window_secs: int = DEFAULT_STAB_SECS):
        self.window_secs     = window_secs
        self._active         = False
        self.start_time      = None
        self.confidences     = deque()
        self.box_areas       = deque()
        self.detection_count = 0

    # ── Lifecycle ────────────────────────────────────────────────────────────
    def start(self):
        self._active         = True
        self.start_time      = time.time()
        self.confidences     = deque()
        self.box_areas       = deque()
        self.detection_count = 0
        log.info("=== Stabilisation window STARTED ===")

    def reset(self):
        self._active         = False
        self.start_time      = None
        self.confidences     = deque()
        self.box_areas       = deque()
        self.detection_count = 0
        log.info("=== Stabilisation window RESET ===")

    # ── Data ingestion ───────────────────────────────────────────────────────
    def record(self, detections: list):
        for d in detections:
            self.confidences.append(d["conf"])
            x1, y1, x2, y2 = d["box"]
            self.box_areas.append(abs(x2 - x1) * abs(y2 - y1))
        self.detection_count += len(detections)

    # ── Status ───────────────────────────────────────────────────────────────
    @property
    def is_active(self) -> bool:
        return self._active

    @property
    def elapsed(self) -> float:
        return (time.time() - self.start_time) if self.start_time else 0.0

    @property
    def remaining(self) -> float:
        return max(0.0, self.window_secs - self.elapsed)

    def is_complete(self) -> bool:
        return self._active and self.elapsed >= self.window_secs

    # ── Feature extraction ───────────────────────────────────────────────────
    def extract_features(self) -> list:
        confs = list(self.confidences) or [0.0]
        areas = list(self.box_areas)   or [0.0]
        feats = [
            float(np.mean(confs)),        # avg_confidence
            float(np.max(confs)),         # max_confidence
            float(self.detection_count),  # detection_count
            float(np.mean(areas)),        # avg_box_area  (px²)
            float(self.elapsed),          # duration_s
        ]
        log.info(
            f"Features  avg_conf={feats[0]:.3f}  max_conf={feats[1]:.3f}  "
            f"count={feats[2]:.0f}  area={feats[3]:.0f}px²  dur={feats[4]:.1f}s"
        )
        return feats


# =============================================================================
# OverlayRenderer
# =============================================================================
class OverlayRenderer:
    """Draws all HUD elements onto an OpenCV frame."""

    FONT  = cv2.FONT_HERSHEY_SIMPLEX
    THICK = 2

    def __init__(self, stab_window_secs: int = DEFAULT_STAB_SECS):
        self._stab_secs = stab_window_secs

    def _text(self, frame, text, pos, scale, colour, thick=None):
        t = thick or self.THICK
        cv2.putText(frame, text, (pos[0]+1, pos[1]+1), self.FONT, scale, CLR_BLACK, t+1, cv2.LINE_AA)
        cv2.putText(frame, text,  pos,                 self.FONT, scale, colour,    t,   cv2.LINE_AA)

    def draw(self, frame, status, remaining, risk, detections):
        h, w = frame.shape[:2]

        # Status text (top-left)
        col = CLR_RED if risk == "HIGH" else (CLR_YELLOW if remaining > 0 else CLR_WHITE)
        self._text(frame, status, (10, 30), 0.75, col)

        # Bounding boxes
        for d in detections:
            x1, y1, x2, y2 = d["box"]
            bc = RISK_COLOUR.get(risk, CLR_YELLOW) if risk else CLR_YELLOW
            cv2.rectangle(frame, (x1, y1), (x2, y2), bc, 2)
            self._text(frame, f"Crack {d['conf']:.2f}", (x1, max(y1-8, 14)), 0.5, bc, 1)

        # Countdown progress bar (bottom)
        if remaining > 0 and self._stab_secs > 0:
            bar_w = int(w * (remaining / self._stab_secs))
            cv2.rectangle(frame, (0, h-20), (bar_w, h), CLR_YELLOW, -1)
            self._text(frame, f"Verifying: {remaining:.1f}s", (10, h-5), 0.5, CLR_BLACK, 1)

        # Risk badge (top-right)
        if risk:
            badge = f"Risk: {risk}"
            (tw, th), _ = cv2.getTextSize(badge, self.FONT, 1.0, self.THICK)
            col = RISK_COLOUR.get(risk, CLR_WHITE)
            cv2.rectangle(frame, (w-tw-22, 6), (w-4, 44), col, -1)
            self._text(frame, badge, (w-tw-16, 36), 1.0, CLR_BLACK)

        # Clock (bottom-right)
        ts = time.strftime("%H:%M:%S")
        (tw, _), _ = cv2.getTextSize(ts, self.FONT, 0.5, 1)
        self._text(frame, ts, (w-tw-8, h-28), 0.5, CLR_CYAN, 1)

        return frame


# =============================================================================
# Named pipeline functions
# =============================================================================

def detect_crack(frame, detector: YOLODetector):
    """Run YOLO inference and return (detections, annotated_frame)."""
    return detector.detect(frame)


def start_stabilisation(window: StabilisationWindow):
    """Begin the verification countdown."""
    window.start()


def extract_features(window: StabilisationWindow) -> list:
    """Return [avg_conf, max_conf, count, avg_area, duration_s]."""
    return window.extract_features()


def classify_risk_rf(features: list, classifier: RiskClassifier) -> str:
    """Run Random Forest and return 'LOW', 'MEDIUM', or 'HIGH'."""
    risk = classifier.predict(features)
    log.info(f"Random Forest → {risk}")
    return risk


def send_alert_to_arduino(risk: str, arduino: ArduinoComm, prev_risk) -> str:
    """Dispatch ALERT/STOP only on state change."""
    if risk == "HIGH" and prev_risk != "HIGH":
        arduino.send("ALERT")
    elif risk != "HIGH" and prev_risk == "HIGH":
        arduino.send("STOP")
    return risk


def draw_overlay(frame, renderer: OverlayRenderer, status, remaining, risk, detections):
    """Render HUD onto the frame."""
    return renderer.draw(frame, status, remaining, risk, detections)


# =============================================================================
# Main loop
# =============================================================================
def main():
    args = parse_args()

    log.info("=" * 62)
    log.info("  RockSense — Raspberry Pi Camera Edition — Starting")
    log.info("=" * 62)
    log.info(f"YOLO model : {args.yolo_model}")
    log.info(f"RF model   : {args.rf_model}")
    log.info(f"Serial port: {args.port}  baud={args.baud}")
    log.info(f"Conf thresh: {args.conf}  |  Stab window: {args.stab_time}s")
    log.info(f"Headless   : {args.headless}")
    log.info(f"Backend    : {args.backend}")
    log.info(f"picamera2  : {'available' if _PICAMERA2_AVAILABLE else 'NOT installed'}")

    # ── Subsystem Initialisation ─────────────────────────────────────────────
    try:
        camera = CameraManager(backend=args.backend)
    except RuntimeError as e:
        log.critical(e)
        sys.exit(1)

    try:
        detector = YOLODetector(args.yolo_model, args.conf)
    except FileNotFoundError as e:
        log.critical(e)
        camera.release()
        sys.exit(1)

    try:
        classifier = RiskClassifier(args.rf_model)
    except FileNotFoundError as e:
        log.critical(e)
        camera.release()
        sys.exit(1)

    arduino  = ArduinoComm(args.port, args.baud)
    window   = StabilisationWindow(window_secs=args.stab_time)
    renderer = OverlayRenderer(stab_window_secs=args.stab_time)

    # ── State ────────────────────────────────────────────────────────────────
    prev_risk       = None
    current_risk    = None
    status_text     = "Monitoring..."
    frame_idx       = 0
    last_detections = []

    if args.headless:
        log.info("Headless mode — no preview window. Press Ctrl+C to quit.")
    else:
        log.info("Entering main loop — press 'q' in the window or Ctrl+C to quit")

    try:
        while True:
            ret, frame = camera.read()
            if not ret or frame is None:
                log.warning("Frame grab failed — retrying …")
                time.sleep(0.05)
                continue

            frame_idx += 1

            # ── Skip frames for CPU relief ────────────────────────────────
            if frame_idx % FRAME_SKIP != 0:
                if not args.headless:
                    display = draw_overlay(
                        frame.copy(), renderer, status_text,
                        window.remaining, current_risk, last_detections
                    )
                    cv2.imshow("RockSense  |  Pi Camera", display)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                continue

            # ── YOLO inference ────────────────────────────────────────────
            detections, annotated = detect_crack(frame, detector)
            last_detections       = detections
            crack_present         = len(detections) > 0

            # ── State machine ─────────────────────────────────────────────
            if crack_present:
                if not window.is_active:
                    log.info(
                        f"NEW crack detected  conf={detections[0]['conf']:.2f}  "
                        "→ starting stabilisation timer"
                    )
                    start_stabilisation(window)
                    current_risk = None
                    status_text  = "Crack detected — verifying …"

                window.record(detections)
                remaining   = window.remaining
                status_text = f"Verifying ({remaining:.0f}s remaining)"
                log.debug(f"  [{window.detection_count} frames] {remaining:.1f}s left")

                if window.is_complete():
                    log.info("Stabilisation complete — running classification")
                    feats        = extract_features(window)
                    current_risk = classify_risk_rf(feats, classifier)
                    prev_risk    = send_alert_to_arduino(current_risk, arduino, prev_risk)
                    status_text  = f"Final Risk: {current_risk}"
                    log.info(f"*** RISK = {current_risk} ***")
                    window.reset()          # ready for the next event

            else:
                # No crack in this frame
                if window.is_active:
                    log.info("Detection disappeared before window ended — cancelling")
                    window.reset()
                    current_risk = None
                    if prev_risk == "HIGH":
                        arduino.send("STOP")
                    prev_risk   = None
                    status_text = "Monitoring..."
                elif current_risk is None:
                    status_text = "Monitoring..."

            # ── Render & display ──────────────────────────────────────────
            if not args.headless:
                display = draw_overlay(
                    annotated, renderer, status_text,
                    window.remaining, current_risk, detections
                )
                cv2.imshow("RockSense  |  Pi Camera", display)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    log.info("'q' pressed — exiting")
                    break
            else:
                # Headless: small sleep to prevent 100 % CPU spin on skipped frames
                time.sleep(0.01)

    except KeyboardInterrupt:
        log.info("Ctrl+C received — shutting down")

    finally:
        camera.release()
        arduino.close()
        if not args.headless:
            cv2.destroyAllWindows()
        log.info("RockSense shut down cleanly.")


if __name__ == "__main__":
    main()
