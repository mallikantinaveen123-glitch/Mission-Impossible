import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SMART TRAFFIC AI – AEGIS 2027"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./traffic.db")
    AUTH_SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "local-development-secret-change-before-deploy")
    AUTH_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("AUTH_TOKEN_EXPIRE_MINUTES", "30"))
    AUTH_OTP_EXPIRE_MINUTES: int = int(os.getenv("AUTH_OTP_EXPIRE_MINUTES", "5"))
    AUTH_DEMO_MODE: bool = os.getenv("AUTH_DEMO_MODE", "true").lower() == "true"
    
    # Configurable Cryptographic Parameters
    PASSWORD_HASH_ALGORITHM: str = os.getenv("PASSWORD_HASH_ALGORITHM", "sha256")
    PASSWORD_HASH_ITERATIONS: int = int(os.getenv("PASSWORD_HASH_ITERATIONS", "100000"))
    SALT_LENGTH: int = int(os.getenv("SALT_LENGTH", "16"))
    
    # OTP Governance & Security
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    OTP_RESEND_COOLDOWN_SECONDS: int = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))
    OTP_TTL_SECONDS: int = int(os.getenv("OTP_TTL_SECONDS", "300"))

    ALLOWED_ORIGINS: list = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = ".env"

settings = Settings()
