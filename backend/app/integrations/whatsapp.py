"""WhatsApp outbound sender (Sender Service in the TRD gateway layer).

Modes:
  mock   -> log the outbound message and return a fake receipt (simulator reads
            the reply from the HTTP response instead).
  twilio -> POST to the Twilio WhatsApp API using stdlib urllib (no SDK dependency).

Set WHATSAPP_MODE=twilio + TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
TWILIO_WHATSAPP_FROM to go live via the Twilio Sandbox.
"""
from __future__ import annotations

import base64
import json
import logging
import urllib.parse
import urllib.request

from ..config import settings

log = logging.getLogger("munim.whatsapp")

TWILIO_API = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


def send_message(to: str, body: str) -> dict:
    """Send a WhatsApp message to `to`. Returns a receipt dict."""
    if settings.WHATSAPP_MODE != "twilio":
        log.info("[mock-whatsapp] -> %s: %s", to, (body or "").replace("\n", " ⏎ "))
        return {"mode": "mock", "to": to, "status": "logged"}
    return _send_twilio(to, body)


def _send_twilio(to: str, body: str) -> dict:
    sid, token, sender = (
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_WHATSAPP_FROM,
    )
    if not (sid and token and sender):
        raise RuntimeError(
            "Twilio not configured: set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM"
        )
    data = urllib.parse.urlencode(
        {"From": f"whatsapp:{sender}", "To": f"whatsapp:{to}", "Body": body}
    ).encode()
    req = urllib.request.Request(TWILIO_API.format(sid=sid), data=data, method="POST")
    auth = base64.b64encode(f"{sid}:{token}".encode()).decode()
    req.add_header("Authorization", f"Basic {auth}")
    with urllib.request.urlopen(req, timeout=10) as resp:  # pragma: no cover - network
        payload = json.loads(resp.read())
    log.info("[twilio] sent sid=%s to=%s", payload.get("sid"), to)
    return {"mode": "twilio", "to": to, "status": "sent", "sid": payload.get("sid")}
