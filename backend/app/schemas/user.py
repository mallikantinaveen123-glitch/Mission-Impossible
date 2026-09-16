from pydantic import BaseModel, EmailStr
from typing import Optional
import datetime

class UserRegisterRequest(BaseModel):
    email: str
    phone: Optional[str] = None
    full_name: str
    password: str
    role: str = "CITIZEN" # CITIZEN or OFFICER
    badge_number: Optional[str] = None
    station_id: Optional[str] = None

class UserLoginRequest(BaseModel):
    identifier: str # Email or Phone
    password: str

class OTPGenerateRequest(BaseModel):
    identifier: str # Email or Phone
    purpose: str = "LOGIN" # LOGIN, REGISTER, PASSWORD_RESET

class OTPVerifyRequest(BaseModel):
    identifier: str
    otp_code: str
    purpose: str = "LOGIN"

class PasswordGenerateResponse(BaseModel):
    password: str
    length: int
    strength: str # "Strong", "Very Strong"
    entropy_bits: float

class PasswordResetRequest(BaseModel):
    identifier: str
    otp_code: str
    new_password: str

class UserSettingsSchema(BaseModel):
    dark_mode: bool = True
    notifications_enabled: bool = True
    traffic_alerts: bool = True
    flood_alerts: bool = True
    auto_archive: bool = True
    camera_detection: bool = True
    map_layer_preference: str = "standard" # standard, satellite, flood, traffic

class UserResponse(BaseModel):
    id: int
    email: str
    phone: Optional[str] = None
    full_name: str
    role: str
    badge_number: Optional[str] = None
    station_id: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    message: str = "Success"
