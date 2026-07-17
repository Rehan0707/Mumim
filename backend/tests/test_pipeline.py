"""End-to-end hero flow through the webhook + message pipeline."""

from app.db import SessionLocal
from app.models import Order


def test_text_hero_flow(client, business_id):
    # 1. Availability query
    q = client.post("/webhook/whatsapp", json={
        "from_no": "+919000000001", "text": "Nike shoes size 9 available?", "business_id": business_id,
    }).json()
    assert "Nike" in q["reply"]

    # 2. Confirmation → order created with a payment link
    o = client.post("/webhook/whatsapp", json={
        "from_no": "+919000000001", "text": "yes", "business_id": business_id,
    }).json()
    assert "Order" in o["reply"]
    assert "upi://" in o["reply"]


def test_greeting_flow(client, business_id):
    r = client.post("/webhook/whatsapp", json={
        "from_no": "+919000000002", "text": "hello", "business_id": business_id,
    }).json()
    assert r["intent"] == "GREETING"


def test_unknown_never_dead_ends(client, business_id):
    r = client.post("/webhook/whatsapp", json={
        "from_no": "+919000000003", "text": "asdfqwer zxcv", "business_id": business_id,
    }).json()
    assert r["reply"]  # always some fallback reply


def test_visual_search_flow(client, business_id):
    r = client.post("/webhook/whatsapp", json={
        "from_no": "+919000000004", "type": "image",
        "media_url": "http://x/img.jpg?q=blue checked shirt", "business_id": business_id,
    }).json()
    assert r["reply"]
    assert r["intent"] == "QUERY"


def test_twilio_form_webhook_returns_twiml(client):
    r = client.post("/webhook/whatsapp", data={
        "MessageSid": "SM_text_1",
        "From": "whatsapp:+919000000005",
        "To": "whatsapp:+14155238886",
        "Body": "Nike shoes size 9 available?",
        "NumMedia": "0",
    })
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")
    assert "<Response><Message>" in r.text
    assert "Nike" in r.text


def test_twilio_media_content_type_maps_voice(client):
    r = client.post("/webhook/whatsapp", data={
        "MessageSid": "SM_voice_1",
        "From": "whatsapp:+919000000006",
        "To": "whatsapp:+14155238886",
        "Body": "",
        "NumMedia": "1",
        "MediaUrl0": "https://api.twilio.com/media/audio.ogg",
        "MediaContentType0": "audio/ogg",
    })
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")
    assert "<Message>" in r.text


def test_twilio_retry_does_not_duplicate_order(client):
    client.post("/webhook/whatsapp", data={
        "MessageSid": "SM_stage_once",
        "From": "whatsapp:+919000000007",
        "To": "whatsapp:+14155238886",
        "Body": "Nike shoes size 9 available?",
        "NumMedia": "0",
    })
    confirm = {
        "MessageSid": "SM_confirm_once",
        "From": "whatsapp:+919000000007",
        "To": "whatsapp:+14155238886",
        "Body": "yes",
        "NumMedia": "0",
    }
    first = client.post("/webhook/whatsapp", data=confirm)
    second = client.post("/webhook/whatsapp", data=confirm)
    assert first.text == second.text

    db = SessionLocal()
    try:
        orders = db.query(Order).filter(Order.customer.has(whatsapp_no="+919000000007")).all()
        assert len(orders) == 1
    finally:
        db.close()
