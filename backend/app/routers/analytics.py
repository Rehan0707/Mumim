"""Analytics + forecast (spec T3: GET /analytics/summary).

KPIs are computed live. The 7-day forecast is a lightweight moving-average
projection standing in for the LightGBM model (swap-in later).
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Customer, Order, OrderItem, Product
from ..services.reply import LOW_STOCK_THRESHOLD

router = APIRouter(tags=["analytics"])


@router.get("/analytics/summary")
def summary(business_id: str, db: Session = Depends(get_db)):
    data = _build_analytics(db, business_id)
    return {
        "kpis": data["kpis"],
        "revenue_trend": data["revenue_trend"],
        "forecast": data["forecast"],
        "top_items": data["top_items"],
        "low_stock": data["low_stock"],
        "recommendations": _recommendations(db, business_id),
    }


@router.get("/analytics/daily-summary")
def daily_summary(business_id: str, db: Session = Depends(get_db)):
    """Owner WhatsApp daily summary (PRD F10).

    This returns the exact message the scheduler/Twilio sender can push at night.
    For the demo it is callable on demand, so no Redis/Celery dependency is needed.
    """
    data = _build_analytics(db, business_id)
    kpis = data["kpis"]
    top = data["top_items"][0]["name"] if data["top_items"] else "No sales yet"
    low = data["low_stock"][:3]
    restock = ", ".join(f"{p['name']} ({p['stock_qty']})" for p in low) if low else "All stock healthy"
    message = (
        "Munim daily summary:\n"
        f"Orders today: {kpis['orders_today']}\n"
        f"Paid revenue: Rs {kpis['revenue_total']:.2f}\n"
        f"Pending orders: {kpis['pending']}\n"
        f"Top item: {top}\n"
        f"Restock: {restock}"
    )
    return {
        "business_id": business_id,
        "channel": "whatsapp",
        "message": message,
        "kpis": kpis,
        "restock": low,
    }


@router.get("/recommendations")
def recommendations(business_id: str, product_id: str | None = None, db: Session = Depends(get_db)):
    """Product recommendations (PRD F12).

    Uses order co-occurrence when a product is supplied, then falls back to
    category/top-seller signals so sparse demo data still produces useful results.
    """
    if product_id and not db.get(Product, product_id):
        raise HTTPException(404, "product not found")
    return {"recommendations": _recommendations(db, business_id, product_id)}


def _build_analytics(db: Session, business_id: str) -> dict:
    orders = db.query(Order).filter(Order.business_id == business_id).all()
    paid = [o for o in orders if o.status in ("paid", "fulfilled")]
    today = datetime.now(timezone.utc).date()

    def _is_today(o):
        return o.created_at and o.created_at.date() == today

    revenue = sum(float(o.total) for o in paid)
    todays_orders = [o for o in orders if _is_today(o)]
    pending = [o for o in orders if o.status in ("created", "reserved")]

    # revenue trend (last 7 days)
    trend = defaultdict(float)
    for o in paid:
        if o.paid_at:
            trend[o.paid_at.date().isoformat()] += float(o.total)
    days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    revenue_trend = [{"date": d, "revenue": round(trend.get(d, 0.0), 2)} for d in days]

    # top items by qty sold
    qty_by_product = defaultdict(int)
    rev_by_product = defaultdict(float)
    items = (db.query(OrderItem).join(Order)
             .filter(Order.business_id == business_id, Order.status.in_(("paid", "fulfilled"))).all())
    for it in items:
        qty_by_product[it.product_id] += it.qty
        rev_by_product[it.product_id] += it.qty * float(it.unit_price)
    products = {p.id: p for p in db.query(Product).filter(Product.business_id == business_id).all()}
    top_items = sorted(
        ({"name": products[pid].name if pid in products else "?",
          "qty": q, "revenue": round(rev_by_product[pid], 2)} for pid, q in qty_by_product.items()),
        key=lambda x: x["qty"], reverse=True,
    )[:5]

    # restock alerts (low stock) + naive 7-day forecast (7-day avg daily revenue)
    low_stock = [{"name": p.name, "stock_qty": p.stock_qty}
                 for p in products.values() if p.is_active and p.stock_qty <= LOW_STOCK_THRESHOLD]
    avg_daily = (sum(x["revenue"] for x in revenue_trend) / 7) if revenue_trend else 0
    forecast = [{"date": (today + timedelta(days=i)).isoformat(), "revenue": round(avg_daily, 2)}
                for i in range(1, 8)]

    customers = db.query(Customer).filter(Customer.business_id == business_id).count()

    return {
        "kpis": {
            "revenue_total": round(revenue, 2),
            "orders_today": len(todays_orders),
            "orders_total": len(orders),
            "pending": len(pending),
            "customers": customers,
            "low_stock_count": len(low_stock),
        },
        "revenue_trend": revenue_trend,
        "forecast": forecast,
        "top_items": top_items,
        "low_stock": low_stock,
    }


def _recommendations(db: Session, business_id: str, product_id: str | None = None, limit: int = 5) -> list[dict]:
    products = {
        p.id: p for p in db.query(Product)
        .filter(Product.business_id == business_id, Product.is_active.is_(True))
        .all()
    }
    if not products:
        return []

    paid_orders = (
        db.query(Order)
        .filter(Order.business_id == business_id, Order.status.in_(("paid", "fulfilled")))
        .all()
    )
    score: Counter[str] = Counter()
    reasons: dict[str, str] = {}

    if product_id:
        for order in paid_orders:
            ids = [item.product_id for item in order.items]
            if product_id not in ids:
                continue
            for pid in ids:
                if pid != product_id and pid in products:
                    score[pid] += 3
                    reasons[pid] = "Often bought together"

        base = products.get(product_id)
        if base:
            for pid, product in products.items():
                if pid == product_id:
                    continue
                if product.category and product.category == base.category:
                    score[pid] += 1
                    reasons.setdefault(pid, "Similar category")
    else:
        for order in paid_orders:
            for item in order.items:
                if item.product_id in products:
                    score[item.product_id] += item.qty
                    reasons[item.product_id] = "Top seller"

    # Sparse-data fallback: recommend stocked products, prioritising low-stock
    # nudges because they also support the owner restock story.
    for pid, product in products.items():
        if product_id and pid == product_id:
            continue
        if pid not in score:
            score[pid] += 1 if product.stock_qty > LOW_STOCK_THRESHOLD else 2
            reasons[pid] = "Good add-on"

    ranked = sorted(score.items(), key=lambda row: (row[1], products[row[0]].stock_qty), reverse=True)
    return [
        {
            "product_id": pid,
            "name": products[pid].name,
            "price": float(products[pid].price),
            "stock_qty": products[pid].stock_qty,
            "image_url": products[pid].image_url,
            "score": int(points),
            "reason": reasons.get(pid, "Recommended"),
        }
        for pid, points in ranked[:limit]
    ]
