"""WhatsApp webhook — entry point for the message pipeline.

- GET  /webhook/whatsapp  : verification challenge (Meta Cloud API)
- POST /webhook/whatsapp  : inbound event (simulator JSON or Twilio form-encoded)

In mock mode the simulator POSTs JSON and reads the reply from the response body.
The same handler drives real Twilio/Meta payloads after normalization.
"""
from __future__ import annotations

from html import escape
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..integrations import whatsapp
from ..models import Business
from ..schemas import InboundMessage
from ..security import require_owner_request
from ..services import pipeline
from ..ws import manager

router = APIRouter(prefix="/webhook", tags=["webhook"])

# Twilio retries the same inbound MessageSid when a webhook times out or returns
# a transient error. Cache the normalized pipeline output in-process so a retry
# cannot place the same order twice during a live demo.
_TWILIO_CACHE: dict[str, dict] = {}


@router.get("/whatsapp")
async def verify(request: Request):
    params = request.query_params
    if params.get("hub.mode") == "subscribe":
        return int(params.get("hub.challenge", 0))
    return {"status": "ok"}


def _resolve_business(db: Session, business_id: str = None) -> Business:
    q = db.query(Business)
    business = q.filter(Business.id == business_id).first() if business_id else q.first()
    if business is None:
        raise HTTPException(404, "no business configured — run the seed script")
    return business


async def _run(db: Session, business: Business, msg: InboundMessage, send_outbound: bool = True) -> dict:
    out = pipeline.handle_message(
        db, business, from_no=msg.from_no, input_type=msg.type,
        text=msg.text, media_url=msg.media_url, customer_name=msg.name,
    )
    for event in out["events"]:
        await manager.broadcast(business.id, event)
    # twilio mode actively sends the reply; mock mode logs it (the simulator reads
    # the reply from the HTTP response). send_message() branches on WHATSAPP_MODE.
    # An outbound-send failure (e.g. recipient not joined to the sandbox) must never
    # break inbound processing — log and continue; the reply is still in the response.
    if send_outbound:
        try:
            import asyncio
            loop = asyncio.get_running_loop()
            loop.run_in_executor(None, whatsapp.send_message, msg.from_no, out["reply"])
        except Exception as exc:
            logging.getLogger("munim.webhook").warning("outbound send failed: %s", exc)
    return out


def _twilio_type(form) -> str:
    """Map Twilio's media fields to Munim's input_type values."""
    if form.get("NumMedia") in (None, "0", 0):
        return "text"
    content_type = str(form.get("MediaContentType0") or "").lower()
    if content_type.startswith("audio/"):
        return "voice"
    if content_type.startswith("image/"):
        return "image"
    return "image"


def _twiml(reply: str) -> Response:
    body = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escape(reply or "")}</Message></Response>'
    return Response(content=body, media_type="application/xml")


@router.post("/whatsapp")
async def inbound(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    msg = None  # msg ko yahan initialize karna zaroori hai

    if "application/json" in content_type:
        if settings.auth_required:
            require_owner_request(request)
        payload = await request.json()
        msg = InboundMessage(**payload)
        business = _resolve_business(db, msg.business_id)
        out = await _run(db, business, msg)
        return {"reply": out["reply"], "intent": out["intent"], "lang": out["lang"],
                "matches": out.get("matches", [])}
    else:  # Twilio sandbox posts form-encoded
        form = await request.form()
        if settings.WHATSAPP_MODE == "twilio" and settings.is_production:
            form_dict = {k: str(v) for k, v in form.items()}
            base_url = settings.PUBLIC_BASE_URL.rstrip("/") if settings.PUBLIC_BASE_URL else ""
            signed_url = f"{base_url}{request.url.path}" if base_url else str(request.url)
            signature = request.headers.get("X-Twilio-Signature", "")
            if not whatsapp.verify_twilio_signature(signed_url, form_dict, signature):
                raise HTTPException(401, "invalid Twilio webhook signature")
        sid = str(form.get("MessageSid") or form.get("SmsMessageSid") or "")
        if sid and sid in _TWILIO_CACHE:
            return _twiml(_TWILIO_CACHE[sid]["reply"])
        msg = InboundMessage(
            from_no=str(form.get("From", "")).replace("whatsapp:", ""),
            type=_twilio_type(form),
            text=form.get("Body"),
            media_url=form.get("MediaUrl0"),
        )
        query_business_id = request.query_params.get("business_id")
        business = _resolve_business(db, msg.business_id or query_business_id)
        # Twilio can send replies straight from the webhook response. That is more
        # reliable for the Sandbox than doing a second REST API call from localhost.
        out = await _run(db, business, msg, send_outbound=False)
        if sid:
            _TWILIO_CACHE[sid] = out
        return _twiml(out.get("reply", ""))
