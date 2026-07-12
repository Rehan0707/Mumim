"""WhatsApp-based OTP auth router (POST /auth/send-otp, POST /auth/verify-otp)."""
from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
import time
from dataclasses import dataclass

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..integrations import whatsapp
from ..security import create_access_token

log = logging.getLogger("munim.auth")

router = APIRouter(tags=["auth"])

OTP_TTL_SECONDS = 5 * 60
MAX_VERIFY_ATTEMPTS = 5


@dataclass
class OtpRecord:
    code_hash: str
    expires_at: float
    attempts: int = 0


_OTP_STORE: dict[str, OtpRecord] = {}


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


def _cleanup_expired() -> None:
    now = time.time()
    for phone, record in list(_OTP_STORE.items()):
        if record.expires_at < now:
            _OTP_STORE.pop(phone, None)


@router.post("/auth/send-otp")
def send_otp(payload: SendOtpRequest):
    _cleanup_expired()
    phone = _normalize_phone(payload.phone)

    # Generate 6-digit verification code
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    _OTP_STORE[phone] = OtpRecord(
        code_hash=_hash_code(phone, otp_code),
        expires_at=time.time() + OTP_TTL_SECONDS,
    )

    # Print to developer console logs for easy debugging (especially if running mock)
    print(f"\n🔑 [OTP SERVICE] Generated code for {phone} -> {otp_code} 🔑\n")
    log.info("Generated OTP for %s -> %s", phone, otp_code)

    message_text = f"Your Munim.ai verification code is: {otp_code}. Valid for 5 minutes. Do not share this code."

    try:
        receipt = whatsapp.send_message(phone, message_text)
        return {"status": "sent", "mode": receipt.get("mode")}
    except Exception as exc:
        log.error("Failed to send WhatsApp OTP: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send WhatsApp message: {exc}"
        )


@router.post("/auth/verify-otp")
def verify_otp(payload: VerifyOtpRequest):
    _cleanup_expired()
    phone = _normalize_phone(payload.phone)
    code = payload.code.strip()

    # Master bypass verification codes for easy demoing/hackathon presentations!
    if code in ("888888", "123456"):
        _OTP_STORE.pop(phone, None)
        return {
            "status": "verified",
            "authenticated": True,
            "access_token": create_access_token(phone),
            "token_type": "bearer",
        }

    stored_code = _OTP_STORE.get(phone)
    if not stored_code:
        raise HTTPException(
            status_code=400,
            detail="No active OTP request found for this phone number."
        )

    stored_code.attempts += 1
    if stored_code.attempts > MAX_VERIFY_ATTEMPTS:
        _OTP_STORE.pop(phone, None)
        raise HTTPException(
            status_code=429,
            detail="Too many verification attempts. Request a new code."
        )

    if hmac.compare_digest(_hash_code(phone, code), stored_code.code_hash):
        # Code is correct; remove it from active store
        _OTP_STORE.pop(phone, None)
        return {
            "status": "verified",
            "authenticated": True,
            "access_token": create_access_token(phone),
            "token_type": "bearer",
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code."
        )
