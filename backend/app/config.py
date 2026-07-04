"""Environment-based config. Mock defaults so the app runs with zero keys."""
from __future__ import annotations

import os
from pathlib import Path


def _load_env_file() -> None:
    """Minimal .env loader (avoids a python-dotenv dependency)."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


_load_env_file()


class Settings:
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./munim.db")
    PAYMENT_MODE: str = os.environ.get("PAYMENT_MODE", "mock")
    WHATSAPP_MODE: str = os.environ.get("WHATSAPP_MODE", "mock")
    FRONTEND_ORIGIN: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
    EMBEDDING_DIM: int = 384  # matches products.text_embedding VECTOR(384) in the spec


settings = Settings()
