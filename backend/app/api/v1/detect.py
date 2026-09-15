from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
import os
import json
import asyncio
import aiofiles
from fastapi.responses import StreamingResponse

from app.db.session import get_db
from app.db.models import Violation, Evidence
from ai_pipeline.detector import analyze_image

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
        
    # Process through AI mock pipeline
    ai_result = await analyze_image(file_bytes)
    
    image_url = f"/storage/{unique_id}.{file_extension}"
    
    if ai_result["violation_type"] != "NONE":
        # Persist Violation
        db_violation = Violation(
            violation_type=ai_result["violation_type"],
            confidence=ai_result["confidence"],
            plate_number=ai_result.get("plate_number"),
            plate_confidence=ai_result.get("plate_confidence"),
            bbox=json.dumps(ai_result.get("bbox")) if ai_result.get("bbox") else None,
            status="PENDING"
        )
        db.add(db_violation)
        db.commit()
        db.refresh(db_violation)
        
        # Persist Evidence
        db_evidence = Evidence(
            violation_id=db_violation.id,
            image_path=image_url
        )
        db.add(db_evidence)
        db.commit()
        
        return {
            "id": db_violation.id,
            "violation_type": db_violation.violation_type,
            "confidence": db_violation.confidence,
            "plate_number": db_violation.plate_number,
            "plate_confidence": db_violation.plate_confidence,
            "bbox": ai_result.get("bbox"),
            "status": db_violation.status,
            "image_url": image_url,
            "created_at": db_violation.created_at
        }
    else:
        # Return none result without saving to DB
        return {
            "id": 0,
            "violation_type": "NONE",
            "confidence": 0.0,
            "plate_number": None,
            "plate_confidence": 0.0,
            "bbox": None,
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
            await asyncio.sleep(1) # simulate time per frame
            
            # Analyze pseudo frame
            res = await analyze_image(b"fake", delay=0.1) # Assuming analyze_image is modified to accept delay
            
            if res["violation_type"] != "NONE":
                db_violation = Violation(
                    violation_type=res["violation_type"],
                    confidence=res["confidence"],
                    plate_number=res.get("plate_number"),
                    plate_confidence=res.get("plate_confidence"),
                    bbox=json.dumps(res.get("bbox")) if res.get("bbox") else None,
                    status="PENDING",
                    lat=17.3850 + (0.001 * i),
                    lng=78.4867
                )
                db.add(db_violation)
                db.commit()
                db.refresh(db_violation)
                
                db_evidence = Evidence(
                    violation_id=db_violation.id,
                    image_path=f"/storage/{unique_id}.{file_extension}"
                )
                db.add(db_evidence)
                db.commit()
                
                yield f"data: {json.dumps({'status': 'progress', 'progress': (i+1)/total_frames*100, 'violation': {'id': db_violation.id, 'type': res['violation_type'], 'confidence': res['confidence']}})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'progress', 'progress': (i+1)/total_frames*100})}\n\n"
                
        yield f"data: {json.dumps({'status': 'completed'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
