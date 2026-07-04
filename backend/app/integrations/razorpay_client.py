"""Razorpay payment-link integration + webhook signature verification.

Modes:
  mock     -> caller falls back to a upi:// deep link (see services/payments.py).
  razorpay -> create a hosted Payment Link via the Razorpay API (stdlib urllib).

Webhook authenticity is verified with HMAC-SHA256 over the raw request body using
RAZORPAY_WEBHOOK_SECRET, exactly as Razorpay documents.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import urllib.request

from ..config import settings

log = logging.getLogger("munim.razorpay")

PAYMENT_LINKS_API = "https://api.razorpay.com/v1/payment_links"


def create_payment_link(amount_rupees: float, description: str, reference_id: str,
                        customer_contact: str = "") -> str:
    key, secret = settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET
    if not (key and secret):
        raise RuntimeError("Razorpay not configured: set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET")
    body = json.dumps({
        "amount": int(round(amount_rupees * 100)),  # paise
        "currency": "INR",
        "accept_partial": False,
        "description": description,
        "reference_id": reference_id,
        "notes": {"order_id": reference_id},
        "customer": {"contact": customer_contact} if customer_contact else {},
    }).encode()
    req = urllib.request.Request(PAYMENT_LINKS_API, data=body, method="POST")
    auth = base64.b64encode(f"{key}:{secret}".encode()).decode()
    req.add_header("Authorization", f"Basic {auth}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=10) as resp:  # pragma: no cover - network
        payload = json.loads(resp.read())
    log.info("[razorpay] payment link created id=%s ref=%s", payload.get("id"), reference_id)
    return payload["short_url"]


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """HMAC-SHA256(raw_body, webhook_secret) == X-Razorpay-Signature."""
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret:
        log.warning("razorpay webhook secret not set — cannot verify signature")
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")
