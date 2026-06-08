import sys
try:
    import cv2
    print("cv2 OK:", cv2.__version__)
except ImportError as e:
    print("cv2 MISSING:", e)

try:
    from app.routers import camera
    print("camera router import OK")
except Exception as e:
    print("camera router import FAILED:", e)
