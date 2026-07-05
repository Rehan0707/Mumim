"""CRM: upsert customer from a conversation, track history, recompute segment."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from ..models import Customer


def upsert_customer(db: Session, business_id: str, whatsapp_no: str, name: Optional[str] = None) -> Customer:
    customer = (
        db.query(Customer)
        .filter(Customer.business_id == business_id, Customer.whatsapp_no == whatsapp_no)
        .first()
    )
    if customer is None:
        customer = Customer(business_id=business_id, whatsapp_no=whatsapp_no, name=name, segment="new")
        db.add(customer)
        db.flush()
    elif name and not customer.name:
        customer.name = name
    return customer


def recompute_segment(customer: Customer) -> str:
    """Simple rule-based segmentation (LightGBM swap-in later)."""
    spend = float(customer.total_spend or 0)
    count = customer.order_count or 0
    last = customer.last_order

    churning = False
    if last is not None:
        last_aware = last if last.tzinfo else last.replace(tzinfo=timezone.utc)
        churning = (datetime.now(timezone.utc) - last_aware).days > 45

    if spend >= 5000 or count >= 5:
        segment = "vip"
    elif count >= 2:
        segment = "regular"
    else:
        segment = "new"
    if churning and segment != "vip":
        segment = "churning"
    customer.segment = segment
    return segment
