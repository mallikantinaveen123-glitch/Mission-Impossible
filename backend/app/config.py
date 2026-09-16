import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SMART TRAFFIC AI"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./traffic.db")
    AUTH_SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "local-development-secret-change-before-deploy")
    AUTH_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("AUTH_TOKEN_EXPIRE_MINUTES", "30"))
    AUTH_OTP_EXPIRE_MINUTES: int = int(os.getenv("AUTH_OTP_EXPIRE_MINUTES", "5"))
    AUTH_DEMO_MODE: bool = os.getenv("AUTH_DEMO_MODE", "true").lower() == "true"
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = ".env"

settings = Settings()
