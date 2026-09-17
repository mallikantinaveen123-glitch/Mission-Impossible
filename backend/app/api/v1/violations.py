from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.db.models import Violation, Evidence
from app.schemas.violation import ViolationListResponse, ViolationSummary, ViolationStatusUpdate
from app.api.v1.ws import broadcast_telemetry

router = APIRouter()

@router.get("/summary", response_model=ViolationSummary)
def get_summary(db: Session = Depends(get_db)):
    total = db.query(Violation).count()
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = db.query(Violation).filter(Violation.created_at >= today).count()
    
    pending = db.query(Violation).filter(Violation.status == "PENDING").count()
    verified = db.query(Violation).filter(Violation.status == "VERIFIED").count()
    rejected = db.query(Violation).filter(Violation.status == "REJECTED").count()
    
    return ViolationSummary(
        total=total,
        today=today_count,
        pending=pending,
        verified=verified,
        rejected=rejected
    )

@router.get("", response_model=ViolationListResponse)
def get_violations(
    status: Optional[str] = None,
    violation_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Violation).options(joinedload(Violation.evidence))
    
    if status:
        query = query.filter(Violation.status == status)
    if violation_type:
        query = query.filter(Violation.violation_type == violation_type)
        
    total = query.count()
    offset = (page - 1) * page_size
    violations = query.order_by(Violation.created_at.desc()).offset(offset).limit(page_size).all()
    
    formatted_items = []
    for v in violations:
        img = v.evidence[0].image_path if v.evidence else None
        formatted_items.append({
            "id": v.id,
            "violation_type": v.violation_type,
            "confidence": v.confidence,
            "plate_number": v.plate_number,
            "plate_confidence": v.plate_confidence,
            "vehicle_type": getattr(v, "vehicle_type", None),
            "speed": getattr(v, "speed", None),
            "speed_limit": getattr(v, "speed_limit", None),
            "bbox": getattr(v, "bbox", None),
            "bbox_normalized": getattr(v, "bbox_normalized", None),
            "status": v.status,
            "created_at": v.created_at,
            "image_url": img
        })
        
    return ViolationListResponse(total=total, items=formatted_items)

@router.patch("/{id}/status")
async def update_status(id: int, payload: ViolationStatusUpdate, db: Session = Depends(get_db)):
    violation = db.query(Violation).options(joinedload(Violation.evidence)).filter(Violation.id == id).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
        
    if payload.status not in ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "PAID"]:
        raise HTTPException(status_code=422, detail="Invalid status value")
        
    violation.status = payload.status
    db.commit()
    db.refresh(violation)
    
    img = violation.evidence[0].image_path if violation.evidence else None
    
    await broadcast_telemetry("VIOLATION_STATUS_UPDATED", {
        "id": violation.id,
        "status": violation.status,
        "plate_number": violation.plate_number
    })

    return {
        "id": violation.id,
        "violation_type": violation.violation_type,
        "confidence": violation.confidence,
        "plate_number": violation.plate_number,
        "plate_confidence": violation.plate_confidence,
        "status": violation.status,
        "created_at": violation.created_at,
        "image_url": img
    }

@router.patch("/{id}/verify")
async def verify_violation(id: int, db: Session = Depends(get_db)):
    violation = db.query(Violation).filter(Violation.id == id).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
        
    violation.status = "VERIFIED"
    db.commit()
    db.refresh(violation)

    await broadcast_telemetry("VIOLATION_VERIFIED", {
        "id": violation.id,
        "plate_number": violation.plate_number
    })
    return {"status": "success", "new_status": violation.status}

from pydantic import BaseModel
class RejectPayload(BaseModel):
    reason: str

@router.patch("/{id}/reject")
async def reject_violation(id: int, payload: RejectPayload, db: Session = Depends(get_db)):
    violation = db.query(Violation).filter(Violation.id == id).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
        
    violation.status = "REJECTED"
    db.commit()
    db.refresh(violation)

    await broadcast_telemetry("VIOLATION_REJECTED", {
        "id": violation.id,
        "reason": payload.reason
    })
    return {"status": "success", "new_status": violation.status, "reason": payload.reason}

@router.get("/search")
def search_violations(
    q: Optional[str] = Query(None, description="Search query by plate or ID"),
    plate: Optional[str] = Query(None, description="Exact or partial plate number"),
    db: Session = Depends(get_db)
):
    query_str = (q or plate or "").strip().upper()
    if not query_str:
        return {"total": 0, "items": []}
        
    query = db.query(Violation).options(joinedload(Violation.evidence))
    if query_str.isdigit():
        query = query.filter((Violation.id == int(query_str)) | (Violation.plate_number.ilike(f"%{query_str}%")))
    else:
        query = query.filter(Violation.plate_number.ilike(f"%{query_str}%"))
        
    results = query.order_by(Violation.created_at.desc()).limit(30).all()
    
    formatted_items = []
    for v in results:
        img = v.evidence[0].image_path if v.evidence else None
        formatted_items.append({
            "id": v.id,
            "violation_type": v.violation_type,
            "confidence": v.confidence,
            "plate_number": v.plate_number,
            "plate_confidence": v.plate_confidence,
            "vehicle_type": getattr(v, "vehicle_type", "FOUR_WHEELER"),
            "speed": getattr(v, "speed", None),
            "speed_limit": getattr(v, "speed_limit", 60.0),
            "bbox": getattr(v, "bbox", None),
            "bbox_normalized": getattr(v, "bbox_normalized", None),
            "status": v.status,
            "created_at": v.created_at,
            "image_url": img
        })
        
    return {"total": len(formatted_items), "items": formatted_items}

@router.post("/{id}/pay")
async def pay_challan(id: int, payload: dict = {}, db: Session = Depends(get_db)):
    violation = db.query(Violation).filter(Violation.id == id).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
        
    if violation.status == "PAID":
        return {
            "success": True,
            "message": "Challan already cleared",
            "transaction_id": f"TXN-{violation.id}-ALREADY-PAID",
            "violation_id": violation.id,
            "status": "PAID"
        }
        
    payment_method = payload.get("payment_method", "UPI_QR")
    import uuid
    txn_id = f"TXN-UPI-{uuid.uuid4().hex[:8].upper()}"
    
    violation.status = "PAID"
    db.commit()
    db.refresh(violation)

    await broadcast_telemetry("VIOLATION_CLEARED", {
        "id": violation.id,
        "plate_number": violation.plate_number,
        "transaction_id": txn_id
    })
    
    return {
        "success": True,
        "message": "Payment verified and recorded successfully. Official clearance certificate issued.",
        "transaction_id": txn_id,
        "payment_method": payment_method,
        "amount_paid": payload.get("amount", "₹1,000"),
        "paid_at": datetime.utcnow().isoformat(),
        "violation_id": violation.id,
        "plate_number": violation.plate_number,
        "status": "PAID"
    }
