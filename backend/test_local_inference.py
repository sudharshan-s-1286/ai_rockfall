
import asyncio
import os
from app.services.yolo_service import run_yolo_inference
from app.services.risk_service import risk_service
from app.config import get_settings

settings = get_settings()

async def test_inference():
    print(f"Testing Local Inference...")
    print(f"YOLO Path: {settings.YOLO_PATH}")
    print(f"Keras Path: {settings.KERAS_MODEL_PATH}")
    
    # Create a dummy image
    from PIL import Image
    import io
    
    img = Image.new('RGB', (640, 480), color = 'gray')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    image_bytes = img_byte_arr.getvalue()
    
    print("1. Running YOLO Inference...")
    try:
        yolo_result = await run_yolo_inference(image_bytes)
        print("YOLO Result:", str(yolo_result)[:200])
    except Exception as e:
        print(f"YOLO Failed: {e}")
        return

    print("2. Running Risk Assessment...")
    try:
        risk, details = risk_service.predict_risk(yolo_result, image_bytes)
        print(f"Risk: {risk}")
        print(f"Details: {details}")
    except Exception as e:
        print(f"Risk Service Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_inference())
