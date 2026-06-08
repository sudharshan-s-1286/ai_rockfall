import io
from PIL import Image
from ultralytics import YOLO
from app.config import get_settings
from app.logging_config import logger

settings = get_settings()

class YoloService:
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        try:
            logger.info(f"Loading Local YOLO Model from: {settings.YOLO_PATH}")
            self.model = YOLO(settings.YOLO_PATH)
            logger.info("Local YOLO Model Loaded Successfully.")
        except Exception as e:
            logger.error(f"Failed to load local YOLO model: {e}")
            self.model = None

    async def run_yolo_inference(self, image_bytes: bytes):
        """
        Runs inference on the local YOLO model.
        Returns a dict structure similar to what the API returned to maintain compatibility.
        """
        if not self.model:
            logger.error("YOLO Model is not loaded.")
            raise RuntimeError("YOLO Model not loaded")

        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Predict
            results = self.model.predict(image, conf=0.15, iou=0.45)
            
            # Parse results to match previous API format (approximate)
            # The previous API returned:
            # { "images": [ { "results": [ { "box": {...}, "name": "...", "confidence": ... } ] } ] }
            # Or similar. Let's make it easy to consume.
            
            detections = []
            for r in results:
                for box in r.boxes:
                    b = box.xyxy[0].tolist() # [x1, y1, x2, y2]
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    name = self.model.names[cls_id]
                    
                    detections.append({
                        "box": {
                            "x1": b[0],
                            "y1": b[1],
                            "x2": b[2],
                            "y2": b[3]
                        },
                        "name": name,
                        "confidence": conf,
                        "class": cls_id
                    })
            
            # Construct a compatible response wrapper
            return {
                "images": [
                    {
                        "results": detections
                    }
                ],
                "data": detections # Redundant but safe for both parsers
            }

        except Exception as e:
            logger.error(f"Local YOLO Inference Error: {e}")
            raise

# Create singleton instance
_service = YoloService()

async def run_yolo_inference(image_bytes: bytes):
    return await _service.run_yolo_inference(image_bytes)
