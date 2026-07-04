"""Pydantic request/response models with validation."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class InboundMessage(BaseModel):
    """Simulator / Twilio-normalized inbound event."""
    from_no: str = Field(..., min_length=1, description="Customer WhatsApp number")
    type: str = Field("text", pattern="^(text|voice|image)$")
    text: Optional[str] = None
    media_url: Optional[str] = None
    name: Optional[str] = None
    business_id: Optional[str] = None


class NLUParseRequest(BaseModel):
    text: str = Field(..., min_length=1)
    lang: Optional[str] = None


class TranscribeRequest(BaseModel):
    audio_url: str = Field(..., min_length=1)
    lang: Optional[str] = None


class VisionSearchRequest(BaseModel):
    business_id: str = Field(..., min_length=1)
    image_url: str = Field(..., min_length=1)
    limit: int = Field(3, ge=1, le=20)


class SemanticSearchRequest(BaseModel):
    business_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=1)


class ProductIn(BaseModel):
    name: str = Field(..., min_length=1)
    brand: Optional[str] = None
    category: Optional[str] = None
    attributes: dict = {}
    price: float = Field(..., ge=0)
    stock_qty: int = Field(0, ge=0)
    image_url: Optional[str] = None


class OrderItemIn(BaseModel):
    product_id: str = Field(..., min_length=1)
    qty: int = Field(1, ge=1)


class OrderIn(BaseModel):
    business_id: str = Field(..., min_length=1)
    customer_no: str = Field(..., min_length=1)
    customer_name: Optional[str] = None
    items: List[OrderItemIn] = Field(..., min_length=1)
