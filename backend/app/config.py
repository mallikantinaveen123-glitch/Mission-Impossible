import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SMART TRAFFIC AI"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./traffic.db")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = ".env"

settings = Settings()
