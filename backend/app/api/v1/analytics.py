from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.db.models import Violation, Camera

router = APIRouter()

@router.get("/hotspots")
def get_hotspots(db: Session = Depends(get_db)):
    # Simple hotspot grouping by coordinates
    # We will cluster by rounding lat/lng or just grouping by them
    
    # Since SQLite doesn't have advanced GIS, we group by exact lat/lng or camera
    results = db.query(
        Violation.lat, 
        Violation.lng, 
        func.count(Violation.id).label('count'),
        Violation.camera_id
    ).filter(
        Violation.lat.isnot(None)
    ).group_by(
        Violation.lat, Violation.lng, Violation.camera_id
    ).all()
    
    hotspots = []
    for r in results:
        # find most common violation type for this hotspot
        top_violation = db.query(Violation.violation_type, func.count(Violation.id).label('vc')) \
            .filter(Violation.lat == r.lat, Violation.lng == r.lng) \
            .group_by(Violation.violation_type) \
            .order_by(func.count(Violation.id).desc()) \
            .first()
            
        camera = db.query(Camera).filter(Camera.id == r.camera_id).first()
        
        hotspots.append({
            "latitude": r.lat,
            "longitude": r.lng,
            "violation_count": r.count,
            "dominant_violation": top_violation[0] if top_violation else "UNKNOWN",
            "camera": camera.name if camera else "Unknown Camera"
        })
        
    return hotspots
