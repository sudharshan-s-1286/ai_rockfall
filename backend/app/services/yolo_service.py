import httpx
import json
from app.config import get_settings
from app.logging_config import logger

settings = get_settings()

async def run_yolo_inference(image_bytes: bytes):
    """
    Sends image to Ultralytics Cloud API and returns the parsed JSON response.
    """
    url = settings.YOLO_PREDICT_URL
    headers = {"x-api-key": settings.YOLO_API_KEY}
    data = {
        "model": settings.YOLO_MODEL_URL,
        "imgsz": 640,
        "conf": 0.15,
        "iou": 0.45
    }
    
    # httpx expects (filename, content, content_type) for files
    files = {"file": ("image.jpg", image_bytes, "image/jpeg")}
    
    try:
        # verify=False for hackathon context to avoid SSL certificate verify failed errors
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(url, headers=headers, data=data, files=files, timeout=60.0)
            
            if response.status_code != 200:
                logger.error(f"YOLO API Failed: {response.status_code} - {response.text}")
                response.raise_for_status()
            
            result = response.json()
            logger.info(f"YOLO API Response: {str(result)[:200]}...") # Log first 200 chars
            return result
            
    except httpx.HTTPError as e:
        logger.error(f"YOLO API Error: {str(e)}")
        if hasattr(e, 'response'):
             logger.error(f"Response content: {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in YOLO service: {str(e)}")
        raise
