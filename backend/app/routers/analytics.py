"""Analytics + forecast (spec T3: GET /analytics/summary).

KPIs are computed live. The 7-day forecast is a lightweight moving-average
projection standing in for the LightGBM model (swap-in later).
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Customer, Order, OrderItem, Product
from ..services.reply import LOW_STOCK_THRESHOLD

router = APIRouter(tags=["analytics"])


@router.get("/analytics/summary")
def summary(business_id: str, db: Session = Depends(get_db)):
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
