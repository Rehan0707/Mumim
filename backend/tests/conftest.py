"""Test fixtures: an isolated SQLite DB, re-seeded before every test.

DATABASE_URL is pointed at a throwaway temp file BEFORE the app is imported, so
tests never touch the dev munim.db.
"""
from __future__ import annotations

import os
import tempfile

import pytest

# --- configure an isolated test DB before importing the app ---
_TMP = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_TMP.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP.name}"
os.environ["PAYMENT_MODE"] = "mock"
os.environ["WHATSAPP_MODE"] = "mock"
os.environ["MUNIM_EMBEDDER"] = "hash"  # fast, deterministic embeddings in tests

from fastapi.testclient import TestClient  # noqa: E402

from app import seed  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Business  # noqa: E402


@pytest.fixture(autouse=True)
def _seed_each():
    """Fresh catalog/customers/orders before each test → full isolation."""
    seed.run()
    yield


@pytest.fixture(scope="session", autouse=True)
def _cleanup_tmp_db():
    yield
    try:
        os.unlink(_TMP.name)
    except OSError:
        pass


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def business_id():
    session = SessionLocal()
    try:
        return session.query(Business).first().id
    finally:
        session.close()
