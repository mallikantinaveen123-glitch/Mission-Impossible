from fastapi import APIRouter
from app.config import settings

router = APIRouter()

@router.get("/status")
def maps_status():
    is_configured = bool(settings.GOOGLE_MAPS_API_KEY)
    
    if is_configured:
        return {
            "configured": True,
            "provider": "Google Maps",
            "status": "ready"
        }
    else:
        return {
            "configured": False,
            "provider": "OpenStreetMap fallback",
            "status": "fallback_available"
        }
