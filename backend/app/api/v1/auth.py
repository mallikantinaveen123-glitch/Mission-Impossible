from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
import datetime
import math
import secrets

from app.db.session import get_db
from app.db.models import User, UserOTP, UserSettings
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
    hash_otp,
    generate_otp,
    generate_strong_password,
    create_session_token,
    verify_session_token
)

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
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter((User.email == req.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    if req.phone:
        existing_phone = db.query(User).filter(User.phone == req.phone).first()
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
    db.commit()
    db.refresh(new_user)

    # Create default user settings
    settings_obj = UserSettings(user_id=new_user.id)
    db.add(settings_obj)
    db.commit()

    token = create_session_token(new_user.id, new_user.role, new_user.email)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user,
        "message": "Account created successfully."
    }

@router.post("/login", response_model=AuthResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    ident = req.identifier.strip().lower()
    user = db.query(User).filter(
        (User.email == ident) | (User.phone == req.identifier.strip())
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials. User not found.")

    if not verify_password(req.password, user.hashed_password, user.salt):
        raise HTTPException(status_code=401, detail="Invalid password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account is deactivated.")

    token = create_session_token(user.id, user.role, user.email)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "message": f"Welcome back, {user.full_name}!"
    }

@router.post("/generate-otp")
def generate_user_otp(req: OTPGenerateRequest, db: Session = Depends(get_db)):
    ident = req.identifier.strip().lower()
    otp_code = generate_otp(6)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    otp_salt = secrets.token_hex(16)

    # Invalidate previous unused OTPs for this identifier
    db.query(UserOTP).filter(
        UserOTP.identifier == ident,
        UserOTP.purpose == req.purpose,
        UserOTP.is_used == False
    ).update({"is_used": True})

    otp_record = UserOTP(
        identifier=ident,
        otp_code=hash_otp(otp_code, otp_salt),
        otp_salt=otp_salt,
        purpose=req.purpose,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    # Deliver the code through a configured email/SMS provider in production.
    return {
        "success": True,
        "identifier": ident,
        "purpose": req.purpose,
        "expires_in_seconds": 300,
        "message": "If the account exists, a verification code has been sent."
    }

@router.post("/verify-otp", response_model=AuthResponse)
def verify_user_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    ident = req.identifier.strip().lower()
    now = datetime.datetime.utcnow()

    otp_record = db.query(UserOTP).filter(
        UserOTP.identifier == ident,
        UserOTP.purpose == req.purpose,
        UserOTP.is_used == False,
        UserOTP.expires_at > now
    ).first()

    if not otp_record or not hmac.compare_digest(otp_record.otp_code, hash_otp(req.otp_code.strip(), otp_record.otp_salt)):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code. Please request a new one.")

    otp_record.is_used = True
    db.commit()

    # Find or auto-provision citizen user if logging in
    user = db.query(User).filter((User.email == ident) | (User.phone == req.identifier.strip())).first()
    if not user:
        # Create a citizen user on the fly for OTP mobile/email login
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
        db.commit()
        db.refresh(user)

        settings_obj = UserSettings(user_id=user.id)
        db.add(settings_obj)
        db.commit()

    token = create_session_token(user.id, user.role, user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "message": "OTP verified successfully."
    }

@router.get("/generate-password", response_model=PasswordGenerateResponse)
def get_generated_password(length: int = 16, include_symbols: bool = True):
    length = max(8, min(length, 32))
    pwd = generate_strong_password(length, include_symbols)
    # Estimate entropy: log2(pool_size^length)
    pool_size = 26 + 26 + 10 + (28 if include_symbols else 0)
    entropy_bits = round(length * math.log2(pool_size), 1)

    strength = "Very Strong" if entropy_bits >= 80 else ("Strong" if entropy_bits >= 60 else "Moderate")

    return {
        "password": pwd,
        "length": length,
        "strength": strength,
        "entropy_bits": entropy_bits
    }

@router.post("/reset-password")
def reset_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    ident = req.identifier.strip().lower()
    now = datetime.datetime.utcnow()

    otp_record = db.query(UserOTP).filter(
        UserOTP.identifier == ident,
        UserOTP.otp_code == req.otp_code.strip(),
        UserOTP.purpose == "PASSWORD_RESET",
        UserOTP.is_used == False,
        UserOTP.expires_at > now
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP for password reset.")

    user = db.query(User).filter((User.email == ident) | (User.phone == req.identifier.strip())).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    pwd_hash, salt = hash_password(req.new_password)
    user.hashed_password = pwd_hash
    user.salt = salt
    otp_record.is_used = True
    db.commit()

    return {"success": True, "message": "Password has been successfully updated. You can now sign in."}

@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user_required)):
    return user

@router.get("/settings", response_model=UserSettingsSchema)
def get_user_settings(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional)
):
    if user and user.settings:
        return user.settings
    # Return sensible default settings
    return UserSettingsSchema()

@router.put("/settings", response_model=UserSettingsSchema)
def update_user_settings(
    settings_in: UserSettingsSchema,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_required)
):
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings_obj:
        settings_obj = UserSettings(user_id=user.id)
        db.add(settings_obj)

    for field, val in settings_in.model_dump().items():
        setattr(settings_obj, field, val)

    settings_obj.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(settings_obj)
    return settings_obj
