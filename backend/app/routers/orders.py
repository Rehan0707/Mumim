"""Orders + payments endpoints (spec T3 / A3)."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Business, Order
from ..schemas import OrderIn
from ..security import require_owner_auth, require_owner_request
from ..services import crm, orders as order_svc, payments
from ..ws import manager

router = APIRouter(tags=["orders"])


@router.get("/orders")
def list_orders(business_id: str, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    rows = (db.query(Order).filter(Order.business_id == business_id)
            .order_by(Order.created_at.desc()).all())
    return [order_svc.serialize(o) for o in rows]


@router.get("/orders/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "order not found")
    return order_svc.serialize(order)


@router.post("/orders", status_code=201)
async def create_order(body: OrderIn, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    business = db.get(Business, body.business_id)
    if business is None:
        raise HTTPException(404, "business not found")
    customer = crm.upsert_customer(db, business.id, body.customer_no, body.customer_name)
    # OutOfStock / OrderError propagate to the global handlers (→ 409 / 400 envelopes).
    order = order_svc.place_order(
        db, business.id, customer.id,
        [{"product_id": i.product_id, "qty": i.qty} for i in body.items],
    )
    order.payment_link = payments.generate_payment_link(business, order)
    db.commit()
    db.refresh(order)
    await manager.broadcast(business.id, {"type": "new_order", "data": order_svc.serialize(order)})
    return order_svc.serialize(order)


@router.post("/orders/{order_id}/pay")
def pay(order_id: str, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "order not found")
    business = db.get(Business, order.business_id)
    if not order.payment_link:
        order.payment_link = payments.generate_payment_link(business, order)
        db.commit()
    return {"payment_link": order.payment_link, "amount": float(order.total)}


@router.post("/orders/{order_id}/fulfill")
async def fulfill(order_id: str, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "order not found")
    order_svc.fulfill_order(db, order)
    await manager.broadcast(order.business_id, {"type": "order_update", "data": order_svc.serialize(order)})
    return order_svc.serialize(order)


@router.post("/payments/webhook")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    """Razorpay/mock payment confirmation. Verifies signature (razorpay mode),
    then does an idempotent mark-paid + CRM update. Reads the raw body so the
    HMAC signature check is over the exact bytes Razorpay signed."""
    raw = await request.body()
    if payments.settings.PAYMENT_MODE == "mock" and payments.settings.auth_required:
        require_owner_request(request)
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not payments.verify_webhook_signature(raw, signature):
        raise HTTPException(401, "invalid payment webhook signature")
    try:
        payload = json.loads(raw or b"{}")
    except ValueError:
        raise HTTPException(400, "invalid JSON body")

    # Accept both the mock shape and Razorpay's nested payment-link payload.
    order_id = (
        payload.get("order_id")
        or payload.get("notes", {}).get("order_id")
        or payload.get("payload", {}).get("payment_link", {}).get("entity", {})
        .get("notes", {}).get("order_id")
    )
    order = db.get(Order, order_id) if order_id else None
    if order is None:
        raise HTTPException(404, "order not found")
    order_svc.mark_paid(db, order, payment_ref=payload.get("payment_id", "mock_pay"))
    await manager.broadcast(order.business_id, {"type": "order_update", "data": order_svc.serialize(order)})
    return order_svc.serialize(order)
