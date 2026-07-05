"""WhatsApp webhook — entry point for the message pipeline.

- GET  /webhook/whatsapp  : verification challenge (Meta Cloud API)
- POST /webhook/whatsapp  : inbound event (simulator JSON or Twilio form-encoded)

In mock mode the simulator POSTs JSON and reads the reply from the response body.
The same handler drives real Twilio/Meta payloads after normalization.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..integrations import whatsapp
from ..models import Business
from ..schemas import InboundMessage
from ..services import pipeline
from ..ws import manager

router = APIRouter(prefix="/webhook", tags=["webhook"])


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


async def _run(db: Session, business: Business, msg: InboundMessage) -> dict:
    out = pipeline.handle_message(
        db, business, from_no=msg.from_no, input_type=msg.type,
        text=msg.text, media_url=msg.media_url, customer_name=msg.name,
    )
    for event in out["events"]:
        await manager.broadcast(business.id, event)
    # twilio mode actively sends the reply; mock mode logs it (the simulator reads
    # the reply from the HTTP response). send_message() branches on WHATSAPP_MODE.
    whatsapp.send_message(msg.from_no, out["reply"])
    return out


@router.post("/whatsapp")
async def inbound(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        payload = await request.json()
        msg = InboundMessage(**payload)
    else:  # Twilio sandbox posts form-encoded
        form = await request.form()
        msg = InboundMessage(
            from_no=str(form.get("From", "")).replace("whatsapp:", ""),
            type="image" if form.get("NumMedia") not in (None, "0") else "text",
            text=form.get("Body"),
            media_url=form.get("MediaUrl0"),
        )
    business = _resolve_business(db, msg.business_id)
    out = await _run(db, business, msg)
    return {"reply": out["reply"], "intent": out["intent"], "lang": out["lang"],
            "matches": out.get("matches", [])}
