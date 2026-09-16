from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import datetime
from app.db.base import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    camera_type = Column(String)
    status = Column(String, default="ONLINE")
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    violation_type = Column(String, index=True) # NO_HELMET, TRIPLE_RIDING, RED_LIGHT
    confidence = Column(Float)
    plate_number = Column(String, nullable=True, index=True)
    plate_confidence = Column(Float, nullable=True)
    bbox = Column(String, nullable=True) # JSON array as string [x1, y1, x2, y2]
    status = Column(String, default="PENDING") # PENDING, UNDER_REVIEW, VERIFIED, REJECTED
    vehicle_type = Column(String, nullable=True) # TWO_WHEELER, FOUR_WHEELER
    speed = Column(Float, nullable=True)
    speed_limit = Column(Float, nullable=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    evidence = relationship("Evidence", back_populates="violation")
    camera = relationship("Camera")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, ForeignKey("violations.id"))
    image_path = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    violation = relationship("Violation", back_populates="evidence")

class TrafficRule(Base):
    __tablename__ = "traffic_rules"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    title = Column(String)
    description = Column(String)
    category = Column(String)
    section = Column(String, nullable=True)
    penalty = Column(String)
    challan_amount = Column(String, nullable=True)
    status = Column(String, default="active") # active, inactive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class PoliceStation(Base):
    __tablename__ = "police_stations"

    id = Column(String, primary_key=True, index=True)  # e.g. "PS-BANJARA"
    name = Column(String, nullable=False)
    zone = Column(String, nullable=False)
    jurisdiction = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    duty_officer = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    status = Column(String, default="ONLINE")  # ONLINE, PATROL_ALERT, HIGH_ALERT, OFFLINE
    active_checkpoints = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class InterStationAlert(Base):
    __tablename__ = "inter_station_alerts"

    id = Column(Integer, primary_key=True, index=True)
    source_station_id = Column(String, ForeignKey("police_stations.id"))
    target_station_id = Column(String, default="ALL")  # station ID or "ALL"
    alert_type = Column(String, default="INTERCEPT_DEFAULTER")  # INTERCEPT_DEFAULTER, FLEEING_VEHICLE, HIGH_SPEED_HAZARD, REPEAT_OFFENDER, GREEN_CORRIDOR
    priority = Column(String, default="HIGH")  # CRITICAL, HIGH, MEDIUM
    plate_number = Column(String, index=True, nullable=False)
    vehicle_type = Column(String, default="FOUR_WHEELER")
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=True)
    total_unpaid_amount = Column(String, default="₹3,000")
    unpaid_challans_count = Column(Integer, default=1)
    last_seen_junction = Column(String, default="Main Junction Camera 01")
    heading_direction = Column(String, default="Towards Adjacent Sector")
    speed_recorded = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
    evidence_url = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")  # ACTIVE, INTERCEPTED, CHALLAN_COLLECTED, EXPIRED
    intercepted_by_station_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    source_station = relationship("PoliceStation", foreign_keys=[source_station_id])


class StationDispatchMessage(Base):
    __tablename__ = "station_dispatch_messages"

    id = Column(Integer, primary_key=True, index=True)
    from_station_id = Column(String, ForeignKey("police_stations.id"))
    to_station_id = Column(String, default="ALL")  # specific station id or "ALL"
    sender_name = Column(String, default="Duty Officer")
    message_type = Column(String, default="DISPATCH")  # DISPATCH, ALERT, CHALLAN_INTEL, GENERAL
    content = Column(String, nullable=False)
    attached_plate = Column(String, nullable=True)
    attached_violation_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    from_station = relationship("PoliceStation", foreign_keys=[from_station_id])


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    role = Column(String, default="CITIZEN")  # CITIZEN, OFFICER, ADMIN
    badge_number = Column(String, nullable=True)
    station_id = Column(String, ForeignKey("police_stations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class UserOTP(Base):
    __tablename__ = "user_otps"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, index=True, nullable=False)  # email or phone
    otp_code = Column(String, nullable=False)
    purpose = Column(String, default="LOGIN")  # LOGIN, REGISTER, PASSWORD_RESET
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    dark_mode = Column(Boolean, default=True)
    notifications_enabled = Column(Boolean, default=True)
    traffic_alerts = Column(Boolean, default=True)
    flood_alerts = Column(Boolean, default=True)
    auto_archive = Column(Boolean, default=True)
    camera_detection = Column(Boolean, default=True)
    map_layer_preference = Column(String, default="standard")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="settings")

