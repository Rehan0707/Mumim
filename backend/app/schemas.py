"""Pydantic request/response models."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class InboundMessage(BaseModel):
    """Simulator / Twilio-normalized inbound event."""
    from_no: str
    type: str = "text"  # text | voice | image
    text: Optional[str] = None
    media_url: Optional[str] = None
    name: Optional[str] = None
    business_id: Optional[str] = None


class SemanticSearchRequest(BaseModel):
    business_id: str
    query: str


class ProductIn(BaseModel):
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    attributes: dict = {}
    price: float
    stock_qty: int = 0
    image_url: Optional[str] = None


class OrderItemIn(BaseModel):
    product_id: str
    qty: int = 1


class OrderIn(BaseModel):
    business_id: str
    customer_no: str
    customer_name: Optional[str] = None
    items: List[OrderItemIn]
