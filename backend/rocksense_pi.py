#!/usr/bin/env python3
"""
=============================================================================
  RockSense — Raspberry Pi AI Rockfall Detection System
  ======================================================
  Integrates:
    • YOLOv11   (crack / hazard detection via Ultralytics)
    • Random Forest (risk classification via scikit-learn / joblib)
    • OpenCV    (camera capture + overlay UI)
    • pySerial  (Arduino mine-alert communication)

  Workflow:
    Camera ─► YOLO Detection ─► 15-sec Stabilisation ─► Feature Extraction
    ─► Random Forest ─► Risk (LOW / MEDIUM / HIGH) ─► Arduino Alert

  Usage:
    python rocksense_pi.py [--source 0] [--yolo-model best.pt]
                           [--rf-model rf_model.pkl] [--port /dev/ttyUSB0]
                           [--baud 9600] [--conf 0.5] [--stab-time 15]
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
import serial.tools.list_ports
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Logging Setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("rocksense_pi.log", mode="a"),
    ],
)
log = logging.getLogger("RockSense")

# ---------------------------------------------------------------------------
# Defaults — override via CLI or edit here
# ---------------------------------------------------------------------------
DEFAULT_SOURCE      = 0                        # 0 = USB / Pi cam; RTSP string accepted
DEFAULT_YOLO_MODEL  = "models/Yolo11.pt"       # Path to YOLOv11 weights
DEFAULT_RF_MODEL    = "models/rocksense_random_forest.pkl"
DEFAULT_PORT        = "/dev/ttyUSB0"           # Arduino serial port
DEFAULT_BAUD        = 9600
DEFAULT_CONF        = 0.5                      # Minimum YOLO confidence threshold
STABILISATION_SECS  = 15                       # Verification window in seconds
FRAME_SKIP          = 2                        # Process every N-th frame (Pi optimisation)

# ---------------------------------------------------------------------------
# Colour palette (BGR)
# ---------------------------------------------------------------------------
CLR_GREEN  = (0, 255, 100)
CLR_YELLOW = (0, 220, 255)
CLR_RED    = (0, 50, 255)
CLR_WHITE  = (255, 255, 255)
CLR_BLACK  = (0, 0, 0)
CLR_CYAN   = (255, 220, 0)

RISK_COLOUR = {
    "LOW":    CLR_GREEN,
    "MEDIUM": CLR_YELLOW,
    "HIGH":   CLR_RED,
}


# =============================================================================
# Helper: parse CLI arguments
# =============================================================================
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="RockSense — Rockfall AI Detection")
    p.add_argument("--source",     default=DEFAULT_SOURCE,     help="Camera source (0, 1, or RTSP URL)")
    p.add_argument("--yolo-model", default=DEFAULT_YOLO_MODEL, help="Path to YOLOv11 .pt weights")
    p.add_argument("--rf-model",   default=DEFAULT_RF_MODEL,   help="Path to Random Forest .pkl")
    p.add_argument("--port",       default=DEFAULT_PORT,       help="Arduino serial port")
    p.add_argument("--baud",       default=DEFAULT_BAUD,       type=int, help="Serial baud rate")
    p.add_argument("--conf",       default=DEFAULT_CONF,       type=float, help="YOLO confidence threshold")
    p.add_argument("--stab-time",  default=STABILISATION_SECS, type=int, help="Stabilisation window (s)")
    return p.parse_args()


# =============================================================================
# Module: CameraManager
# =============================================================================
class CameraManager:
    """Wraps OpenCV VideoCapture with graceful error handling."""

    def __init__(self, source):
        # Accept integer string ("0") or RTSP URL
        try:
            src = int(source)
        except (ValueError, TypeError):
            src = source

        log.info(f"Opening camera: {src}")
        self.cap = cv2.VideoCapture(src)

        if not self.cap.isOpened():
            raise RuntimeError(
                f"Cannot open camera source '{src}'. "
                "Check that the camera is connected and not in use."
            )

        # Pi-friendly resolution
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        log.info("Camera initialised: 640×480")

    def read(self):
        """Return (success, frame)."""
        return self.cap.read()

    def release(self):
        self.cap.release()
        log.info("Camera released.")


# =============================================================================
# Module: YOLODetector
# =============================================================================
class YOLODetector:
    """Loads a YOLOv11 model and runs inference on frames."""

    def __init__(self, model_path: str, conf_threshold: float = 0.5):
        path = Path(model_path)
        if not path.exists():
            raise FileNotFoundError(f"YOLO model not found: {path.resolve()}")

        log.info(f"Loading YOLO model: {path.resolve()}")
        self.model = YOLO(str(path))
        self.conf  = conf_threshold
        log.info("YOLO model loaded.")

    def detect(self, frame: np.ndarray):
        """
        Run inference on a single BGR frame.

        Returns:
            detections: list of dict {box: [x1,y1,x2,y2], conf: float, cls: int}
            annotated_frame: frame with YOLO-drawn boxes
        """
        results = self.model(frame, verbose=False)[0]
        detections = []

        for box in results.boxes:
            conf = float(box.conf[0])
            if conf >= self.conf:
                xyxy = box.xyxy[0].cpu().numpy().astype(int)
                cls  = int(box.cls[0])
                detections.append({
                    "box":  xyxy.tolist(),   # [x1, y1, x2, y2]
                    "conf": conf,
                    "cls":  cls,
                })

        annotated = results.plot()  # BGR frame with boxes
        return detections, annotated


# =============================================================================
# Module: RiskClassifier (Random Forest)
# =============================================================================
class RiskClassifier:
    """Loads a scikit-learn Random Forest model and predicts risk level."""

    LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}

    def __init__(self, model_path: str):
        path = Path(model_path)
        if not path.exists():
            raise FileNotFoundError(f"RF model not found: {path.resolve()}")

        log.info(f"Loading Random Forest model: {path.resolve()}")
        self.model = joblib.load(str(path))
        log.info("Random Forest model loaded.")

    def predict(self, features: list) -> str:
        """
        Predict risk from a feature vector.

        Feature vector:
            [avg_confidence, max_confidence, detection_count, box_area, duration_s]

        Returns: "LOW", "MEDIUM", or "HIGH"
        """
        arr = np.array(features, dtype=float).reshape(1, -1)
        raw = self.model.predict(arr)[0]

        # Handle numeric or string labels gracefully
        if isinstance(raw, (int, np.integer)):
            return self.LABELS.get(int(raw), "HIGH")
        return str(raw).upper()


# =============================================================================
# Module: ArduinoComm
# =============================================================================
class ArduinoComm:
    """Manages serial communication with the Arduino alarm board."""

    def __init__(self, port: str, baud: int):
        self.port    = port
        self.baud    = baud
        self.ser     = None
        self._connect()

    def _connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=1)
            time.sleep(2)  # Allow Arduino to reset
            log.info(f"Arduino connected on {self.port} @ {self.baud} baud")
        except serial.SerialException as e:
            log.warning(f"Arduino not available ({e}). Running without serial alerts.")
            self.ser = None

    def send(self, message: str):
        """Send a newline-terminated command to the Arduino."""
        if self.ser and self.ser.is_open:
            try:
                self.ser.write(f"{message}\n".encode("utf-8"))
                log.info(f"→ Arduino: {message}")
            except serial.SerialException as e:
                log.error(f"Serial write failed: {e}")
        else:
            log.debug(f"[No serial] Would send: {message}")

    def close(self):
        if self.ser and self.ser.is_open:
            self.ser.close()
            log.info("Serial port closed.")


# =============================================================================
# Module: StabilisationWindow
# =============================================================================
class StabilisationWindow:
    """
    Tracks crack detections over a configurable time window.

    Logic:
      • When a crack is first seen, the 15-second clock starts.
      • Every frame with a detection is recorded.
      • If detections disappear before the window ends → cancelled.
      • If detections persist throughout → `is_stable()` returns True.
    """

    def __init__(self, window_secs: int = 15):
        self.window_secs    = window_secs
        self.start_time     = None
        self.confidences    = deque()
        self.box_areas      = deque()
        self.detection_count = 0
        self._active        = False

    def start(self):
        self.start_time      = time.time()
        self.confidences     = deque()
        self.box_areas       = deque()
        self.detection_count = 0
        self._active         = True
        log.info("=== Stabilisation window STARTED ===")

    def reset(self):
        self.start_time      = None
        self._active         = False
        self.confidences     = deque()
        self.box_areas       = deque()
        self.detection_count = 0
        log.info("=== Stabilisation window RESET (detection lost) ===")

    def record(self, detections: list):
        """Feed detections from the current frame into the window."""
        if not self._active:
            return
        for d in detections:
            self.confidences.append(d["conf"])
            x1, y1, x2, y2 = d["box"]
            area = abs(x2 - x1) * abs(y2 - y1)
            self.box_areas.append(area)
        self.detection_count += len(detections)

    @property
    def is_active(self) -> bool:
        return self._active

    @property
    def elapsed(self) -> float:
        if self.start_time is None:
            return 0.0
        return time.time() - self.start_time

    @property
    def remaining(self) -> float:
        return max(0.0, self.window_secs - self.elapsed)

    def is_complete(self) -> bool:
        return self._active and self.elapsed >= self.window_secs

    def extract_features(self) -> list:
        """
        Build feature vector for the Random Forest:
          [avg_conf, max_conf, detection_count, avg_box_area, duration_s]
        """
        confs = list(self.confidences) or [0.0]
        areas = list(self.box_areas)   or [0.0]
        features = [
            float(np.mean(confs)),        # avg_confidence
            float(np.max(confs)),         # max_confidence
            float(self.detection_count),  # detection_count
            float(np.mean(areas)),        # avg_box_area (pixels²)
            float(self.elapsed),          # duration_s
        ]
        log.info(
            f"Features → avg_conf={features[0]:.3f}, max_conf={features[1]:.3f}, "
            f"count={features[2]:.0f}, area={features[3]:.0f}, dur={features[4]:.1f}s"
        )
        return features


# =============================================================================
# Module: OverlayRenderer
# =============================================================================
class OverlayRenderer:
    """Draws status and risk information onto OpenCV frames."""

    FONT       = cv2.FONT_HERSHEY_SIMPLEX
    FONT_SMALL = 0.55
    FONT_MED   = 0.75
    FONT_LARGE = 1.1
    THICK      = 2

    def _put(self, frame, text, pos, scale, colour, thick=None):
        t = thick or self.THICK
        # Black shadow for readability
        cv2.putText(frame, text, (pos[0]+1, pos[1]+1), self.FONT, scale, CLR_BLACK, t + 1, cv2.LINE_AA)
        cv2.putText(frame, text, pos,                  self.FONT, scale, colour,    t,     cv2.LINE_AA)

    def draw(
        self,
        frame:      np.ndarray,
        status:     str,
        remaining:  float,
        risk:       str | None,
        detections: list,
    ) -> np.ndarray:
        h, w = frame.shape[:2]

        # ── Status banner (top-left) ─────────────────────────────────────────
        banner_col = CLR_WHITE
        if "HIGH" in status:
            banner_col = CLR_RED
        elif "Verifying" in status or "verifying" in status:
            banner_col = CLR_YELLOW
        self._put(frame, status, (10, 30), self.FONT_MED, banner_col)

        # ── Bounding boxes (if detections passed in separately) ──────────────
        for d in detections:
            x1, y1, x2, y2 = d["box"]
            col = CLR_RED if risk == "HIGH" else CLR_YELLOW
            cv2.rectangle(frame, (x1, y1), (x2, y2), col, 2)
            label = f"Crack {d['conf']:.2f}"
            self._put(frame, label, (x1, max(y1 - 8, 14)), self.FONT_SMALL, col)

        # ── Timer bar (bottom strip) ─────────────────────────────────────────
        if remaining > 0:
            bar_w  = int(w * (remaining / STABILISATION_SECS))
            cv2.rectangle(frame, (0, h - 20), (bar_w, h), CLR_YELLOW, -1)
            self._put(frame, f"Verifying: {remaining:.1f}s", (10, h - 5),
                      self.FONT_SMALL, CLR_BLACK, 1)

        # ── Risk badge (top-right) ────────────────────────────────────────────
        if risk:
            col  = RISK_COLOUR.get(risk, CLR_WHITE)
            badge = f"Risk: {risk}"
            (tw, th), _ = cv2.getTextSize(badge, self.FONT, self.FONT_LARGE, self.THICK)
            cv2.rectangle(frame, (w - tw - 20, 8), (w - 5, 42), col, -1)
            self._put(frame, badge, (w - tw - 14, 34), self.FONT_LARGE, CLR_BLACK)

        # ── Timestamp (bottom-right) ─────────────────────────────────────────
        ts = time.strftime("%H:%M:%S")
        (tw, _), _ = cv2.getTextSize(ts, self.FONT, self.FONT_SMALL, 1)
        self._put(frame, ts, (w - tw - 8, h - 28), self.FONT_SMALL, CLR_CYAN, 1)

        return frame


# =============================================================================
# Core pipeline Functions (as required by spec)
# =============================================================================

def detect_crack(frame: np.ndarray, detector: YOLODetector):
    """
    Run YOLO on a frame.

    Returns:
        detections (list), annotated_frame (np.ndarray)
    """
    return detector.detect(frame)


def start_stabilisation(window: StabilisationWindow):
    """Initiate the 15-second verification countdown."""
    window.start()


def extract_features(window: StabilisationWindow) -> list:
    """Extract feature vector from the stabilisation window data."""
    return window.extract_features()


def classify_risk_rf(features: list, classifier: RiskClassifier) -> str:
    """Run Random Forest classification and return risk label."""
    risk = classifier.predict(features)
    log.info(f"Random Forest prediction → {risk}")
    return risk


def send_alert_to_arduino(risk: str, arduino: ArduinoComm, previous_risk: str | None) -> str:
    """
    State-based alert dispatch — avoids repeated sends.

    Sends 'ALERT' only when transitioning INTO high risk.
    Sends 'STOP'  only when transitioning OUT OF high risk.

    Returns the new previous_risk value.
    """
    if risk == "HIGH" and previous_risk != "HIGH":
        arduino.send("ALERT")
    elif risk != "HIGH" and previous_risk == "HIGH":
        arduino.send("STOP")
    return risk


def draw_overlay(
    frame: np.ndarray,
    renderer: OverlayRenderer,
    status: str,
    remaining: float,
    risk: str | None,
    detections: list,
) -> np.ndarray:
    """Render status overlay onto the frame."""
    return renderer.draw(frame, status, remaining, risk, detections)


# =============================================================================
# Main loop
# =============================================================================
def main():
    args = parse_args()

    log.info("=" * 60)
    log.info("  RockSense — Starting Up")
    log.info("=" * 60)

    # ── Load subsystems ──────────────────────────────────────────────────────
    try:
        camera     = CameraManager(args.source)
    except RuntimeError as e:
        log.critical(e)
        sys.exit(1)

    try:
        detector   = YOLODetector(args.yolo_model, conf_threshold=args.conf)
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
    renderer = OverlayRenderer()

    # ── State variables ──────────────────────────────────────────────────────
    previous_risk:  str | None = None   # Last dispatched risk label
    current_risk:   str | None = None   # Classification result
    status_text:    str        = "Monitoring..."
    frame_idx:      int        = 0
    last_detections: list      = []

    log.info("Entering main detection loop. Press 'q' to quit.")

    try:
        while True:
            ret, frame = camera.read()
            if not ret:
                log.warning("Frame grab failed — retrying...")
                time.sleep(0.1)
                continue

            frame_idx += 1

            # ── Skip frames on Pi for CPU relief ────────────────────────────
            if frame_idx % FRAME_SKIP != 0:
                # Still show the last overlay on skipped frames
                display = draw_overlay(
                    frame, renderer, status_text,
                    window.remaining, current_risk, last_detections
                )
                cv2.imshow("RockSense AI", display)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
                continue

            # ── YOLO detection ───────────────────────────────────────────────
            detections, annotated_frame = detect_crack(frame, detector)
            last_detections = detections

            crack_present = len(detections) > 0

            # ── Stabilisation state-machine ──────────────────────────────────
            if crack_present:
                if not window.is_active:
                    # New detection — start the timer
                    log.info(f"Crack detected! conf={detections[0]['conf']:.2f} — Starting stabilisation")
                    start_stabilisation(window)
                    current_risk  = None
                    status_text   = "Crack detected — verifying..."

                # Record this frame's detections and update countdown text
                window.record(detections)
                remaining = window.remaining
                status_text = f"Verifying ({remaining:.0f}s remaining)"
                log.debug(f" ↳ {window.detection_count} detections, {remaining:.1f}s left")

                # Check if stabilisation window is complete
                if window.is_complete():
                    log.info("Stabilisation complete — classifying risk")
                    features     = extract_features(window)
                    current_risk = classify_risk_rf(features, classifier)
                    previous_risk = send_alert_to_arduino(current_risk, arduino, previous_risk)
                    status_text  = f"Final Risk: {current_risk}"
                    log.info(f"=== RISK CLASSIFIED: {current_risk} ===")
                    window.reset()   # Ready for next event

            else:
                # No crack in this frame
                if window.is_active:
                    # Detection disappeared before window ended → cancel
                    log.info("Detection lost before stabilisation — cancelling")
                    window.reset()
                    current_risk = None
                    status_text  = "Monitoring..."

                    # Cancel any active alert
                    if previous_risk == "HIGH":
                        arduino.send("STOP")
                    previous_risk = None

                elif current_risk is None:
                    status_text = "Monitoring..."

            # ── Build final display frame ─────────────────────────────────────
            display = draw_overlay(
                annotated_frame, renderer, status_text,
                window.remaining, current_risk, detections
            )
            cv2.imshow("RockSense AI", display)

            # ── Keyboard exit ─────────────────────────────────────────────────
            if cv2.waitKey(1) & 0xFF == ord("q"):
                log.info("'q' pressed — shutting down")
                break

    except KeyboardInterrupt:
        log.info("Keyboard interrupt received — shutting down")

    finally:
        # ── Graceful shutdown ──────────────────────────────────────────────
        camera.release()
        arduino.close()
        cv2.destroyAllWindows()
        log.info("RockSense shut down cleanly.")


# =============================================================================
if __name__ == "__main__":
    main()
