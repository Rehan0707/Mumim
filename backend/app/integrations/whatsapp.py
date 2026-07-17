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
import hashlib
import hmac
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from ..config import settings

log = logging.getLogger("munim.whatsapp")

TWILIO_API = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


# 👈 YAHAN 'media_url' parameter add kiya hai
def send_message(to: str, body: str, media_url: str = None) -> dict:
    """Send a WhatsApp message to `to`. Returns a receipt dict."""
    if settings.WHATSAPP_MODE != "twilio":
        if settings.is_production and not settings.allow_production_mocks:
            raise RuntimeError("mock WhatsApp sender is disabled in production")
        log.info("[mock-whatsapp] -> %s: %s (media: %s)", to, (body or "").replace("\n", " ⏎ "), media_url)
        return {"mode": "mock", "to": to, "status": "logged", "media": media_url}
    return _send_twilio(to, body, media_url)


# 👈 YAHAN BHI 'media_url' handle kiya hai
def _send_twilio(to: str, body: str, media_url: str = None) -> dict:
    sid, token, sender = (
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_WHATSAPP_FROM,
    )
    if not (sid and token and sender):
        raise RuntimeError(
            "Twilio not configured: set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM"
        )
    
    # Strip "whatsapp:" prefix if present to avoid double-prefixing
    sender = sender.strip()
    if sender.lower().startswith("whatsapp:"):
        sender = sender[len("whatsapp:"):]
    to = to.strip()
    if to.lower().startswith("whatsapp:"):
        to = to[len("whatsapp:"):]

    import re
    params = {"From": f"whatsapp:{sender}", "To": f"whatsapp:{to}"}
    template_sid = settings.TWILIO_OTP_TEMPLATE_SID
    if template_sid:
        params["ContentSid"] = template_sid
        otp_match = re.search(r"\b\d{6}\b", body)
        if otp_match:
            otp_code = otp_match.group(0)
            params["ContentVariables"] = json.dumps({"1": otp_code})
    else:
        params["Body"] = body

    if media_url:
        params["MediaUrl"] = media_url

    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(TWILIO_API.format(sid=sid), data=data, method="POST")
    auth = base64.b64encode(f"{sid}:{token}".encode()).decode()
    req.add_header("Authorization", f"Basic {auth}")
    
    import time
    max_retries = 3
    retry_delay = 1.0
    
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                payload = json.loads(resp.read())
            log.info("[twilio] sent sid=%s to=%s", payload.get("sid"), to)
            return {"mode": "twilio", "to": to, "status": "sent", "sid": payload.get("sid")}
        except urllib.error.HTTPError as err:
            if err.code == 429 and attempt < max_retries - 1:
                log.warning("Twilio returned 429 (attempt %s/%s). Retrying in %ss...", attempt + 1, max_retries, retry_delay)
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            try:
                err_body = err.read().decode("utf-8")
                err_data = json.loads(err_body)
                msg = err_data.get("message", err_body)
                code = err_data.get("code", "")
                more_info = err_data.get("more_info", "")
                raise RuntimeError(f"Twilio Error {code}: {msg} {more_info}".strip())
            except Exception:
                raise RuntimeError(f"Twilio API returned HTTP {err.code}: {err.reason}")


def verify_twilio_signature(url: str, form: dict, signature: str) -> bool:
    """Validate Twilio's X-Twilio-Signature header for inbound webhooks."""
    token = settings.TWILIO_AUTH_TOKEN
    if not token or not signature:
        log.warning("Twilio signature verification failed: token or signature missing")
        return False
    pieces = [url]
    for key in sorted(form):
        pieces.append(f"{key}{form[key]}")
    digest = hmac.new(token.encode("utf-8"), "".join(pieces).encode("utf-8"), hashlib.sha1).digest()
    expected = base64.b64encode(digest).decode("ascii")
    matched = hmac.compare_digest(expected, signature)
    if not matched:
        log.warning("Twilio signature mismatch! Expected: %s, Sent: %s, URL: %s", expected, signature, url)
    return matched
