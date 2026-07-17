"""CRM endpoints (spec T3: GET /customers/{wa_no})."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Customer, Order
from ..security import require_owner_auth
from ..services import orders as order_svc

router = APIRouter(tags=["crm"])


def _serialize(c: Customer) -> dict:
    return {
        "id": c.id, "whatsapp_no": c.whatsapp_no, "name": c.name, "segment": c.segment,
        "total_spend": float(c.total_spend or 0), "order_count": c.order_count or 0,
        "last_order": c.last_order.isoformat() if c.last_order else None,
    }


@router.get("/customers")
def list_customers(business_id: str, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    rows = (db.query(Customer).filter(Customer.business_id == business_id)
            .order_by(Customer.total_spend.desc()).all())
    return [_serialize(c) for c in rows]


@router.get("/customers/{wa_no}")
def get_customer(wa_no: str, business_id: str, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    customer = (db.query(Customer)
                .filter(Customer.business_id == business_id, Customer.whatsapp_no == wa_no).first())
    if customer is None:
        raise HTTPException(404, "customer not found")
    history = (db.query(Order).filter(Order.customer_id == customer.id)
               .order_by(Order.created_at.desc()).all())
    return {**_serialize(customer), "history": [order_svc.serialize(o) for o in history]}
