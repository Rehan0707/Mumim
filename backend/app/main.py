"""Munim.ai FastAPI application entrypoint.

Wires: structured logging → request middleware → CORS → global exception handlers
→ routers. Rich OpenAPI/Swagger metadata is served at /docs (Swagger UI) and
/redoc (ReDoc).
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Base, engine
from .errors import register_exception_handlers
from .logging_config import setup_logging
from .middleware import RequestContextMiddleware
from .routers import analytics, auth, business, customers, health, media, nlu, orders, products, webhook
from .routers import ws as ws_router

setup_logging(settings.LOG_LEVEL)
log = logging.getLogger("munim")

TAGS_METADATA = [
    {"name": "health", "description": "Liveness/readiness probes for deploys & monitoring."},
    {"name": "webhook", "description": "Inbound WhatsApp events (simulator / Twilio / Meta)."},
    {"name": "nlu", "description": "Language detect, intent classify, entity extract."},
    {"name": "media", "description": "Voice transcription & visual (Dikhao) search endpoints."},
    {"name": "products", "description": "Catalog / inventory + semantic search."},
    {"name": "orders", "description": "Order lifecycle, payments & webhooks."},
    {"name": "crm", "description": "Customers, segments & purchase history."},
    {"name": "analytics", "description": "KPIs, revenue trend & restock forecast."},
    {"name": "business", "description": "Shop settings (UPI id, language, category)."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed if database is empty (Render deployment)
    import os
    if os.environ.get("AUTO_SEED", "").strip().lower() in {"1", "true", "yes"}:
        from .db import SessionLocal
        from .models import Business
        from .seed import run as seed_db
        
        with SessionLocal() as db:
            if not db.query(Business).first():
                seed_db()

    log.info(
        "Munim.ai starting | env=%s payment=%s whatsapp=%s db=%s",
        settings.APP_ENV, settings.PAYMENT_MODE, settings.WHATSAPP_MODE,
        settings.DATABASE_URL.split("://")[0],
    )
    if os.environ.get("VISION_PRELOAD", "").strip().lower() in {"1", "true", "yes"}:
        from .services import vision
        vision.warmup()
    yield
    log.info("Munim.ai shutting down")


app = FastAPI(
    title="Munim.ai API",
    version="1.0.0",
    description=(
        "WhatsApp-first AI Business Operating System for local shops.\n\n"
        "One message pipeline handles text/voice/image → NLU → catalog search → "
        "order + payment + inventory, with live dashboard push. Built for the "
        "Takeover'26 hackathon. Runs fully in **mock mode** with zero external keys."
    ),
    openapi_tags=TAGS_METADATA,
    contact={"name": "Munim.ai Team", "url": "https://github.com/Rehan0707/Mumim"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
)

# Order matters: request-context (outermost) wraps CORS wraps the app.
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://munim-app.web.app",
        "https://munim-app-rehan.web.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time-ms"],
)

register_exception_handlers(app)

for r in (health, webhook, nlu, media, products, orders, customers, analytics, business, auth, ws_router):
    app.include_router(r.router)
