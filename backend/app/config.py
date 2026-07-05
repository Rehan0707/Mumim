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


def _bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _resolve_db_url(url: str) -> str:
    """Anchor a relative sqlite path to the backend dir so the same DB file is used
    no matter the working directory (seed, uvicorn, and ml/ scripts all agree)."""
    prefix = "sqlite:///"
    if url.startswith(prefix) and not url.startswith("sqlite:////"):
        rel = url[len(prefix):]
        backend_dir = Path(__file__).resolve().parent.parent
        abs_path = (backend_dir / rel).resolve()
        return f"sqlite:///{abs_path}"
    return url


class Settings:
    # --- app ---
    APP_ENV: str = os.environ.get("APP_ENV", "development")
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO").upper()
    FRONTEND_ORIGIN: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

    # --- data / ML ---
<<<<<<< Updated upstream
    DATABASE_URL: str = _resolve_db_url(os.environ.get("DATABASE_URL", "sqlite:///./munim.db"))
    EMBEDDING_DIM: int = 384  # matches products.text_embedding VECTOR(384) in the spec
=======
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./munim.db")
    EMBEDDING_DIM: int = 768  # matches products.text_embedding VECTOR(384) in the spec
>>>>>>> Stashed changes

    # --- payments (mock | razorpay) ---
    PAYMENT_MODE: str = os.environ.get("PAYMENT_MODE", "mock").lower()
    RAZORPAY_KEY_ID: str = os.environ.get("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.environ.get("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

    # --- messaging (mock | twilio) ---
    WHATSAPP_MODE: str = os.environ.get("WHATSAPP_MODE", "mock").lower()
    TWILIO_ACCOUNT_SID: str = os.environ.get("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.environ.get("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_FROM: str = os.environ.get("TWILIO_WHATSAPP_FROM", "")

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in {"production", "prod"}


settings = Settings()
