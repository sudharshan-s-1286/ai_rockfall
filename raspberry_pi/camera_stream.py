# camera_stream.py
from picamera2 import Picamera2
import cv2
import base64

class CameraStream:
    def __init__(self):
        try:
            self.picam2 = Picamera2()
            self.picam2.start()
        except Exception as e:
            print(f"Error starting PiCamera: {e}")
            self.picam2 = None

    def get_frame(self):
        if not self.picam2:
            return None
        
        frame = self.picam2.capture_array()
        # Resize for performance
        frame = cv2.resize(frame, (640, 480))
        
        # Encode to JPEG
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
        # Convert to base64
        return base64.b64encode(buffer).decode('utf-8')
