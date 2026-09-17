from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.db.session import engine
from app.db.base import Base
from app.api.v1 import detect, violations, maps, analytics, cameras, rules, stations, auth, ws, challans
from app.db.seed import seed_db

# Create storage directory if it doesn't exist
os.makedirs("storage", exist_ok=True)

# Initialize DB tables with modern SQLAlchemy 2.0 schema
Base.metadata.create_all(bind=engine)
seed_db() # Populate with mock data if empty

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Next-Generation AI Traffic Enforcement, Electronic Challan & Command Center Telemetry Platform",
    version="2.1.0"
)

# CORS configuration - allow all local and network origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve storage directory as static files
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# Include Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication & User Management"])
app.include_router(challans.router, prefix="/api/v1/challans", tags=["Citizen Challans & Appeals"])
app.include_router(detect.router, prefix="/api/v1/detect", tags=["Detection"])
app.include_router(violations.router, prefix="/api/v1/violations", tags=["Violations"])
app.include_router(maps.router, prefix="/api/v1/maps", tags=["Maps"])
app.include_router(cameras.router, prefix="/api/v1/cameras", tags=["Cameras"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(rules.router, prefix="/api/v1/rules", tags=["Rules"])
app.include_router(stations.router, prefix="/api/v1/stations", tags=["Police Stations"])
app.include_router(ws.router, prefix="/api/v1/ws", tags=["Real-time Telemetry WebSocket"])

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "backend": "online",
        "ai_mode": "demo",
        "database": "SQLite-WAL",
        "version": "2.1.0"
    }

@app.get("/")
def root():
    return {"message": "SMART TRAFFIC AI API is running with SQLite-WAL & WebSocket Telemetry"}
