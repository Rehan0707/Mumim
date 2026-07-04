"""Munim.ai FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Base, engine
from .routers import analytics, business, customers, orders, products, webhook
from .routers import ws as ws_router

app = FastAPI(title="Munim.ai", version="1.0", description="WhatsApp-first AI business OS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok", "payment_mode": settings.PAYMENT_MODE, "whatsapp_mode": settings.WHATSAPP_MODE}


app.include_router(webhook.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(customers.router)
app.include_router(analytics.router)
app.include_router(business.router)
app.include_router(ws_router.router)
