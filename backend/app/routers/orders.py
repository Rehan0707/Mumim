"""Orders + payments endpoints (spec T3 / A3)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Business, Order
from ..schemas import OrderIn
from ..services import crm, orders as order_svc, payments
from ..ws import manager

router = APIRouter(tags=["orders"])


@router.get("/orders")
def list_orders(business_id: str, db: Session = Depends(get_db)):
    rows = (db.query(Order).filter(Order.business_id == business_id)
            .order_by(Order.created_at.desc()).all())
    return [order_svc.serialize(o) for o in rows]


@router.get("/orders/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "order not found")
    return order_svc.serialize(order)


@router.post("/orders", status_code=201)
async def create_order(body: OrderIn, db: Session = Depends(get_db)):
    business = db.get(Business, body.business_id)
    if business is None:
        raise HTTPException(404, "business not found")
    customer = crm.upsert_customer(db, business.id, body.customer_no, body.customer_name)
    try:
        order = order_svc.place_order(
            db, business.id, customer.id,
            [{"product_id": i.product_id, "qty": i.qty} for i in body.items],
        )
    except order_svc.OutOfStock as e:
        raise HTTPException(409, str(e))
    order.payment_link = payments.generate_payment_link(business, order)
    db.commit()
    db.refresh(order)
    await manager.broadcast(business.id, {"type": "new_order", "data": order_svc.serialize(order)})
    return order_svc.serialize(order)


@router.post("/orders/{order_id}/pay")
def pay(order_id: str, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "order not found")
    business = db.get(Business, order.business_id)
    if not order.payment_link:
        order.payment_link = payments.generate_payment_link(business, order)
        db.commit()
    return {"payment_link": order.payment_link, "amount": float(order.total)}


@router.post("/orders/{order_id}/fulfill")
async def fulfill(order_id: str, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "order not found")
    order_svc.fulfill_order(db, order)
    await manager.broadcast(order.business_id, {"type": "order_update", "data": order_svc.serialize(order)})
    return order_svc.serialize(order)


@router.post("/payments/webhook")
async def payment_webhook(payload: dict, db: Session = Depends(get_db)):
    """Razorpay/mock payment confirmation. Idempotent mark-paid + CRM update."""
    order_id = payload.get("order_id") or payload.get("notes", {}).get("order_id")
    order = db.get(Order, order_id) if order_id else None
    if order is None:
        raise HTTPException(404, "order not found")
    order_svc.mark_paid(db, order, payment_ref=payload.get("payment_id", "mock_pay"))
    await manager.broadcast(order.business_id, {"type": "order_update", "data": order_svc.serialize(order)})
    return order_svc.serialize(order)
