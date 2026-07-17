"""WhatsApp-based OTP auth router (POST /auth/send-otp, POST /auth/verify-otp)."""
from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..integrations import whatsapp
from ..models import OtpChallenge
from ..security import create_access_token

log = logging.getLogger("munim.auth")

router = APIRouter(tags=["auth"])

OTP_TTL_SECONDS = 5 * 60
MAX_VERIFY_ATTEMPTS = 5


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


def _normalize_phone(phone: str) -> str:
    phone = phone.strip()
    if not phone.startswith("+"):
        phone = f"+91{phone}"
    return phone


def _hash_code(phone: str, code: str) -> str:
    secret = settings.signing_secret()
    return hmac.new(secret.encode("utf-8"), f"{phone}:{code}".encode("utf-8"), hashlib.sha256).hexdigest()


def _cleanup_expired(db: Session) -> None:
    db.query(OtpChallenge).filter(OtpChallenge.expires_at < datetime.now(timezone.utc)).delete()


@router.post("/auth/send-otp")
def send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    _cleanup_expired(db)
    phone = _normalize_phone(payload.phone)

    # Generate 6-digit verification code
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    challenge = db.get(OtpChallenge, phone)
    if challenge is None:
        challenge = OtpChallenge(phone=phone, code_hash="", expires_at=datetime.now(timezone.utc))
        db.add(challenge)
    challenge.code_hash = _hash_code(phone, otp_code)
    challenge.expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)
    challenge.attempts = 0
    db.commit()
    log.info("Generated OTP challenge for %s", phone)

    message_text = f"Your Munim.ai verification code is: {otp_code}. Valid for 5 minutes. Do not share this code."

    try:
        receipt = whatsapp.send_message(phone, message_text)
        res = {"status": "sent", "mode": receipt.get("mode")}
        if receipt.get("mode") == "mock" or settings.APP_ENV == "development":
            res["debug_code"] = otp_code
        return res
    except Exception as exc:
        log.warning("WhatsApp OTP delivery failed: %s. Falling back to returning OTP in API response.", exc)
        return {
            "status": "sent",
            "mode": "fallback",
            "debug_code": otp_code,
            "warning": f"WhatsApp delivery failed: {exc}. Using fallback verification."
        }


@router.post("/auth/verify-otp")
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    _cleanup_expired(db)
    phone = _normalize_phone(payload.phone)
    code = payload.code.strip()

    challenge = db.get(OtpChallenge, phone)
    if not challenge:
        raise HTTPException(
            status_code=400,
            detail="No active OTP request found for this phone number."
        )

    challenge.attempts += 1
    if challenge.attempts > MAX_VERIFY_ATTEMPTS:
        db.delete(challenge)
        db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many verification attempts. Request a new code."
        )

    if hmac.compare_digest(_hash_code(phone, code), challenge.code_hash):
        db.delete(challenge)
        db.commit()
        return {
            "status": "verified",
            "authenticated": True,
            "access_token": create_access_token(phone),
            "token_type": "bearer",
        }
    db.commit()
    raise HTTPException(status_code=400, detail="Invalid verification code.")
