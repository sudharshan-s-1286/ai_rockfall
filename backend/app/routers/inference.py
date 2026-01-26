from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import DetectionEvent, RiskLevel
from app.services.yolo_service import run_yolo_inference
from app.services.risk_service import risk_service
from app.services.arduino_service import arduino_service
from app.logging_config import logger

router = APIRouter(prefix="/inference", tags=["Inference"])

@router.post("/detect")
async def detect_cracks(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    """
    Main Pipeline:
    1. Receive Image
    2. Send to YOLO Cloud
    3. Calculate Risk (RF Model)
    4. Trigger Alarm if HIGH Risk
    5. Save to DB
    """
    # Wrap entire endpoint in try/except to catch unexpected crashes
    try:
        # Read image bytes
        image_bytes = await file.read()
        
        # 1. YOLO Inference
        logger.info(f"Step 1: Sending image to YOLO (Size: {len(image_bytes)} bytes)...")
        try:
            yolo_result = await run_yolo_inference(image_bytes)
            logger.info("Step 1: YOLO Inference Complete.")
        except Exception as e:
             import traceback
             logger.error(f"Step 1 FAILED: {repr(e)}")
             logger.error(traceback.format_exc())
             # We can't proceed without detections usually, but let's try to handle gracefully or raise
             raise HTTPException(status_code=500, detail=f"AI Inference Failed: {repr(e)}")

        # 2. Risk Classification
        logger.info("Step 2: Calculating Risk...")
        risk_details = []
        try:
            risk, risk_details = risk_service.predict_risk(yolo_result, image_bytes)
            logger.info(f"Step 2: Risk Level = {risk}")
        except Exception as e:
            logger.error(f"Step 2 FAILED (Risk Service): {e}")
            risk = "LOW" # Fallback

        # Extract metadata for DB
        crack_count = 0 
        max_conf = 0.0

        try:
            # Use risk_service's robust extraction to get accurate count
            detections = risk_service._extract_detections(yolo_result)
            crack_count = len(detections)
            
            # Recalculate max_conf from verified detections
            if detections:
                # detections items usually have 'conf' or 'confidence' key depending on normalization
                # YOLOv8/11 standard: 'confidence' or 'conf' in box? 
                # Let's check a sample item structure in _extract_detections logic?
                # Actually, relying on risk_details from previous step is safest for confidence if available
                if risk_details:
                    max_conf = max([d.get('confidence', 0) for d in risk_details])
                else:
                    # Fallback to direct extraction
                    confs = []
                    for d in detections:
                        c = d.get('confidence', 0)
                        if not c: c = d.get('conf', 0)
                        confs.append(c)
                    if confs: max_conf = max(confs)

        except Exception as e:
            logger.warning(f"Metadata extraction failed: {e}")

        # 3. Trigger Alarm logic
        if risk == "HIGH":
            logger.warning("Step 3: HIGH RISK! Attempting to trigger Arduino...")
            try:
                 import asyncio
                 asyncio.create_task(arduino_service.start_alarm())
                 logger.info("Step 3: Triggered Alarm Task (Background)")
            except Exception as IoTError:
                 logger.error(f"Step 3 Failed (Non-critical): {IoTError}")
        else:
            logger.info("Step 3: Risk not HIGH, skipping alarm.")
        
        # 4. Persistence
        try:
            event = DetectionEvent(
                source="upload",
                crack_count=crack_count,
                max_confidence=max_conf,
                risk_level=risk,
                notes=f"Processed image: {file.filename}"
            )
            db.add(event)
            await db.commit()
            await db.refresh(event)
        except Exception as e:
            logger.error(f"Step 4 FAILED (Database): {e}")
            # Do not fail request just because DB failed, but log it
        
        return {
            "status": "success",
            "risk_level": risk,
            "crack_count": crack_count,
            "max_confidence": max_conf,
            "system_action": "ALARM TRIGGERED" if risk == "HIGH" else "MONITORING",
            "raw_yolo": yolo_result,
            "risk_details": risk_details
        }

    except HTTPException as he:
        raise he
    except Exception as exc:
        import traceback
        error_msg = f"CRITICAL ENDPOINT ERROR: {str(exc)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        print(error_msg) # Print to console to be sure
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(exc)}")
