"""
camera.py — Live Camera Streaming & Detection Log Router
Provides MJPEG streaming from webcam or RTSP source, plus detection history.
"""

import os
import cv2
from pymongo import DESCENDING
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models import AIDetection

router = APIRouter(prefix="/api/camera", tags=["Camera"])

# Camera source: default to webcam (0), override with env var for RTSP
CAMERA_SOURCE = os.environ.get("CAMERA_SOURCE", 0)
try:
    CAMERA_SOURCE = int(CAMERA_SOURCE)
except (ValueError, TypeError):
    pass  # Keep as string for RTSP URLs


_STREAM_ACTIVE = False

def _generate_frames():
    global _STREAM_ACTIVE
    """
    Generator that opens a camera (webcam or RTSP) via OpenCV and yields
    JPEG-encoded frames as multipart MJPEG chunks.
    Falls back gracefully if the camera cannot be opened.
    """
    cap = cv2.VideoCapture(CAMERA_SOURCE)

    if not cap.isOpened():
        # Yield a blank placeholder frame so the stream doesn't crash
        import numpy as np
        blank = np.zeros((480, 640, 3), dtype="uint8")
        cv2.putText(blank, "CAMERA OFFLINE", (140, 240),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 120), 3)
        success, buffer = cv2.imencode(".jpg", blank)
        frame_bytes = buffer.tobytes()
        while True:
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")

    _STREAM_ACTIVE = True
    try:
        while True:
            success, frame = cap.read()
            if not success:
                break

            success, buffer = cv2.imencode(".jpg", frame)
            if not success:
                continue

            frame_bytes = buffer.tobytes()
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
    finally:
        _STREAM_ACTIVE = False
        cap.release()


@router.get("/stream")
def live_stream():
    """
    GET /api/camera/stream
    Returns a streaming MJPEG response. Render in frontend via:
        <img src="http://localhost:8000/api/camera/stream" />
    """
    return StreamingResponse(
        _generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/status")
def camera_status():
    global _STREAM_ACTIVE
    """
    GET /api/camera/status
    Checks whether the camera source can be opened and returns its type.
    """
    source_type = "webcam" if isinstance(CAMERA_SOURCE, int) else "rtsp"
    
    # If the stream is active, we know it's working (avoids lock conflicts)
    if _STREAM_ACTIVE:
        return {"active": True, "source": source_type, "uri": str(CAMERA_SOURCE)}
        
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    active = cap.isOpened()
    cap.release()
    return {"active": active, "source": source_type, "uri": str(CAMERA_SOURCE)}


@router.get("/detections")
async def get_detections():
    """
    GET /api/camera/detections
    Returns the 20 most recent AIDetection records for the live log panel.
    """
    records = await (
        AIDetection.find_all()
        .sort([("timestamp", DESCENDING)])
        .limit(20)
        .to_list()
    )
    return [
        {
            "id": str(r.id),
            "device_id": r.device_id,
            "risk_level": r.risk_level,
            "confidence": r.confidence,
            "crack_coordinates": r.crack_coordinates,
            "is_stable": r.is_stable,
            "timestamp": r.timestamp.isoformat(),
        }
        for r in records
    ]
