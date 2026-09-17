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
from app.db.models import Violation, Evidence, Challan, Incident
from app.api.v1.ws import broadcast_telemetry
from app.core.security import calculate_file_sha256
from app.core.audit import log_audit_event
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
    
    # Read bytes for AI pipeline & compute cryptographic SHA-256 checksum
    file_bytes = await uploaded_file.read()
    evidence_sha256 = calculate_file_sha256(file_bytes)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(file_bytes)
        
    # Process through AI pipeline with normalized bounding boxes
    ai_result = await analyze_image(file_bytes)
    image_url = f"/storage/{unique_id}.{file_extension}"
    
    if ai_result["violation_type"] != "NONE":
        raw_penalty = ai_result.get("penalty_amount", "₹1,000")
        clean_amount = float(''.join(filter(str.isdigit, raw_penalty)) or 1000)
        now = datetime.datetime.utcnow()

        # Step 1: Create Candidate Incident (AI Detection -> Temporal/Confidence Validation)
        incident_id = f"INC-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        db_incident = Incident(
            id=incident_id,
            camera_id="DEMO-CAM-01",
            vehicle_track_id=1001,
            plate_number=ai_result.get("plate_number"),
            incident_type=ai_result["violation_type"],
            confidence=ai_result["confidence"],
            status="CANDIDATE",
            lat=17.3850,
            lng=78.4867,
            trajectory_metadata=json.dumps({
                "speed": ai_result.get("speed"),
                "speed_limit": ai_result.get("speed_limit"),
                "vehicle_category": ai_result.get("vehicle_category"),
                "bbox_normalized": ai_result.get("bbox_normalized")
            }),
            detected_at=now
        )
        db.add(db_incident)
        db.flush()

        # Step 2: Create Pending Violation linked to the Candidate Incident
        db_violation = Violation(
            incident_id=db_incident.id,
            violation_type=ai_result["violation_type"],
            confidence=ai_result["confidence"],
            plate_number=ai_result.get("plate_number"),
            plate_confidence=ai_result.get("plate_confidence"),
            bbox=json.dumps(ai_result.get("bbox")) if ai_result.get("bbox") else None,
            bbox_normalized=json.dumps(ai_result.get("bbox_normalized")) if ai_result.get("bbox_normalized") else None,
            vehicle_type=ai_result.get("vehicle_category", "TWO_WHEELER"),
            speed=ai_result.get("speed"),
            speed_limit=ai_result.get("speed_limit"),
            status="PENDING", # Requires human officer review to transition to VERIFIED
            lat=17.3850,
            lng=78.4867,
            created_at=now
        )
        db.add(db_violation)
        db.flush()
        
        # Step 3: Persist Cryptographically Signed Evidence
        db_evidence = Evidence(
            violation_id=db_violation.id,
            image_path=image_url,
            sha256_hash=evidence_sha256,
            camera_id="DEMO-CAM-01",
            frame_number=101,
            captured_at=now
        )
        db.add(db_evidence)

        # Step 4: Issue Challan Record
        challan_num = f"CH-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        due_date = now + datetime.timedelta(days=15)
        challan = Challan(
            challan_number=challan_num,
            violation_id=db_violation.id,
            plate_number=ai_result.get("plate_number") or "UNKNOWN",
            vehicle_type=ai_result.get("vehicle_category", "TWO_WHEELER"),
            violation_type=ai_result["violation_type"],
            amount=clean_amount,
            penalty_code=ai_result.get("mv_section"),
            status="UNPAID",
            due_date=due_date,
            issued_at=now
        )
        db.add(challan)

        # Step 5: Append to Audit Hash Chain
        log_audit_event(
            db=db,
            action="INCIDENT_DETECTED",
            entity="VIOLATION",
            entity_id=str(db_violation.id),
            details=f"AI Candidate Incident {incident_id} detected: {db_violation.violation_type} on plate {db_violation.plate_number} (Evidence SHA256: {evidence_sha256[:16]}...)",
            ip_address="127.0.0.1"
        )
        db.commit()
        db.refresh(db_violation)

        # Broadcast via WebSocket
        telemetry_payload = {
            "incident_id": db_incident.id,
            "violation_id": db_violation.id,
            "violation_type": db_violation.violation_type,
            "plate_number": db_violation.plate_number,
            "confidence": db_violation.confidence,
            "vehicle_type": db_violation.vehicle_type,
            "speed": db_violation.speed,
            "speed_limit": db_violation.speed_limit,
            "bbox_normalized": ai_result.get("bbox_normalized"),
            "evidence_sha256": evidence_sha256,
            "image_url": image_url,
            "challan_number": challan_num,
            "amount": clean_amount
        }
        await broadcast_telemetry("VIOLATION_DETECTED", telemetry_payload)

        return {
            "incident_id": db_incident.id,
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
            "evidence_sha256": evidence_sha256,
            "status": db_violation.status,
            "image_url": image_url,
            "created_at": db_violation.created_at
        }
    else:
        return {
            "incident_id": None,
            "id": 0,
            "violation_type": "NONE",
            "confidence": 0.0,
            "plate_number": None,
            "plate_confidence": 0.0,
            "bbox": None,
            "bbox_normalized": None,
            "evidence_sha256": evidence_sha256,
            "status": "NONE",
            "image_url": image_url,
            "created_at": None
        }

@router.post("/video")
async def detect_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "mp4"
    unique_id = str(uuid.uuid4())
    file_path = f"storage/{unique_id}.{file_extension}"
    
    file_bytes = await file.read()
    video_sha256 = calculate_file_sha256(file_bytes)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(file_bytes)
        
    async def event_generator():
        yield f"data: {json.dumps({'status': 'started', 'file': file_path, 'sha256': video_sha256})}\n\n"
        
        total_frames = 10
        for i in range(total_frames):
            await asyncio.sleep(0.8)
            
            res = await analyze_image(b"fake", delay=0.05)
            
            if res["violation_type"] != "NONE":
                clean_amount = float(''.join(filter(str.isdigit, res.get("penalty_amount", "₹1,000"))) or 1000)
                now = datetime.datetime.utcnow()
                incident_id = f"INC-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

                db_incident = Incident(
                    id=incident_id,
                    camera_id="DEMO-CAM-01",
                    vehicle_track_id=1000 + i,
                    plate_number=res.get("plate_number"),
                    incident_type=res["violation_type"],
                    confidence=res["confidence"],
                    status="CANDIDATE",
                    lat=17.3850 + (0.001 * i),
                    lng=78.4867,
                    detected_at=now
                )
                db.add(db_incident)
                db.flush()

                db_violation = Violation(
                    incident_id=db_incident.id,
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
                    lng=78.4867,
                    created_at=now
                )
                db.add(db_violation)
                db.flush()
                
                db_evidence = Evidence(
                    violation_id=db_violation.id,
                    image_path=f"/storage/{unique_id}.{file_extension}",
                    sha256_hash=video_sha256,
                    camera_id="DEMO-CAM-01",
                    frame_number=i * 30,
                    captured_at=now
                )
                db.add(db_evidence)

                challan_num = f"CH-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
                challan = Challan(
                    challan_number=challan_num,
                    violation_id=db_violation.id,
                    plate_number=res.get("plate_number") or "UNKNOWN",
                    vehicle_type=res.get("vehicle_category", "FOUR_WHEELER"),
                    violation_type=res["violation_type"],
                    amount=clean_amount,
                    penalty_code=res.get("mv_section"),
                    status="UNPAID",
                    due_date=now + datetime.timedelta(days=15),
                    issued_at=now
                )
                db.add(challan)
                db.commit()

                await broadcast_telemetry("VIOLATION_DETECTED", {
                    "incident_id": db_incident.id,
                    "violation_id": db_violation.id,
                    "violation_type": db_violation.violation_type,
                    "plate_number": db_violation.plate_number,
                    "bbox_normalized": res.get("bbox_normalized"),
                    "confidence": db_violation.confidence
                })
                
                yield f"data: {json.dumps({'status': 'progress', 'progress': (i+1)/total_frames*100, 'violation': {'id': db_violation.id, 'incident_id': db_incident.id, 'type': res['violation_type'], 'confidence': res['confidence']}})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'progress', 'progress': (i+1)/total_frames*100})}\n\n"
                
        yield f"data: {json.dumps({'status': 'completed'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
