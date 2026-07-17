"""WhatsApp webhook — entry point for the message pipeline."""
from __future__ import annotations

from html import escape
import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..integrations import whatsapp
from ..models import Business
from ..schemas import InboundMessage
from ..security import require_owner_request
from ..services import pipeline, stt
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


def _twiml(reply: str, media_url: str = None) -> Response:
    media_tag = f"<Media>{escape(media_url)}</Media>" if media_url else ""
    body = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>{escape(reply or "")}</Body>{media_tag}</Message></Response>'
    return Response(content=body, media_type="application/xml")


async def _run(db: Session, business: Business, msg: InboundMessage, base_url: str, send_outbound: bool = True) -> dict:
    out = pipeline.handle_message(
        db, business, from_no=msg.from_no, input_type=msg.type,
        text=msg.text, media_url=msg.media_url, customer_name=msg.name,
    )
    for event in out["events"]:
        await manager.broadcast(business.id, event)
    
    reply_text = out.get("reply", "")
    reply_media_url = None
    
    # 🔊 TTS LOGIC: If input was voice, output should also be voice
    if msg.type == "voice" and reply_text:
        # Create a unique file name
        filename = f"reply_{uuid.uuid4().hex}.mp3"
        filepath = os.path.join("static", filename)
        os.makedirs("static", exist_ok=True)
        
        # Determine language (default to 'hi')
        bot_lang = out.get("lang", "hi")
        if bot_lang not in ["hi", "en"]:
            bot_lang = "hi"
        
        import asyncio
        def generate_tts():
            try:
                from gtts import gTTS
            except ImportError:
                print("⚠️ gTTS not installed. Skipping voice reply generation.")
                return
            tts = gTTS(text=reply_text, lang=bot_lang, slow=False)
            tts.save(filepath)
            
        await asyncio.to_thread(generate_tts)
        
        # Only set reply_media_url if the file was actually written (gTTS was available)
        if os.path.exists(filepath):
            reply_media_url = f"{base_url}static/{filename}"
            out["media_url"] = reply_media_url
            print(f"🔊 Bot generated voice reply: {reply_media_url} (Language: {bot_lang})")

    if send_outbound:
        try:
            import asyncio
            asyncio.create_task(asyncio.to_thread(whatsapp.send_message, msg.from_no, reply_text, reply_media_url))
        except Exception as exc:
            logging.getLogger("munim.webhook").warning("outbound send failed: %s", exc)
    
    return out


@router.post("/whatsapp")
async def inbound(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    msg = None  
    is_json = False
    query_business_id = request.query_params.get("business_id")
    sid = None
    
    # Extract base URL (e.g. https://domain.ngrok-free.app/)
    base_url = str(request.base_url)

    if "application/json" in content_type:
        is_json = True
        if settings.auth_required:
            require_owner_request(request)
        payload = await request.json()
        msg = InboundMessage(**payload)
    else:  # Twilio sandbox posts form-encoded
        form = await request.form()
        if settings.WHATSAPP_MODE == "twilio" and settings.is_production:
            form_dict = {k: str(v) for k, v in form.items()}
            base_url_setting = settings.PUBLIC_BASE_URL.rstrip("/") if settings.PUBLIC_BASE_URL else ""
            signed_url = f"{base_url_setting}{request.url.path}" if base_url_setting else str(request.url)
            signature = request.headers.get("X-Twilio-Signature", "")
            if not whatsapp.verify_twilio_signature(signed_url, form_dict, signature):
                raise HTTPException(401, "invalid Twilio webhook signature")
        
        sid = str(form.get("MessageSid") or form.get("SmsMessageSid") or "")
        if sid and sid in _TWILIO_CACHE:
            return _twiml(_TWILIO_CACHE[sid]["reply"], _TWILIO_CACHE[sid].get("media_url"))
            
        msg = InboundMessage(
            from_no=str(form.get("From", "")).replace("whatsapp:", ""),
            type=_twilio_type(form),
            text=form.get("Body"),
            media_url=form.get("MediaUrl0"),
        )
    
    if msg is None:
        raise HTTPException(400, "Invalid request payload")

    # 🎵 Whisper Speech-to-Text translation
    if msg.type == "voice" and msg.media_url:
        print(f"🎵 Voice message detected from {msg.from_no}. Sending to Whisper...")
        transcribed_text = await stt.transcribe_audio_url(msg.media_url)
        msg.text = transcribed_text  

    business = _resolve_business(db, msg.business_id or query_business_id)
    
    if is_json:
        out = await _run(db, business, msg, base_url=base_url, send_outbound=True)
        return {"reply": out["reply"], "intent": out["intent"], "lang": out["lang"],
                "matches": out.get("matches", []), "media_url": out.get("media_url")}
    else:
        out = await _run(db, business, msg, base_url=base_url, send_outbound=False)
        if sid:
            _TWILIO_CACHE[sid] = out
        return _twiml(out.get("reply", ""), out.get("media_url"))
