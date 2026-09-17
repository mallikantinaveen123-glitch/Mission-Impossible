from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
import datetime
import math

from app.db.session import get_db
from app.db.models import User, UserOTP, UserSettings, AuditLog
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    OTPGenerateRequest,
    OTPVerifyRequest,
    PasswordGenerateResponse,
    PasswordResetRequest,
    UserSettingsSchema,
    UserResponse,
    AuthResponse
)
from app.core.security import (
    hash_password,
    verify_password,
    create_otp_hash_record,
    verify_otp_hash_record,
    generate_otp,
    generate_strong_password,
    create_session_token,
    verify_session_token
)
from app.core.rate_limit import limiter, get_client_ip
from app.config import settings

router = APIRouter()

def get_current_user_optional(authorization: str = Header(None), db: Session = Depends(get_db)) -> User | None:
    """Extracts and verifies current user from Bearer token if provided."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = verify_session_token(token)
    if not payload:
        return None
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    return user

def get_current_user_required(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    user = get_current_user_optional(authorization, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please sign in again."
        )
    return user

@router.post("/register", response_model=AuthResponse)
def register(req: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    limiter.check(f"register:{ip}", max_requests=10, window_seconds=60)

    # Check if user already exists
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    if req.phone:
        existing_phone = db.query(User).filter(User.phone == req.phone.strip()).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="An account with this phone number already exists.")

    # Hash password with PBKDF2-HMAC-SHA256
    pwd_hash, salt = hash_password(req.password)

    new_user = User(
        email=req.email.lower().strip(),
        phone=req.phone.strip() if req.phone else None,
        full_name=req.full_name.strip(),
        hashed_password=pwd_hash,
        salt=salt,
        role=req.role.upper(),
        badge_number=req.badge_number,
        station_id=req.station_id,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    db.flush()

    # Create default user settings
    settings_obj = UserSettings(user_id=new_user.id)
    db.add(settings_obj)

    # Audit log
    db.add(AuditLog(
        user_id=new_user.id,
        action="REGISTER",
        entity="USER",
        entity_id=str(new_user.id),
        details=f"New {new_user.role} user registered ({new_user.email})",
        ip_address=ip
    ))
    db.commit()
    db.refresh(new_user)

    token = create_session_token(new_user.id, new_user.role, new_user.email)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user,
        "message": "Account created successfully."
    }

@router.post("/login", response_model=AuthResponse)
def login(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    ident = req.identifier.strip().lower()
    limiter.check(f"login:{ip}", max_requests=15, window_seconds=60)
    limiter.check(f"login_ident:{ident}", max_requests=10, window_seconds=60)

    user = db.query(User).filter(
        (User.email == ident) | (User.phone == req.identifier.strip())
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/phone or password.")

    if not verify_password(req.password, user.hashed_password, user.salt):
        raise HTTPException(status_code=401, detail="Invalid email/phone or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")

    token = create_session_token(user.id, user.role, user.email)

    db.add(AuditLog(
        user_id=user.id,
        action="LOGIN",
        entity="USER",
        entity_id=str(user.id),
        details=f"Successful password login ({user.email})",
        ip_address=ip
    ))
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "message": f"Welcome back, {user.full_name}."
    }

@router.post("/generate-otp")
def generate_user_otp(req: OTPGenerateRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    ident = req.identifier.strip().lower()
    limiter.check(f"otp_gen_ip:{ip}", max_requests=5, window_seconds=60)
    limiter.check(f"otp_gen_id:{ident}", max_requests=3, window_seconds=60)

    otp_code = generate_otp(6)
    stored_hash, _ = create_otp_hash_record(otp_code)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)

    # Invalidate previous unused OTPs for this identifier
    db.query(UserOTP).filter(
        UserOTP.identifier == ident,
        UserOTP.purpose == req.purpose,
        UserOTP.is_used == False
    ).update({"is_used": True})

    otp_record = UserOTP(
        identifier=ident,
        otp_hash=stored_hash,
        purpose=req.purpose,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    response = {
        "success": True,
        "identifier": ident,
        "purpose": req.purpose,
        "expires_in_seconds": 300,
        "message": "If the account exists, a verification code has been generated."
    }
    if settings.AUTH_DEMO_MODE:
        response["temporary_code"] = otp_code
    return response

@router.post("/verify-otp", response_model=AuthResponse)
def verify_user_otp(req: OTPVerifyRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    ident = req.identifier.strip().lower()
    limiter.check(f"otp_ver_ip:{ip}", max_requests=10, window_seconds=60)

    now = datetime.datetime.utcnow()

    otp_record = db.query(UserOTP).filter(
        UserOTP.identifier == ident,
        UserOTP.purpose == req.purpose,
        UserOTP.is_used == False,
        UserOTP.expires_at > now
    ).first()

    if not otp_record or not verify_otp_hash_record(req.otp_code.strip(), otp_record.otp_hash):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code. Please request a new one.")

    otp_record.is_used = True

    # Find or auto-provision citizen user if logging in
    user = db.query(User).filter((User.email == ident) | (User.phone == req.identifier.strip())).first()
    if not user:
        is_email = "@" in ident
        pwd_hash, salt = hash_password(generate_strong_password(16))
        user = User(
            email=ident if is_email else f"{ident}@traffic.citizen.in",
            phone=ident if not is_email else None,
            full_name="Smart City Citizen",
            hashed_password=pwd_hash,
            salt=salt,
            role="CITIZEN",
            is_active=True,
            is_verified=True
        )
        db.add(user)
        db.flush()

        settings_obj = UserSettings(user_id=user.id)
        db.add(settings_obj)

    db.add(AuditLog(
        user_id=user.id,
        action="OTP_VERIFY_LOGIN",
        entity="USER",
        entity_id=str(user.id),
        details=f"Successful OTP sign-in for {ident}",
        ip_address=ip
    ))
    db.commit()
    db.refresh(user)

    token = create_session_token(user.id, user.role, user.email)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "message": f"Successfully verified. Welcome, {user.full_name}."
    }

@router.get("/generate-password", response_model=PasswordGenerateResponse)
def get_suggested_password(length: int = 16):
    if length < 8 or length > 64:
        length = 16
    password = generate_strong_password(length)
    pool_size = 26 + 26 + 10 + 28
    entropy = round(length * math.log2(pool_size), 1)

    return {
        "password": password,
        "length": length,
        "entropy_bits": entropy,
        "strength": "Very Strong" if entropy >= 70 else "Strong"
    }

@router.post("/reset-password")
def reset_password(req: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    ident = req.identifier.strip().lower()
    now = datetime.datetime.utcnow()

    otp_record = db.query(UserOTP).filter(
        UserOTP.identifier == ident,
        UserOTP.purpose == "PASSWORD_RESET",
        UserOTP.is_used == False,
        UserOTP.expires_at > now
    ).first()

    if not otp_record or not verify_otp_hash_record(req.otp_code.strip(), otp_record.otp_hash):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    user = db.query(User).filter(
        (User.email == ident) | (User.phone == req.identifier.strip())
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="No account found associated with this identifier.")

    pwd_hash, salt = hash_password(req.new_password)
    user.hashed_password = pwd_hash
    user.salt = salt
    otp_record.is_used = True

    db.add(AuditLog(
        user_id=user.id,
        action="PASSWORD_RESET",
        entity="USER",
        entity_id=str(user.id),
        details=f"Password successfully reset for {user.email}",
        ip_address=ip
    ))
    db.commit()

    return {"success": True, "message": "Password updated successfully. You can now log in."}

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user_required)):
    return current_user

@router.get("/settings", response_model=UserSettingsSchema)
def get_user_settings(current_user: User = Depends(get_current_user_required), db: Session = Depends(get_db)):
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings_obj:
        settings_obj = UserSettings(user_id=current_user.id)
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
    return settings_obj

@router.put("/settings", response_model=UserSettingsSchema)
def update_user_settings(
    settings_in: UserSettingsSchema,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings_obj:
        settings_obj = UserSettings(user_id=current_user.id)
        db.add(settings_obj)

    for field, val in settings_in.model_dump().items():
        if hasattr(settings_obj, field) and val is not None:
            setattr(settings_obj, field, val)

    settings_obj.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(settings_obj)
    return settings_obj
