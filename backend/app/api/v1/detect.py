from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
import os
import json
import asyncio
import datetime
import aiofiles
from fastapi.responses import StreamingResponse

from app.db.session import get_db
from app.db.models import Violation, Evidence, Challan
from app.api.v1.ws import broadcast_telemetry
from ai_pipeline.detector import analyze_image, RULE_PENALTIES

router = APIRouter()

@router.post("/photo")
async def detect_photo(
    file: UploadFile | None = File(default=None),
    image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    uploaded_file = file or image
    if uploaded_file is None:
        raise HTTPException(status_code=400, detail="No image file was provided.")

    if not uploaded_file.content_type or not uploaded_file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    # Save uploaded file
    file_extension = uploaded_file.filename.split(".")[-1] if "." in uploaded_file.filename else "jpg"
    unique_id = str(uuid.uuid4())
    file_path = f"storage/{unique_id}.{file_extension}"
    
    # Read bytes for AI pipeline
    file_bytes = await uploaded_file.read()
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(file_bytes)
        
    # Process through AI pipeline with normalized bounding boxes
    ai_result = await analyze_image(file_bytes)
    image_url = f"/storage/{unique_id}.{file_extension}"
    
    if ai_result["violation_type"] != "NONE":
        # Parse penalty amount
        raw_penalty = ai_result.get("penalty_amount", "₹1,000")
        clean_amount = float(''.join(filter(str.isdigit, raw_penalty)) or 1000)

        # Persist Violation with normalized coordinates
        db_violation = Violation(
            violation_type=ai_result["violation_type"],
            confidence=ai_result["confidence"],
            plate_number=ai_result.get("plate_number"),
            plate_confidence=ai_result.get("plate_confidence"),
            bbox=json.dumps(ai_result.get("bbox")) if ai_result.get("bbox") else None,
            bbox_normalized=json.dumps(ai_result.get("bbox_normalized")) if ai_result.get("bbox_normalized") else None,
            vehicle_type=ai_result.get("vehicle_category", "TWO_WHEELER"),
            speed=ai_result.get("speed"),
            speed_limit=ai_result.get("speed_limit"),
            status="PENDING",
            lat=17.3850,
            lng=78.4867
        )
        db.add(db_violation)
        db.flush()
        
        # Persist Evidence
        db_evidence = Evidence(
            violation_id=db_violation.id,
            image_path=image_url
        )
        db.add(db_evidence)

        # Issue formal electronic Challan
        challan_num = f"CH-{datetime.datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        due_date = datetime.datetime.utcnow() + datetime.timedelta(days=15)
        challan = Challan(
            challan_number=challan_num,
            violation_id=db_violation.id,
            plate_number=ai_result.get("plate_number") or "UNKNOWN",
            vehicle_type=ai_result.get("vehicle_category", "TWO_WHEELER"),
            violation_type=ai_result["violation_type"],
            amount=clean_amount,
            penalty_code=ai_result.get("mv_section"),
            status="UNPAID",
            due_date=due_date
        )
        db.add(challan)
        db.commit()
        db.refresh(db_violation)

        # Broadcast event across WebSocket telemetry
        telemetry_payload = {
            "violation_id": db_violation.id,
            "violation_type": db_violation.violation_type,
            "plate_number": db_violation.plate_number,
            "confidence": db_violation.confidence,
            "vehicle_type": db_violation.vehicle_type,
            "speed": db_violation.speed,
            "speed_limit": db_violation.speed_limit,
            "bbox_normalized": ai_result.get("bbox_normalized"),
            "image_url": image_url,
            "challan_number": challan_num,
            "amount": clean_amount
        }
        await broadcast_telemetry("VIOLATION_DETECTED", telemetry_payload)

        return {
            "id": db_violation.id,
            "violation_type": db_violation.violation_type,
            "confidence": db_violation.confidence,
            "plate_number": db_violation.plate_number,
            "plate_confidence": db_violation.plate_confidence,
            "bbox": ai_result.get("bbox"),
            "bbox_normalized": ai_result.get("bbox_normalized"),
            "vehicle_type": db_violation.vehicle_type,
            "speed": db_violation.speed,
            "speed_limit": db_violation.speed_limit,
            "challan_number": challan_num,
            "penalty_amount": ai_result.get("penalty_amount"),
            "status": db_violation.status,
            "image_url": image_url,
            "created_at": db_violation.created_at
        }
    else:
        return {
            "id": 0,
            "violation_type": "NONE",
            "confidence": 0.0,
            "plate_number": None,
            "plate_confidence": 0.0,
            "bbox": None,
            "bbox_normalized": None,
            "status": "NONE",
            "image_url": image_url,
            "created_at": None
        }

@router.post("/video")
async def detect_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Save video file
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "mp4"
    unique_id = str(uuid.uuid4())
    file_path = f"storage/{unique_id}.{file_extension}"
    
    file_bytes = await file.read()
    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(file_bytes)
        
    async def event_generator():
        yield f"data: {json.dumps({'status': 'started', 'file': file_path})}\n\n"
        
        # Simulate processing video frames
        total_frames = 10
        for i in range(total_frames):
            await asyncio.sleep(0.8) # simulate frame processing
            
            res = await analyze_image(b"fake", delay=0.05)
            
            if res["violation_type"] != "NONE":
                clean_amount = float(''.join(filter(str.isdigit, res.get("penalty_amount", "₹1,000"))) or 1000)
                db_violation = Violation(
                    violation_type=res["violation_type"],
                    confidence=res["confidence"],
                    plate_number=res.get("plate_number"),
                    plate_confidence=res.get("plate_confidence"),
                    bbox=json.dumps(res.get("bbox")) if res.get("bbox") else None,
                    bbox_normalized=json.dumps(res.get("bbox_normalized")) if res.get("bbox_normalized") else None,
                    vehicle_type=res.get("vehicle_category", "FOUR_WHEELER"),
                    speed=res.get("speed"),
                    speed_limit=res.get("speed_limit"),
                    status="PENDING",
                    lat=17.3850 + (0.001 * i),
                    lng=78.4867
                )
                db.add(db_violation)
                db.flush()
                
                db_evidence = Evidence(
                    violation_id=db_violation.id,
                    image_path=f"/storage/{unique_id}.{file_extension}"
                )
                db.add(db_evidence)

                challan_num = f"CH-{datetime.datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
                challan = Challan(
                    challan_number=challan_num,
                    violation_id=db_violation.id,
                    plate_number=res.get("plate_number") or "UNKNOWN",
                    vehicle_type=res.get("vehicle_category", "FOUR_WHEELER"),
                    violation_type=res["violation_type"],
                    amount=clean_amount,
                    penalty_code=res.get("mv_section"),
                    status="UNPAID",
                    due_date=datetime.datetime.utcnow() + datetime.timedelta(days=15)
                )
                db.add(challan)
                db.commit()

                # Broadcast on telemetry stream
                await broadcast_telemetry("VIOLATION_DETECTED", {
                    "violation_id": db_violation.id,
                    "violation_type": db_violation.violation_type,
                    "plate_number": db_violation.plate_number,
                    "bbox_normalized": res.get("bbox_normalized"),
                    "confidence": db_violation.confidence
                })
                
                yield f"data: {json.dumps({'status': 'progress', 'progress': (i+1)/total_frames*100, 'violation': {'id': db_violation.id, 'type': res['violation_type'], 'confidence': res['confidence']}})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'progress', 'progress': (i+1)/total_frames*100})}\n\n"
                
        yield f"data: {json.dumps({'status': 'completed'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
