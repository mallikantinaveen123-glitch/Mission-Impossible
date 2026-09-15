import uuid
import asyncio
import json
import time
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Camera, Violation, Evidence

router = APIRouter()

@router.get("")
def list_cameras(db: Session = Depends(get_db)):
    return db.query(Camera).all()

@router.get("/{id}")
def get_camera(id: str, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam

@router.post("/{id}/demo_trigger")
async def trigger_camera(
    id: str, 
    vehicle_filter: str = "ALL",
    speed_limit: float = 60.0,
    active_rules: str = "SPEEDING,NO_HELMET,TRIPLE_RIDING,NO_SEATBELT,PHONE_USAGE,RED_LIGHT,WRONG_WAY",
    db: Session = Depends(get_db)
):
    cam = db.query(Camera).filter(Camera.id == id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    from ai_pipeline.detector import TrafficAIDetector
    
    rules_list = [r.strip() for r in active_rules.split(",") if r.strip()]
    options = {
        "vehicle_filter": vehicle_filter,
        "speed_limit": speed_limit,
        "active_rules": rules_list,
        "radar_enabled": True
    }
    
    res = TrafficAIDetector.evaluate(options)
    if res.get("is_violation"):
        db_violation = Violation(
            violation_type=res["violation_type"],
            confidence=res["confidence"],
            plate_number=res.get("plate_number"),
            plate_confidence=res.get("plate_confidence"),
            bbox=json.dumps(res.get("bbox")),
            vehicle_type=res.get("vehicle_category"),
            speed=res.get("speed"),
            speed_limit=res.get("speed_limit"),
            status="PENDING",
            camera_id=cam.id,
            lat=cam.lat,
            lng=cam.lng
        )
        db.add(db_violation)
        db.commit()
        db.refresh(db_violation)
        
        # Add evidence placeholder
        evidence = Evidence(
            violation_id=db_violation.id,
            image_path=f"/storage/mock_cam_{cam.id}.jpg"
        )
        db.add(evidence)
        db.commit()
        
        res["id"] = db_violation.id
        res["status"] = db_violation.status
        return res
        
    return res

@router.post("/{id}/issue_challan")
async def issue_challan(id: str, payload: dict, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == id).first()
    lat = cam.lat if cam else 17.3850
    lng = cam.lng if cam else 78.4867
    
    db_violation = Violation(
        violation_type=payload.get("violation_type", "OVERSPEEDING"),
        confidence=payload.get("confidence", 0.92),
        plate_number=payload.get("plate_number", "TS09AB1234"),
        plate_confidence=payload.get("plate_confidence", 0.95),
        bbox=json.dumps(payload.get("bbox", [100, 100, 200, 200])),
        vehicle_type=payload.get("vehicle_type", "FOUR_WHEELER"),
        speed=payload.get("speed", 75.0),
        speed_limit=payload.get("speed_limit", 60.0),
        status="PENDING",
        camera_id=id,
        lat=lat,
        lng=lng
    )
    db.add(db_violation)
    db.commit()
    db.refresh(db_violation)
    
    evidence = Evidence(
        violation_id=db_violation.id,
        image_path=f"/storage/challan_{db_violation.id}.jpg"
    )
    db.add(evidence)
    db.commit()
    
    return {
        "success": True,
        "id": db_violation.id,
        "violation": {
            "id": db_violation.id,
            "type": db_violation.violation_type,
            "plate": db_violation.plate_number,
            "speed": db_violation.speed,
            "limit": db_violation.speed_limit,
            "vehicle_type": db_violation.vehicle_type
        }
    }

@router.websocket("/stream/{id}")
async def websocket_endpoint(websocket: WebSocket, id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    from ai_pipeline.detector import TrafficAIDetector

    # Default modular options
    current_options = {
        "vehicle_filter": "ALL",
        "speed_limit": 60.0,
        "speed_tolerance": 5.0,
        "radar_enabled": True,
        "sensitivity": 0.75,
        "active_rules": [
            "SPEEDING", "NO_HELMET", "TRIPLE_RIDING", "NO_SEATBELT", 
            "PHONE_USAGE", "RED_LIGHT", "WRONG_WAY"
        ]
    }

    # Asynchronous listener for incoming client commands
    async def command_listener():
        nonlocal current_options
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    cmd = json.loads(data)
                    action = cmd.get("action")
                    if action == "update_options":
                        opts = cmd.get("options", {})
                        current_options.update(opts)
                    elif action == "set_speed_limit":
                        current_options["speed_limit"] = float(cmd.get("limit", 60.0))
                    elif action == "set_vehicle_filter":
                        current_options["vehicle_filter"] = cmd.get("filter", "ALL")
                    elif action == "toggle_rule":
                        rule = cmd.get("rule")
                        enabled = cmd.get("enabled", True)
                        rules = set(current_options.get("active_rules", []))
                        if enabled:
                            rules.add(rule)
                        else:
                            rules.discard(rule)
                        current_options["active_rules"] = list(rules)
                except Exception as e:
                    print(f"Command parse error: {e}")
        except WebSocketDisconnect:
            pass

    listener_task = asyncio.create_task(command_listener())

    try:
        while True:
            # Generate accurate frame evaluation
            detection = TrafficAIDetector.evaluate(current_options)
            
            payload = {
                "timestamp": int(time.time() * 1000),
                "camera_id": id,
                "detection": detection,
                "options": current_options,
                "type": "frame_update"
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1.8) # Send frame telemetry every 1.8 seconds
    except WebSocketDisconnect:
        listener_task.cancel()
        print(f"Client disconnected from camera {id} stream")
    except Exception as ex:
        listener_task.cancel()
        print(f"Stream exception: {ex}")
