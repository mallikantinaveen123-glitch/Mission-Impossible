from pydantic import BaseModel
from typing import Optional, List
import datetime

class ViolationBase(BaseModel):
    violation_type: str
    confidence: float
    plate_number: Optional[str] = None
    plate_confidence: Optional[float] = None
    status: str
    vehicle_type: Optional[str] = None
    speed: Optional[float] = None
    speed_limit: Optional[float] = None
    bbox: Optional[str] = None

class ViolationResponse(ViolationBase):
    id: int
    image_url: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ViolationListResponse(BaseModel):
    total: int
    items: List[ViolationResponse]

class ViolationSummary(BaseModel):
    total: int
    today: int
    pending: int
    verified: int
    rejected: int

class ViolationStatusUpdate(BaseModel):
    status: str
    comment: Optional[str] = None
