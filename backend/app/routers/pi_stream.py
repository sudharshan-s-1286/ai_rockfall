"""
=============================================================================
  RockSense — Backend Pi Stream Router
  =====================================
  Endpoints:
    WS  /ws/pi-frame     — Receives frames + streams them; Runs YOLO11 +
                           15-second temporal sliding window validation;
                           Sends confirmed detections BACK to Pi;
                           Broadcasts frames + status to frontend.

    WS  /ws/live-feed    — Frontend clients subscribe for live video + status.

    GET /api/pi-stream/status    — Pi connection status, FPS, last seen.
    GET /api/pi-stream/snapshot  — Latest JPEG frame as HTTP response.
    GET /api/pi-stream/mjpeg     — MJPEG fallback for <img> embeds.
    GET /api/pi-stream/detections — Detection history (last 50).

  Data Flow:
    Pi WebSocket → _receive_pi_frame()
        → YOLO11 inference
        → SlidingWindowBuffer (15s)
        → if confirmed: send result BACK to Pi + broadcast to frontend
        → always: broadcast frame to frontend for live view

=============================================================================
"""

import asyncio
import base64
import json
import logging
import time
from collections import deque
from datetime import datetime, timezone
from threading import Lock
from typing import List, Optional

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, StreamingResponse

# ── YOLO (optional — only if ultralytics installed and model present) ─────
try:
    from ultralytics import YOLO as _YOLO
    _YOLO_AVAILABLE = True
except ImportError:
    _YOLO_AVAILABLE = False

log = logging.getLogger("RockSense-Backend")

router = APIRouter(prefix="", tags=["Pi Stream"])

from app.config import get_settings
settings = get_settings()

# ── Configuration ─────────────────────────────────────────────────────────
YOLO_MODEL_PATH     = settings.YOLO_PATH
YOLO_CONF_THRESHOLD = 0.45
JPEG_QUALITY        = 70                   # Re-encode quality for MJPEG fallback
STAB_WINDOW_SECS    = 15.0                 # Temporal validation window
CONFIRM_THRESHOLD   = 0.60                 # >60% frames with crack → confirmed
MAX_HISTORY         = 50                   # Max detection history entries

from app.services.risk_service import risk_service


# =============================================================================
# YOLO Detector (runs on backend/laptop)
# =============================================================================
class YOLODetector:
    """
    Wraps YOLOv11 (ultralytics) for crack detection.
    Falls back gracefully if model file or library is not available.
    """

    def __init__(self, model_path: str, conf: float = YOLO_CONF_THRESHOLD):
        self.model      = None
        self.conf       = conf
        self.available  = False
        self._load(model_path)

    def _load(self, path: str):
        if not _YOLO_AVAILABLE:
            log.warning("ultralytics not installed — YOLO disabled (placeholder mode)")
            return
        import os
        if not os.path.exists(path):
            log.warning(f"YOLO model not found at '{path}' — placeholder mode active")
            return
        try:
            log.info(f"Loading YOLO model: {path}")
            self.model     = _YOLO(path)
            self.available = True
            
            # WARMUP inference to eliminate first-frame lag
            log.info("Warming up YOLO model...")
            dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            self.model(dummy_frame, verbose=False)
            log.info("YOLO model loaded and warmed up successfully.")
        except Exception as e:
            log.error(f"YOLO load error: {e}")

    def detect(self, frame_bgr: np.ndarray) -> list:
        """
        Run inference on a BGR frame (YOLO -> Keras).
        Returns list of: {class_name, confidence, bbox:[x1,y1,x2,y2], severity}
        """
        if not self.available or self.model is None:
            return []

        # 1. YOLO Detection (Ensure verbose=True to show logs in CMD as requested)
        results = self.model(frame_bgr, verbose=True)[0]
        yolo_detections = []
        for box in results.boxes:
            conf_val = float(box.conf[0])
            if conf_val >= self.conf:
                xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                cls_id = int(box.cls[0])
                cls_name = results.names.get(cls_id, str(cls_id))
                yolo_detections.append({
                    "class":      cls_name,
                    "confidence": round(conf_val, 4),
                    "bbox":       xyxy,
                })

        if not yolo_detections:
            return []

        # 2. Risk Classification (Keras through risk_service)
        # Convert BGR to JPEG bytes for risk_service compatibility
        _, buffer = cv2.imencode(".jpg", frame_bgr)
        image_bytes = buffer.tobytes()
        
        # risk_service expects yolo_result in a specific format
        yolo_result_fmt = {"images": [{"results": [{"box": {"x1": d["bbox"][0], "y1": d["bbox"][1], "x2": d["bbox"][2], "y2": d["bbox"][3]}, "confidence": d["confidence"]} for d in yolo_detections]}]}
        
        try:
            final_risk, risk_details = risk_service.predict_risk(yolo_result_fmt, image_bytes)
            
            # Enrich detections with Keras results
            for i, det in enumerate(yolo_detections):
                if i < len(risk_details):
                    det["severity"] = risk_details[i]["label"]
                    det["confidence"] = round(risk_details[i]["confidence"], 4)
                else:
                    det["severity"] = "LOW"
            return yolo_detections
        except Exception as e:
            log.error(f"Keras integrated risk check failed: {e}")
            return yolo_detections


# =============================================================================
# 15-Second Temporal Sliding Window
# =============================================================================
class SlidingWindowBuffer:
    """
    Maintains a rolling 15-second buffer of per-frame detection results.

    Decision rule:
        If crack was detected in MORE THAN confirm_threshold (60%) of frames
        within the last 15 seconds → crack is CONFIRMED.

    Features extracted for Random Forest (sent back to Pi):
        avg_confidence      — mean detection confidence across window
        max_confidence      — peak confidence
        detection_frequency — fraction of frames with a detection
        avg_bbox_area       — average bounding box area (px²)
        persistence_duration — seconds since first detection in window
    """

    def __init__(self, window_secs: float = STAB_WINDOW_SECS,
                 threshold: float = CONFIRM_THRESHOLD):
        self.window_secs     = window_secs
        self.threshold       = threshold
        # Each entry: (timestamp, detections_list)
        self._buffer: deque  = deque()
        self._lock           = Lock()
        self._first_detect_t: Optional[float] = None

    def push(self, detections: list):
        """Add a new frame's detections to the buffer."""
        now = time.time()
        with self._lock:
            self._buffer.append((now, detections))
            # Track when we first saw a detection in this window
            if detections and self._first_detect_t is None:
                self._first_detect_t = now
            # Evict entries older than window
            self._evict(now)
            # If no detections in window, reset first-detect time
            if not any(d for _, d in self._buffer):
                self._first_detect_t = None

    def _evict(self, now: float):
        cutoff = now - self.window_secs
        while self._buffer and self._buffer[0][0] < cutoff:
            self._buffer.popleft()

    def is_confirmed(self) -> bool:
        """Returns True if crack persists above the threshold in the window."""
        with self._lock:
            if len(self._buffer) < 2:
                return False
            frames_with_crack = sum(1 for _, d in self._buffer if d)
            ratio = frames_with_crack / len(self._buffer)
            return ratio >= self.threshold

    def extract_features(self) -> dict:
        """Extract statistical features from the window."""
        with self._lock:
            all_detections = [d for _, dlist in self._buffer for d in dlist]
            total_frames   = len(self._buffer)
            frames_with_crack = sum(1 for _, d in self._buffer if d)

            if not all_detections:
                return {
                    "avg_confidence":      0.0,
                    "max_confidence":      0.0,
                    "detection_frequency": 0.0,
                    "persistence_duration": 0.0,
                    "risk_level":          "LOW"
                }

            confs = [d["confidence"] for d in all_detections]
            severities = [d.get("severity", "LOW") for d in all_detections]
            
            # Peak severity logic
            final_risk = "LOW"
            if "HIGH" in severities: final_risk = "HIGH"
            elif "MEDIUM" in severities: final_risk = "MEDIUM"
            
            now = time.time()
            duration = (now - self._first_detect_t) if self._first_detect_t else 0.0

            return {
                "avg_confidence":       round(float(np.mean(confs)), 4),
                "max_confidence":       round(float(np.max(confs)),  4),
                "detection_frequency":  round(frames_with_crack / max(total_frames, 1), 4),
                "persistence_duration": round(duration, 2),
                "risk_level":           final_risk
            }

    def latest_detections(self) -> list:
        """Return detections from the most recent frame."""
        with self._lock:
            for _, dlist in reversed(self._buffer):
                if dlist:
                    return dlist
            return []

    def reset(self):
        with self._lock:
            self._buffer.clear()
            self._first_detect_t = None

    @property
    def frame_count(self) -> int:
        with self._lock:
            return len(self._buffer)

    @property
    def detection_ratio(self) -> float:
        with self._lock:
            if not self._buffer:
                return 0.0
            return sum(1 for _, d in self._buffer if d) / len(self._buffer)

    def get_elapsed_time(self) -> float:
        with self._lock:
            if not self._first_detect_t: return 0.0
            return time.time() - self._first_detect_t


# =============================================================================
# Frame Buffer — latest JPEG for HTTP snapshot / MJPEG
# =============================================================================
class FrameBuffer:
    """Thread-safe store for the latest JPEG bytes from the Pi."""

    def __init__(self):
        self._jpeg:      Optional[bytes] = None
        self._timestamp: Optional[str]   = None
        self._lock       = Lock()
        self.fps: float  = 0.0
        self._frame_times: deque = deque(maxlen=30)

    def update(self, jpeg_bytes: bytes, timestamp: str):
        with self._lock:
            self._jpeg      = jpeg_bytes
            self._timestamp = timestamp
            now = time.time()
            self._frame_times.append(now)
            # Rolling FPS calculation over last 10 frames
            if len(self._frame_times) >= 2:
                span = self._frame_times[-1] - self._frame_times[0]
                if span > 0:
                    self.fps = round((len(self._frame_times) - 1) / span, 1)

    def get_jpeg(self) -> Optional[bytes]:
        with self._lock:
            return self._jpeg

    def get_timestamp(self) -> Optional[str]:
        with self._lock:
            return self._timestamp


# =============================================================================
# Connection Managers
# =============================================================================
class PiConnectionManager:
    """Manages the single Raspberry Pi WebSocket connection."""

    def __init__(self):
        self._ws:         Optional[WebSocket] = None
        self._connected:  bool  = False
        self.last_seen:   float = 0.0
        self.device_id:   str   = "unknown"

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._ws        = ws
        self._connected = True
        self.last_seen  = time.time()
        log.info("Raspberry Pi connected")

    def disconnect(self):
        self._ws        = None
        self._connected = False
        log.info("Raspberry Pi disconnected")

    @property
    def is_connected(self) -> bool:
        return self._connected

    async def send(self, data: dict):
        """Send a JSON message back to the Pi."""
        if self._ws and self._connected:
            try:
                await self._ws.send_text(json.dumps(data))
            except Exception as e:
                log.error(f"Error sending to Pi: {e}")
                self.disconnect()

    def heartbeat(self):
        self.last_seen = time.time()


class FrontendConnectionManager:
    """Manages multiple frontend browser WebSocket connections."""

    def __init__(self):
        self._connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._connections.append(ws)
        log.info(f"Frontend client connected (total: {len(self._connections)})")

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self._connections:
                self._connections.remove(ws)
        log.info(f"Frontend client disconnected (remaining: {len(self._connections)})")

    async def broadcast(self, data: dict):
        """Broadcast JSON to all connected frontend clients."""
        if not self._connections:
            return
        msg = json.dumps(data)
        dead = []
        for ws in list(self._connections):
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)


# Shared State (singletons for Pi and Laptop)
yolo_detector      = YOLODetector(YOLO_MODEL_PATH)
frame_buffer       = FrameBuffer()
pi_manager         = PiConnectionManager()
frontend_manager   = FrontendConnectionManager()
detection_history  = deque(maxlen=MAX_HISTORY)

# Multi-source tracking
class ProcessorContext:
    def __init__(self, name: str):
        self.name = name
        self.sliding_window = SlidingWindowBuffer(STAB_WINDOW_SECS, CONFIRM_THRESHOLD)
        self.last_confirmed = False
        self.confirmed_at   = 0.0

pi_ctx     = ProcessorContext("Raspberry Pi")
laptop_ctx = ProcessorContext("Laptop")

_RECONFIRM_INTERVAL  = 10.0


# =============================================================================
# Blank frame generator (Pi offline)
# =============================================================================
def _offline_frame() -> bytes:
    blank = np.zeros((480, 640, 3), dtype="uint8")
    cv2.putText(blank, "PI CAMERA OFFLINE", (100, 220),
                cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 100, 255), 3)
    cv2.putText(blank, "Waiting for connection ...", (130, 265),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
    _, buf = cv2.imencode(".jpg", blank)
    return buf.tobytes()


def _decode_and_yolo(raw_b64: str, timestamp: str, ctx: ProcessorContext):
    """
    SYNCHRONOUS — safe to call from executor thread.
    Decodes JPEG → runs YOLO+Keras → pushes to sliding window.
    """
    # Decode base64 JPEG
    try:
        jpeg_bytes = base64.b64decode(raw_b64)
        arr        = np.frombuffer(jpeg_bytes, dtype=np.uint8)
        frame      = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            return None, [], 0.0, 0, False
    except Exception as e:
        log.error(f"Frame decode error: {e}")
        return None, [], 0.0, 0, False

    # Inference (YOLO + Keras)
    detections = yolo_detector.detect(frame)

    # Push to sliding window
    ctx.sliding_window.push(detections)

    ratio     = ctx.sliding_window.detection_ratio
    n_frames  = ctx.sliding_window.frame_count
    confirmed = ctx.sliding_window.is_confirmed() and n_frames >= 5

    return jpeg_bytes, detections, ratio, n_frames, confirmed

async def _process_frame(raw_b64: str, timestamp: str, ctx: ProcessorContext, source_type: str):
    """
    ASYNC — Orchestrates AI processing and broadcasting.
    """
    # Run CPU work in thread pool
    loop = asyncio.get_event_loop()
    jpeg_bytes, detections, ratio, n_frames, confirmed = await loop.run_in_executor(
        None, _decode_and_yolo, raw_b64, timestamp, ctx
    )

    if jpeg_bytes is None:
        return [], "DECODING_ERROR", False, 0.0

    # Update global buffer only for Pi (for legacy HTTP fallback support)
    if source_type == "pi":
        frame_buffer.update(jpeg_bytes, timestamp)

    now = time.time()
    
    # Check for confirmation transition
    if confirmed and (not ctx.last_confirmed or (now - ctx.confirmed_at) > _RECONFIRM_INTERVAL):
        features = ctx.sliding_window.extract_features()
        latest   = ctx.sliding_window.latest_detections()
        
        # If Pi confirmed -> notify hardware
        if source_type == "pi":
            await pi_manager.send({
                "type": "detection_confirmed",
                "detections": latest,
                "features": features,
                "ratio": round(ratio, 2)
            })
            if features.get("risk_level") == "HIGH":
                from app.services.arduino_service import arduino_service
                await arduino_service.start_alarm()

        ctx.confirmed_at  = now
        ctx.last_confirmed = True
        
        # Log to history
        detection_history.append({
            "source": source_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "confirmed": True,
            "detections": latest,
            "risk_level": features.get("risk_level", "LOW")
        })

    elif ctx.last_confirmed and not confirmed and ratio < 0.1:
        ctx.last_confirmed = False
        ctx.sliding_window.reset()

    # Build status string
    if confirmed:
        status = "CRACK_CONFIRMED"
    elif ctx.sliding_window.get_elapsed_time() > 0:
        pct = int(ratio * 100)
        remaining = 15 - int(ctx.sliding_window.get_elapsed_time())
        status = f"VERIFYING ({max(0, remaining)}s)"
    else:
        status = "SAFE"

    return detections, status, confirmed, ratio


# =============================================================================
# WebSocket: Raspberry Pi Receiver
# =============================================================================
@router.websocket("/ws/pi-frame")
async def pi_frame_receiver(websocket: WebSocket):
    """
    Receives camera frames from the Raspberry Pi.
    Runs YOLO11, applies 15-second temporal validation,
    sends confirmed results BACK to Pi.
    Simultaneously broadcasts frames + status to frontend.
    """
    await pi_manager.connect(websocket)
    try:
        async for raw_msg in websocket.iter_text():
            pi_manager.heartbeat()
            try:
                data = json.loads(raw_msg)
                if data.get("type") != "frame":
                    continue

                b64_frame = data.get("frame", "")
                timestamp = data.get("timestamp", datetime.now(timezone.utc).isoformat())
                if not b64_frame:
                    continue

                # Broadcast to frontend
                detections, status, confirmed, ratio = await _process_frame(b64_frame, timestamp, pi_ctx, "pi")

                await frontend_manager.broadcast({
                    "type":       "pi_frame",
                    "timestamp":  timestamp,
                    "frame":      b64_frame,
                    "detections": detections,
                    "status":     status,
                    "confirmed":  confirmed,
                    "ratio":      round(ratio, 2),
                    "countdown":  max(0, 15 - int(pi_ctx.sliding_window.get_elapsed_time()))
                })

            except json.JSONDecodeError:
                log.warning("Non-JSON message from Pi — ignoring")
            except Exception as e:
                log.error(f"Frame processing error: {e}")

    except WebSocketDisconnect:
        log.info("Pi WebSocket disconnected")
    finally:
        pi_manager.disconnect()
        # Notify frontend Pi is offline
        await frontend_manager.broadcast({
            "type":    "pi_disconnected",
            "message": "Raspberry Pi camera disconnected",
        })

@router.websocket("/ws/laptop-frame")
async def laptop_frame_receiver(websocket: WebSocket):
    """
    Receives camera frames from the Frontend (Laptop).
    """
    await websocket.accept()
    try:
        async for raw_msg in websocket.iter_text():
            try:
                data = json.loads(raw_msg)
                b64_frame = data.get("frame", "")
                timestamp = data.get("timestamp", "")
                
                detections, status, confirmed, ratio = await _process_frame(b64_frame, timestamp, laptop_ctx, "laptop")
                
                result_payload = {
                    "type":       "laptop_frame_result",
                    "detections": detections,
                    "status":     status,
                    "confirmed":  confirmed,
                    "ratio":      round(ratio, 4),
                    "countdown":  max(0, 15 - int(laptop_ctx.sliding_window.get_elapsed_time()))
                }
                
                # Broadcast to all other listeners (Pi monitor etc)
                await frontend_manager.broadcast(result_payload)
                
                # ALSO send directly back to the laptop sender so it can render locally
                await websocket.send_text(json.dumps(result_payload))

            except Exception as e:
                log.error(f"Laptop frame error: {e}")
    except WebSocketDisconnect:
        pass

# =============================================================================
# WebSocket: Frontend Live Feed
# =============================================================================
@router.websocket("/ws/live-feed")
async def frontend_live_feed(websocket: WebSocket):
    """
    Frontend clients connect here to receive:
      - Live JPEG frames (base64)
      - Detection status + bounding boxes
      - Risk level + confirmation state
    """
    await frontend_manager.connect(websocket)
    try:
        # Send current status immediately on connect
        await websocket.send_text(json.dumps({
            "type":      "status",
            "pi_online": pi_manager.is_connected,
            "yolo_available": yolo_detector.available,
            "risk_engine_ready": risk_service.model is not None,
            "message":   "Connected to RockSense backend",
        }))
        # Keep alive — frontend doesn't send data, just listens
        while True:
            await asyncio.sleep(30)  # Heartbeat interval
            await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await frontend_manager.disconnect(websocket)


# =============================================================================
# HTTP Endpoints
# =============================================================================
@router.get("/api/pi-stream/status")
async def stream_status():
    """Returns the current Pi streaming status."""
    offline_secs = round(time.time() - pi_manager.last_seen, 1) if pi_manager.last_seen else None
    return {
        "pi_connected":         pi_manager.is_connected,
        "offline_seconds":      offline_secs,
        "server_fps":           frame_buffer.fps,
        "last_frame_timestamp": frame_buffer.get_timestamp(),
        "yolo_available":       yolo_detector.available,
        "window_seconds":       STAB_WINDOW_SECS,
        "confirm_threshold":    CONFIRM_THRESHOLD,
        "current_ratio":        round(sliding_window.detection_ratio, 2),
        "detection_confirmed":  _last_confirmed_state,
        "frontend_clients":     len(frontend_manager._connections),
    }


@router.get("/api/pi-stream/snapshot")
async def snapshot():
    """Returns the latest camera frame as a JPEG image."""
    jpeg = frame_buffer.get_jpeg()
    if jpeg is None:
        jpeg = _offline_frame()
    return Response(content=jpeg, media_type="image/jpeg")


@router.get("/api/pi-stream/mjpeg")
async def mjpeg_stream():
    """
    MJPEG fallback stream — use as:
        <img src="http://laptop_ip:8000/api/pi-stream/mjpeg" />
    """
    async def generate():
        while True:
            jpeg = frame_buffer.get_jpeg()
            if jpeg is None:
                jpeg = _offline_frame()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
            )
            await asyncio.sleep(1.0 / 15)   # Max 15 FPS for MJPEG clients

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/api/pi-stream/detections")
async def detection_log():
    """Returns the last 50 confirmed detection events."""
    return list(reversed(list(detection_history)))


@router.get("/api/pi-stream/reload-models")
async def reload_models():
    """Force re-load of YOLO and Keras models from settings paths."""
    global yolo_detector
    try:
        from app.services.risk_service import risk_service
        yolo_detector = YOLODetector(settings.YOLO_PATH)
        risk_service._load_resources()
        return {
            "status": "success", 
            "yolo_online": yolo_detector.available,
            "keras_online": risk_service.model is not None
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/api/pi-stream/reset-window")
async def reset_window():
    """Force-reset the sliding window (admin/debug use)."""
    pi_ctx.sliding_window.reset()
    laptop_ctx.sliding_window.reset()
    return {"message": "Sliding windows reset"}
