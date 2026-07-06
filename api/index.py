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

from app.main import app  # noqa: E402
