from typing import Optional, List
import datetime
from sqlalchemy import (
    String, Integer, Float, DateTime, ForeignKey, Boolean, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from app.db.base import Base

class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    camera_type: Mapped[str] = mapped_column(String, default="STANDARD_ANPR")
    status: Mapped[str] = mapped_column(String, default="ONLINE")
    health_status: Mapped[str] = mapped_column(String, default="ONLINE") # ONLINE, LOW_FPS, OFFLINE, OBSTRUCTED, BLURRED, HIGH_LATENCY
    fps: Mapped[float] = mapped_column(Float, default=29.8)
    latency_ms: Mapped[int] = mapped_column(Integer, default=42)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    calibration_matrix: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Perspective transformation params
    last_heartbeat: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    violations: Mapped[List["Violation"]] = relationship("Violation", back_populates="camera")
    incidents: Mapped[List["Incident"]] = relationship("Incident", back_populates="camera")


class Incident(Base):
    """
    Candidate Incident Layer:
    AI detections and tracked trajectories form Candidate Incidents first,
    requiring temporal confidence and officer review before issuing a formal Violation & Challan.
    """
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True) # e.g. "INC-2026-001842"
    camera_id: Mapped[Optional[str]] = mapped_column(ForeignKey("cameras.id"), nullable=True)
    vehicle_track_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # From ByteTrack
    plate_number: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    incident_type: Mapped[str] = mapped_column(String, index=True) # SPEEDING, NO_HELMET, RED_LIGHT
    confidence: Mapped[float] = mapped_column(Float, default=0.90)
    status: Mapped[str] = mapped_column(String, default="CANDIDATE") # CANDIDATE, UNDER_REVIEW, DISMISSED, CONVERTED_TO_VIOLATION
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    trajectory_metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON trajectory points
    detected_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    camera: Mapped[Optional["Camera"]] = relationship("Camera", back_populates="incidents")
    violations: Mapped[List["Violation"]] = relationship("Violation", back_populates="incident")


class Violation(Base):
    __tablename__ = "violations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id: Mapped[Optional[str]] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    rule_id: Mapped[Optional[int]] = mapped_column(ForeignKey("traffic_rules.id"), nullable=True)
    violation_type: Mapped[str] = mapped_column(String, index=True) # NO_HELMET, TRIPLE_RIDING, RED_LIGHT, SPEEDING
    confidence: Mapped[float] = mapped_column(Float, default=0.90)
    plate_number: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    plate_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bbox: Mapped[Optional[str]] = mapped_column(String, nullable=True) # JSON pixel array [x, y, w, h]
    bbox_normalized: Mapped[Optional[str]] = mapped_column(String, nullable=True) # JSON normalized [x1, y1, x2, y2] (0.0 to 1.0)
    status: Mapped[str] = mapped_column(String, default="PENDING") # PENDING, UNDER_REVIEW, VERIFIED, REJECTED
    vehicle_type: Mapped[Optional[str]] = mapped_column(String, nullable=True) # TWO_WHEELER, FOUR_WHEELER
    speed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speed_limit: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    camera_id: Mapped[Optional[str]] = mapped_column(ForeignKey("cameras.id"), nullable=True)
    verified_by: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Officer badge or name
    verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    incident: Mapped[Optional["Incident"]] = relationship("Incident", back_populates="violations")
    camera: Mapped[Optional["Camera"]] = relationship("Camera", back_populates="violations")
    rule: Mapped[Optional["TrafficRule"]] = relationship("TrafficRule", back_populates="violations")
    evidence: Mapped[List["Evidence"]] = relationship("Evidence", back_populates="violation", cascade="all, delete-orphan")
    challans: Mapped[List["Challan"]] = relationship("Challan", back_populates="violation")
    appeals: Mapped[List["ViolationAppeal"]] = relationship("ViolationAppeal", back_populates="violation")
    alerts: Mapped[List["InterStationAlert"]] = relationship("InterStationAlert", back_populates="violation")


class Evidence(Base):
    """
    Evidence Integrity System:
    Every captured frame/video includes an immutable SHA-256 cryptographic hash,
    camera ID, and frame number to guarantee non-tampering in court adjudication.
    """
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    violation_id: Mapped[int] = mapped_column(ForeignKey("violations.id"), nullable=False)
    image_path: Mapped[str] = mapped_column(String, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String, nullable=False, default="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    camera_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    frame_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    captured_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    violation: Mapped["Violation"] = relationship("Violation", back_populates="evidence")


class TrafficRule(Base):
    """
    Versioned Traffic Rule Engine:
    Maintains effective dates and explicit version numbers so historical challans
    are tied to the exact legal penalty at the time the violation occurred.
    """
    __tablename__ = "traffic_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    penalty: Mapped[str] = mapped_column(String, nullable=False)
    challan_amount: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    effective_until: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    source_reference: Mapped[Optional[str]] = mapped_column(String, default="Motor Vehicles (Amendment) Act 2019")
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    violations: Mapped[List["Violation"]] = relationship("Violation", back_populates="rule")


class PoliceStation(Base):
    __tablename__ = "police_stations"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)  # e.g. "PS-BANJARA"
    name: Mapped[str] = mapped_column(String, nullable=False)
    zone: Mapped[str] = mapped_column(String, nullable=False)
    jurisdiction: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    duty_officer: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default="ONLINE")  # ONLINE, PATROL_ALERT, HIGH_ALERT, OFFLINE
    active_checkpoints: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    officers: Mapped[List["User"]] = relationship("User", back_populates="station")
    outgoing_alerts: Mapped[List["InterStationAlert"]] = relationship(
        "InterStationAlert", foreign_keys="InterStationAlert.source_station_id", back_populates="source_station"
    )
    dispatches: Mapped[List["StationDispatchMessage"]] = relationship(
        "StationDispatchMessage", foreign_keys="StationDispatchMessage.from_station_id", back_populates="from_station"
    )


class InterStationAlert(Base):
    __tablename__ = "inter_station_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    source_station_id: Mapped[str] = mapped_column(ForeignKey("police_stations.id"), nullable=False)
    target_station_id: Mapped[str] = mapped_column(String, default="ALL")
    alert_type: Mapped[str] = mapped_column(String, default="INTERCEPT_DEFAULTER")
    priority: Mapped[str] = mapped_column(String, default="HIGH")
    plate_number: Mapped[str] = mapped_column(String, index=True, nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String, default="FOUR_WHEELER")
    violation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("violations.id"), nullable=True)
    total_unpaid_amount: Mapped[str] = mapped_column(String, default="₹3,000")
    unpaid_challans_count: Mapped[int] = mapped_column(Integer, default=1)
    last_seen_junction: Mapped[str] = mapped_column(String, default="Main Junction Camera 01")
    heading_direction: Mapped[str] = mapped_column(String, default="Towards Adjacent Sector")
    speed_recorded: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    intercepted_by_station_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    resolved_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    source_station: Mapped[Optional["PoliceStation"]] = relationship(
        "PoliceStation", foreign_keys=[source_station_id], back_populates="outgoing_alerts"
    )
    violation: Mapped[Optional["Violation"]] = relationship(
        "Violation", foreign_keys=[violation_id], back_populates="alerts"
    )


class StationDispatchMessage(Base):
    __tablename__ = "station_dispatch_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    from_station_id: Mapped[str] = mapped_column(ForeignKey("police_stations.id"), nullable=False)
    to_station_id: Mapped[str] = mapped_column(String, default="ALL")
    sender_name: Mapped[str] = mapped_column(String, default="Duty Officer")
    message_type: Mapped[str] = mapped_column(String, default="DISPATCH")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    attached_plate: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    attached_violation_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    from_station: Mapped[Optional["PoliceStation"]] = relationship(
        "PoliceStation", foreign_keys=[from_station_id], back_populates="dispatches"
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    salt: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="CITIZEN")  # CITIZEN, OFFICER, ADMIN
    badge_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    station_id: Mapped[Optional[str]] = mapped_column(ForeignKey("police_stations.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # Relationships
    station: Mapped[Optional["PoliceStation"]] = relationship("PoliceStation", foreign_keys=[station_id], back_populates="officers")
    settings: Mapped[Optional["UserSettings"]] = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    challans: Mapped[List["Challan"]] = relationship("Challan", back_populates="user")
    appeals: Mapped[List["ViolationAppeal"]] = relationship("ViolationAppeal", back_populates="user")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")


class UserOTP(Base):
    """
    Hashed OTP Storage with Constant-Time Verification:
    Strictly enforced with max attempts (5), cooldown (60s), and 5-minute TTL.
    """
    __tablename__ = "user_otps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    identifier: Mapped[str] = mapped_column(String, index=True, nullable=False)  # email or phone
    otp_hash: Mapped[str] = mapped_column(String, nullable=False) # Salted cryptographic hash
    purpose: Mapped[str] = mapped_column(String, default="LOGIN")  # LOGIN, REGISTER, PASSWORD_RESET
    attempts: Mapped[int] = mapped_column(Integer, default=0) # Tracks failed verification attempts
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Synonym for backward compatibility
    otp_code = synonym("otp_hash")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    dark_mode: Mapped[bool] = mapped_column(Boolean, default=True)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    traffic_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    flood_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_archive: Mapped[bool] = mapped_column(Boolean, default=True)
    camera_detection: Mapped[bool] = mapped_column(Boolean, default=True)
    map_layer_preference: Mapped[str] = mapped_column(String, default="standard")
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="settings")


class Challan(Base):
    __tablename__ = "challans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    challan_number: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    violation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("violations.id"), nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    plate_number: Mapped[str] = mapped_column(String, index=True, nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String, default="TWO_WHEELER")
    violation_type: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    penalty_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="UNPAID") # UNPAID, PAID, APPEALED, CANCELLED
    due_date: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    issued_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    paid_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    violation: Mapped[Optional["Violation"]] = relationship("Violation", back_populates="challans")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="challans")
    payments: Mapped[List["ChallanPayment"]] = relationship("ChallanPayment", back_populates="challan", cascade="all, delete-orphan")
    appeals: Mapped[List["ViolationAppeal"]] = relationship("ViolationAppeal", back_populates="challan", cascade="all, delete-orphan")


class ChallanPayment(Base):
    """
    Payment Engine State Machine:
    Tracks idempotency keys and gateway signature state:
    payment_created -> payment_pending -> payment_success -> payment_failed / refunded
    """
    __tablename__ = "challan_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    challan_id: Mapped[int] = mapped_column(ForeignKey("challans.id"), nullable=False)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    transaction_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    payment_gateway: Mapped[str] = mapped_column(String, default="MOCK_GATEWAY") # RAZORPAY, BBPS, CASHFREE, MOCK
    payment_method: Mapped[str] = mapped_column(String, default="UPI")
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    payment_status: Mapped[str] = mapped_column(String, default="payment_success") # payment_created, payment_pending, payment_success, payment_failed
    gateway_signature: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    receipt_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    paid_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    challan: Mapped["Challan"] = relationship("Challan", back_populates="payments")


class ViolationAppeal(Base):
    __tablename__ = "violation_appeals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    challan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("challans.id"), nullable=True)
    violation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("violations.id"), nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_docs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    officER_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # Relationships
    challan: Mapped[Optional["Challan"]] = relationship("Challan", back_populates="appeals")
    violation: Mapped[Optional["Violation"]] = relationship("Violation", back_populates="appeals")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="appeals")


class TrafficCorridor(Base):
    __tablename__ = "traffic_corridors"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    zone: Mapped[str] = mapped_column(String, nullable=False)
    start_junction: Mapped[str] = mapped_column(String, nullable=False)
    end_junction: Mapped[str] = mapped_column(String, nullable=False)
    current_speed: Mapped[float] = mapped_column(Float, default=45.0)
    speed_limit: Mapped[float] = mapped_column(Float, default=60.0)
    congestion_level: Mapped[str] = mapped_column(String, default="MODERATE") # LOW, MODERATE, HEAVY, SEVERE
    status: Mapped[str] = mapped_column(String, default="OPEN") # OPEN, RESTRICTED, DIVERTED
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )


class AuditLog(Base):
    """
    Cryptographically Verifiable Audit Hash Chain:
    Event(N) Hash = SHA-256(Event(N) + previous_hash)
    Guarantees tamper-evidence so that unauthorized deletions or modifications
    break the cryptographic hash chain across the audit ledger.
    """
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    previous_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    event_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")
