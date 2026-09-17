from sqlalchemy.orm import Session
from typing import Optional
import datetime
from app.db.models import AuditLog
from app.core.security import calculate_audit_hash

def log_audit_event(
    db: Session,
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    user_id: Optional[int] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Appends a new cryptographically chained audit log entry:
    Event(N) Hash = SHA-256(Event(N) metadata + Event(N-1) Hash)
    Guarantees tamper-evidence across administrative and financial activities.
    """
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    previous_hash = last_log.event_hash if last_log else "0" * 64

    event_payload = {
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "user_id": user_id,
        "details": details,
        "ip_address": ip_address,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

    event_hash = calculate_audit_hash(event_payload, previous_hash)

    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
        previous_hash=previous_hash,
        event_hash=event_hash,
        created_at=datetime.datetime.utcnow()
    )
    db.add(log_entry)
    return log_entry

