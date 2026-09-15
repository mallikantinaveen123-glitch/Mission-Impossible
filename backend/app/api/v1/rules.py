from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.db.models import TrafficRule
from app.schemas.rules import TrafficRuleCreate, TrafficRuleUpdate, TrafficRuleResponse

router = APIRouter()

@router.get("/", response_model=List[TrafficRuleResponse])
def get_rules(db: Session = Depends(get_db)):
    # Return all active rules
    rules = db.query(TrafficRule).filter(TrafficRule.status == "active").all()
    return rules

@router.post("/", response_model=TrafficRuleResponse)
def create_rule(rule: TrafficRuleCreate, db: Session = Depends(get_db)):
    # Note: Admin-only check should go here
    db_rule = db.query(TrafficRule).filter(TrafficRule.code == rule.code).first()
    if db_rule:
        raise HTTPException(status_code=400, detail="Rule code already registered")
    
    new_rule = TrafficRule(**rule.dict())
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule

@router.patch("/{rule_id}", response_model=TrafficRuleResponse)
def update_rule(rule_id: int, rule: TrafficRuleUpdate, db: Session = Depends(get_db)):
    # Note: Admin-only check should go here
    db_rule = db.query(TrafficRule).filter(TrafficRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    update_data = rule.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_rule, key, value)
    
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    # Note: Admin-only check should go here
    # Soft delete
    db_rule = db.query(TrafficRule).filter(TrafficRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db_rule.status = "inactive"
    db.commit()
    return {"message": "Rule deactivated successfully"}
