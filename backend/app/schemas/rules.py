from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TrafficRuleBase(BaseModel):
    code: str
    title: str
    description: str
    category: str
    section: Optional[str] = None
    penalty: str
    challan_amount: Optional[str] = None
    status: Optional[str] = "active"

class TrafficRuleCreate(TrafficRuleBase):
    pass

class TrafficRuleUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    section: Optional[str] = None
    penalty: Optional[str] = None
    challan_amount: Optional[str] = None
    status: Optional[str] = None

class TrafficRuleResponse(TrafficRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
