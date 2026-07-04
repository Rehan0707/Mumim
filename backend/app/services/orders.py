"""Order lifecycle + transactional inventory (spec A3 state machine).

created ── reserve ──> reserved ── pay ──> paid ── handover ──> fulfilled
                          └──────── cancel ──────> cancelled (stock restored)

Reserve decrements stock in ONE transaction guarded by stock_qty >= qty, so we
never oversell even under concurrent orders.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import update
from sqlalchemy.orm import Session

from ..models import Order, OrderItem, Product
from . import crm


class OrderError(Exception):
    pass


class OutOfStock(OrderError):
    def __init__(self, product: Product, requested: int):
        self.product = product
        self.requested = requested
        super().__init__(f"{product.name}: requested {requested}, only {product.stock_qty} left")


def place_order(
    db: Session,
    business_id: str,
    customer_id: str,
    items: List[dict],
    idempotency_key: Optional[str] = None,
) -> Order:
    """Create + reserve an order atomically (stock decremented, status='reserved')."""
    if not items:
        raise OrderError("no items")

    order = Order(business_id=business_id, customer_id=customer_id, status="reserved", total=0)
    db.add(order)
    db.flush()

    total = 0.0
    for it in items:
        product = db.get(Product, it["product_id"])
        if product is None or product.business_id != business_id:
            raise OrderError("product not found")
        qty = int(it.get("qty", 1))

        # guarded decrement — rowcount 0 means insufficient stock
        result = db.execute(
            update(Product)
            .where(Product.id == product.id, Product.stock_qty >= qty)
            .values(stock_qty=Product.stock_qty - qty)
        )
        if result.rowcount == 0:
            db.rollback()
            raise OutOfStock(product, qty)

        unit_price = float(product.price)
        db.add(OrderItem(order_id=order.id, product_id=product.id, qty=qty, unit_price=unit_price))
        total += unit_price * qty

    order.total = total
    db.commit()
    db.refresh(order)
    return order


def mark_paid(db: Session, order: Order, payment_ref: Optional[str] = None) -> Order:
    if order.status == "paid":
        return order  # idempotent
    order.status = "paid"
    order.payment_ref = payment_ref
    order.paid_at = datetime.now(timezone.utc)

    customer = order.customer
    customer.total_spend = float(customer.total_spend or 0) + float(order.total)
    customer.order_count = (customer.order_count or 0) + 1
    customer.last_order = order.paid_at
    crm.recompute_segment(customer)

    db.commit()
    db.refresh(order)
    return order


def cancel_order(db: Session, order: Order) -> Order:
    if order.status in ("cancelled", "fulfilled", "paid"):
        return order
    for item in order.items:
        db.execute(
            update(Product)
            .where(Product.id == item.product_id)
            .values(stock_qty=Product.stock_qty + item.qty)
        )
    order.status = "cancelled"
    db.commit()
    db.refresh(order)
    return order


def fulfill_order(db: Session, order: Order) -> Order:
    if order.status == "paid":
        order.status = "fulfilled"
        db.commit()
        db.refresh(order)
    return order


def serialize(order: Order) -> dict:
    return {
        "id": order.id,
        "business_id": order.business_id,
        "customer_id": order.customer_id,
        "customer_name": order.customer.name if order.customer else None,
        "customer_no": order.customer.whatsapp_no if order.customer else None,
        "status": order.status,
        "total": float(order.total),
        "payment_link": order.payment_link,
        "channel": order.channel,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "items": [
            {
                "product_id": i.product_id,
                "name": i.product.name if i.product else None,
                "qty": i.qty,
                "unit_price": float(i.unit_price),
            }
            for i in order.items
        ],
    }
