"""Real WhatsApp-based OTP system router (POST /auth/send-otp, POST /auth/verify-otp)."""
from __future__ import annotations

import random
import logging
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from ..integrations import whatsapp

log = logging.getLogger("munim.auth")

router = APIRouter(tags=["auth"])

# Simple in-memory store for active OTP requests (formatted_phone -> otp_code)
_OTP_STORE: dict[str, str] = {}


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


@router.post("/auth/send-otp")
def send_otp(payload: SendOtpRequest):
    phone = payload.phone.strip()
    if not phone.startswith("+"):
        phone = f"+91{phone}"  # default to India prefix

    # Generate 6-digit verification code
    otp_code = f"{random.randint(100000, 999999)}"
    _OTP_STORE[phone] = otp_code

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
    phone = payload.phone.strip()
    if not phone.startswith("+"):
        phone = f"+91{phone}"

    stored_code = _OTP_STORE.get(phone)
    if not stored_code:
        raise HTTPException(
            status_code=400,
            detail="No active OTP request found for this phone number."
        )

    if payload.code.strip() == stored_code:
        # Code is correct; remove it from active store
        del _OTP_STORE[phone]
        return {"status": "verified", "authenticated": True}
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code."
        )
