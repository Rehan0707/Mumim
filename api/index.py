"""Vercel serverless entrypoint for the FastAPI backend.

The app code lives under backend/app so the same FastAPI instance can run on
local Uvicorn, Render, and Vercel without duplicating routers.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import os

# Vercel deployments require a persistent database (e.g. Neon Postgres)
if os.environ.get("VERCEL") == "1" or "VERCEL_ENV" in os.environ:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url or "sqlite" in db_url:
        raise RuntimeError(
            "Vercel deployments require a persistent database. "
            "Please set a valid PostgreSQL DATABASE_URL in your Vercel Environment Variables. "
            "SQLite is ephemeral and will not persist data between serverless invocations."
        )

from app.main import app  # noqa: E402
