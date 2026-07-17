"""Health & readiness probes (DevOps: liveness/readiness for deploys & uptime)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db

router = APIRouter(tags=["health"])
log = logging.getLogger("munim.health")


@router.get("/health", summary="Basic health + active integration modes")
def health():
    return {
        "status": "ok",
        "env": settings.APP_ENV,
        "payment_mode": settings.PAYMENT_MODE,
        "whatsapp_mode": settings.WHATSAPP_MODE,
        "twilio_whatsapp_from": settings.TWILIO_WHATSAPP_FROM,
    }


@router.get("/health/live", summary="Liveness probe (process is up)")
def live():
    return {"status": "alive"}


@router.get("/health/ready", summary="Readiness probe (DB reachable)")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - only on real DB outage
        log.error("readiness check failed: %s", exc)
        return JSONResponse(status_code=503, content={"status": "not_ready", "db": "down"})
    production_errors = settings.production_ready_errors()
    if production_errors:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "db": "up", "production_errors": production_errors},
        )
    return {"status": "ready", "db": "up"}
