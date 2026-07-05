"""Business / settings endpoints (spec: Settings screen)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Business

router = APIRouter(tags=["business"])


class BusinessCreate(BaseModel):
    """Shop creation (owner onboarding). Requested in PR #1 to unblock the E2E flow."""
    name: str = Field(..., min_length=1)
    whatsapp_no: str = Field(..., min_length=1)
    category: Optional[str] = None
    lang_default: str = "hi"
    upi_id: Optional[str] = None


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    upi_id: Optional[str] = None
    lang_default: Optional[str] = None
    category: Optional[str] = None


def _serialize(b: Business) -> dict:
    return {"id": b.id, "name": b.name, "whatsapp_no": b.whatsapp_no, "category": b.category,
            "lang_default": b.lang_default, "upi_id": b.upi_id}


@router.get("/businesses")
def list_businesses(db: Session = Depends(get_db)):
    return [_serialize(b) for b in db.query(Business).all()]


@router.post("/businesses", status_code=201)
def create_business(body: BusinessCreate, db: Session = Depends(get_db)):
    """Create a shop (owner onboarding). whatsapp_no must be unique."""
    if db.query(Business).filter(Business.whatsapp_no == body.whatsapp_no).first():
        raise HTTPException(409, "a business with this whatsapp_no already exists")
    business = Business(**body.model_dump())
    db.add(business)
    db.commit()
    db.refresh(business)
    return _serialize(business)


@router.get("/businesses/{business_id}")
def get_business(business_id: str, db: Session = Depends(get_db)):
    b = db.get(Business, business_id)
    if b is None:
        raise HTTPException(404, "business not found")
    return _serialize(b)


@router.patch("/businesses/{business_id}")
def update_business(business_id: str, body: BusinessUpdate, db: Session = Depends(get_db)):
    b = db.get(Business, business_id)
    if b is None:
        raise HTTPException(404, "business not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(b, field, value)
    db.commit()
    db.refresh(b)
    return _serialize(b)
