"""WhatsApp webhook — entry point for the message pipeline."""
from __future__ import annotations

import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from gtts import gTTS

from ..db import get_db
from ..integrations import whatsapp
from ..models import Business
from ..schemas import InboundMessage
from ..services import pipeline, stt
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


# 👈 Yahan humne base_url pass kiya taaki public link bana sakein
async def _run(db: Session, business: Business, msg: InboundMessage, base_url: str) -> dict:
    out = pipeline.handle_message(
        db, business, from_no=msg.from_no, input_type=msg.type,
        text=msg.text, media_url=msg.media_url, customer_name=msg.name,
    )
    for event in out["events"]:
        await manager.broadcast(business.id, event)
    
    reply_text = out.get("reply", "")
    reply_media_url = None
    
    
    # 🔊 TTS LOGIC: Agar input voice tha, toh output bhi voice banao
    if msg.type == "voice" and reply_text:
        # Ek unique file name banate hain
        filename = f"reply_{uuid.uuid4().hex}.mp3"
        filepath = os.path.join("static", filename)
        
        # NLU se language nikalo (default 'hi' rakho)
        bot_lang = out.get("lang", "hi")
        
        # gTTS mainly 'en' (English) aur 'hi' (Hindi) support karta hai
        if bot_lang not in ["hi", "en"]:
            bot_lang = "hi"
        
        import asyncio
        def generate_tts():
            # Ab language dynamic hai!
            tts = gTTS(text=reply_text, lang=bot_lang, slow=False)
            tts.save(filepath)
            
        await asyncio.to_thread(generate_tts)
        
        reply_media_url = f"{base_url}static/{filename}"
        print(f"🔊 Bot generated voice reply: {reply_media_url} (Language: {bot_lang})")

    try:
        import asyncio
        # Nayi send_message ko media_url bhi bhej rahe hain
        asyncio.create_task(asyncio.to_thread(whatsapp.send_message, msg.from_no, reply_text, reply_media_url))
    except Exception as exc:
        logging.getLogger("munim.webhook").warning("outbound send failed: %s", exc)
    
    return out


@router.post("/whatsapp")
async def inbound(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    msg = None  
    
    # Base URL extract kar rahe hain (e.g., https://tumhara-ngrok.ngrok.io/)
    base_url = str(request.base_url)

    if "application/json" in content_type:
        payload = await request.json()
        msg = InboundMessage(**payload)
    else:  
        form = await request.form()
        
        num_media = form.get("NumMedia")
        msg_type = "text"
        if num_media not in (None, "0"):
            media_content_type = form.get("MediaContentType0", "")
            if media_content_type.startswith("audio"):
                msg_type = "voice" 
            else:
                msg_type = "image"

        msg = InboundMessage(
            from_no=str(form.get("From", "")).replace("whatsapp:", ""),
            type=msg_type,
            text=form.get("Body"),
            media_url=form.get("MediaUrl0"),
        )
    
    if msg is None:
        return {"error": "Invalid request payload"}

    if msg.type == "voice" and msg.media_url:
        print(f"🎵 Voice message detected from {msg.from_no}. Sending to Whisper...")
        transcribed_text = await stt.transcribe_audio_url(msg.media_url)
        msg.text = transcribed_text  

    business = _resolve_business(db, msg.business_id)
    out = await _run(db, business, msg, base_url)  # 👈 Yahan base_url bhej diya
    
    if not out:
        return {"reply": "Sorry, I couldn't process that.", "intent": "unknown", "lang": "en", "matches": []}
    
    return {
        "reply": out.get("reply", "No reply generated"), 
        "intent": out.get("intent", "unknown"), 
        "lang": out.get("lang", "en"),
        "matches": out.get("matches", [])
    }