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
    FRONTEND_ORIGIN: str = os.environ.get("FRONTEND_ORIGIN", "https://munim-app.web.app")
    PUBLIC_BASE_URL: str = os.environ.get("PUBLIC_BASE_URL", "")
    APP_SECRET: str = os.environ.get("APP_SECRET", "")
    TOKEN_TTL_SECONDS: int = int(os.environ.get("TOKEN_TTL_SECONDS", str(7 * 24 * 60 * 60)))

    # --- data / ML ---
    DATABASE_URL: str = _resolve_db_url(os.environ.get("DATABASE_URL", "sqlite:///./munim.db"))
    EMBEDDING_DIM: int = 384  # matches products.text_embedding VECTOR(384) in the spec

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

    @property
    def auth_required(self) -> bool:
        return _bool("AUTH_REQUIRED", self.is_production)

    @property
    def allow_mock_ai(self) -> bool:
        return _bool("ALLOW_MOCK_AI", not self.is_production)

    @property
    def allow_production_mocks(self) -> bool:
        return _bool("ALLOW_PRODUCTION_MOCKS", False)

    def signing_secret(self) -> str:
        if self.APP_SECRET:
            return self.APP_SECRET
        if self.is_production:
            raise RuntimeError("APP_SECRET must be set in production")
        return "munim-local-dev-secret-change-before-production"

    def production_ready_errors(self) -> list[str]:
        if not self.is_production:
            return []

        errors: list[str] = []
        if self.auth_required and len(self.APP_SECRET) < 32:
            errors.append("APP_SECRET must be at least 32 characters when auth is required")
        if not self.auth_required:
            errors.append("AUTH_REQUIRED=false is not market-ready in production")
        if self.PAYMENT_MODE == "mock" and not self.allow_production_mocks:
            errors.append("PAYMENT_MODE=mock is disabled in production")
        if self.WHATSAPP_MODE == "mock" and not self.allow_production_mocks:
            errors.append("WHATSAPP_MODE=mock is disabled in production")
        if self.WHATSAPP_MODE == "twilio" and not self.TWILIO_AUTH_TOKEN:
            errors.append("TWILIO_AUTH_TOKEN is required for Twilio webhook verification")
        if self.PAYMENT_MODE == "razorpay" and not self.RAZORPAY_WEBHOOK_SECRET:
            errors.append("RAZORPAY_WEBHOOK_SECRET is required for payment webhook verification")
        return errors


settings = Settings()
