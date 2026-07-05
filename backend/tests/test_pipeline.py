"""End-to-end hero flow through the webhook + message pipeline."""


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
