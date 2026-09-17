from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import uuid
import json

from app.db.session import get_db
from app.db.models import Challan, ChallanPayment, ViolationAppeal, TrafficCorridor, AuditLog, Violation, User
from app.api.v1.auth import get_current_user_optional, get_current_user_required
from app.api.v1.ws import broadcast_telemetry
from app.core.rate_limit import get_client_ip
from pydantic import BaseModel

router = APIRouter()

class ChallanResponse(BaseModel):
    id: int
    challan_number: str
    plate_number: str
    vehicle_type: str
    violation_type: str
    amount: float
    status: str
    penalty_code: Optional[str] = None
    due_date: datetime.datetime
    issued_at: datetime.datetime
    paid_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class PaymentRequest(BaseModel):
    payment_method: str = "UPI" # UPI, CARD, NETBANKING

class AppealRequest(BaseModel):
    reason: str
    evidence_notes: Optional[str] = None

@router.get("/search", response_model=List[ChallanResponse])
def search_challans(plate_number: str, db: Session = Depends(get_db)):
    """Allows citizens to query all unpaid or past challans by vehicle plate number."""
    plate = plate_number.strip().upper()
    challans = db.query(Challan).filter(Challan.plate_number == plate).order_by(Challan.issued_at.desc()).all()
    return challans

@router.get("/my-challans", response_model=List[ChallanResponse])
def get_user_challans(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Retrieves all challans associated with the logged-in user."""
    challans = db.query(Challan).filter(
        (Challan.user_id == current_user.id)
    ).order_by(Challan.issued_at.desc()).all()
    return challans

@router.get("/{challan_id}", response_model=ChallanResponse)
def get_challan_detail(challan_id: int, db: Session = Depends(get_db)):
    ch = db.query(Challan).filter(Challan.id == challan_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challan not found.")
    return ch

@router.post("/{challan_id}/pay")
async def pay_challan(
    challan_id: int,
    pay_req: PaymentRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ch = db.query(Challan).filter(Challan.id == challan_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challan not found.")
    if ch.status == "PAID":
        return {"success": True, "message": "Challan has already been paid.", "challan": ch}

    tx_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"
    receipt = f"RCPT-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.datetime.utcnow()

    # Create payment record
    payment = ChallanPayment(
        challan_id=ch.id,
        transaction_id=tx_id,
        payment_method=pay_req.payment_method,
        amount_paid=ch.amount,
        payment_status="SUCCESS",
        receipt_number=receipt,
        paid_at=now
    )
    db.add(payment)

    ch.status = "PAID"
    ch.paid_at = now

    # Audit log
    ip = get_client_ip(request)
    db.add(AuditLog(
        user_id=current_user.id if current_user else None,
        action="CHALLAN_PAID",
        entity="CHALLAN",
        entity_id=str(ch.id),
        details=f"Payment of ₹{ch.amount} received via {pay_req.payment_method} (Txn: {tx_id})",
        ip_address=ip
    ))
    db.commit()

    # Broadcast via WebSocket
    await broadcast_telemetry("CHALLAN_PAID", {
        "challan_id": ch.id,
        "challan_number": ch.challan_number,
        "plate_number": ch.plate_number,
        "amount": ch.amount,
        "receipt_number": receipt
    })

    return {
        "success": True,
        "message": f"Payment of ₹{ch.amount} completed successfully.",
        "receipt_number": receipt,
        "transaction_id": tx_id,
        "paid_at": now.isoformat()
    }

@router.post("/{challan_id}/appeal")
async def appeal_challan(
    challan_id: int,
    appeal_req: AppealRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ch = db.query(Challan).filter(Challan.id == challan_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challan not found.")
    if ch.status == "PAID":
        raise HTTPException(status_code=400, detail="Cannot appeal a paid challan.")

    appeal = ViolationAppeal(
        challan_id=ch.id,
        violation_id=ch.violation_id,
        user_id=current_user.id if current_user else None,
        reason=appeal_req.reason,
        evidence_docs=appeal_req.evidence_notes,
        status="PENDING"
    )
    db.add(appeal)
    ch.status = "APPEALED"

    ip = get_client_ip(request)
    db.add(AuditLog(
        user_id=current_user.id if current_user else None,
        action="APPEAL_FILED",
        entity="CHALLAN",
        entity_id=str(ch.id),
        details=f"Dispute submitted for challan #{ch.challan_number}: {appeal_req.reason[:60]}",
        ip_address=ip
    ))
    db.commit()

    await broadcast_telemetry("CHALLAN_APPEALED", {
        "challan_id": ch.id,
        "challan_number": ch.challan_number,
        "plate_number": ch.plate_number,
        "reason": appeal_req.reason
    })

    return {
        "success": True,
        "message": "Appeal submitted to traffic adjudication desk for review.",
        "appeal_status": "PENDING"
    }

@router.get("/corridors/all")
def get_traffic_corridors(db: Session = Depends(get_db)):
    """Retrieves speed corridor metrics and congestion ratings."""
    corridors = db.query(TrafficCorridor).all()
    if not corridors:
        # Seed default corridors if empty
        defaults = [
            TrafficCorridor(
                id="CORR-ORR-01",
                name="Outer Ring Road Expressway",
                zone="Zone 1 - High Speed",
                start_junction="Gachibowli Junction",
                end_junction="Shamshabad Airport Exit",
                current_speed=82.0,
                speed_limit=100.0,
                congestion_level="LOW",
                status="OPEN"
            ),
            TrafficCorridor(
                id="CORR-PVNR-02",
                name="PVNR Elevated Expressway",
                zone="Zone 2 - Central Corridor",
                start_junction="Mehdipatnam Ramp",
                end_junction="Aramghar Interchange",
                current_speed=48.0,
                speed_limit=60.0,
                congestion_level="MODERATE",
                status="OPEN"
            ),
            TrafficCorridor(
                id="CORR-BJR-03",
                name="Banjara Hills Road No 1 Arterial",
                zone="Zone 3 - Commercial Metro",
                start_junction="Taj Krishna Roundabout",
                end_junction="Panjagutta Flyover",
                current_speed=24.0,
                speed_limit=45.0,
                congestion_level="HEAVY",
                status="RESTRICTED"
            )
        ]
        db.add_all(defaults)
        db.commit()
        corridors = defaults

    return corridors
