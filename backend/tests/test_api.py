"""API surface: health, products, orders, payments, CRM, analytics, NLU, media."""


def test_health_probes(client):
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/health/live").json()["status"] == "alive"
    assert client.get("/health/ready").json()["status"] == "ready"


def test_request_id_header(client):
    r = client.get("/health")
    assert "x-request-id" in {k.lower() for k in r.headers}


def test_list_products(client, business_id):
    products = client.get(f"/products?business_id={business_id}").json()
    assert len(products) >= 20
    assert all("price" in p and "stock_qty" in p for p in products)


def test_semantic_search(client, business_id):
    r = client.post("/search/semantic", json={"business_id": business_id, "query": "Nike shoes size 9"}).json()
    names = [m["name"] for m in r["matches"]]
    assert any("Nike" in n for n in names)


def test_order_create_pay_and_webhook(client, business_id):
    product = client.get(f"/products?business_id={business_id}").json()[0]
    order = client.post("/orders", json={
        "business_id": business_id, "customer_no": "+919777000001",
        "items": [{"product_id": product["id"], "qty": 1}],
    }).json()
    assert order["status"] == "reserved"

    pay = client.post(f"/orders/{order['id']}/pay").json()
    assert pay["payment_link"].startswith("upi://")

    paid = client.post("/payments/webhook", json={"order_id": order["id"], "payment_id": "pay_x"}).json()
    assert paid["status"] == "paid"


def test_order_oversell_returns_409(client, business_id):
    product = client.get(f"/products?business_id={business_id}").json()[0]
    r = client.post("/orders", json={
        "business_id": business_id, "customer_no": "+919777000002",
        "items": [{"product_id": product["id"], "qty": 99999}],
    })
    assert r.status_code == 409
    assert r.json()["error"]["type"] == "out_of_stock"


def test_customers_and_history(client, business_id):
    customers = client.get(f"/customers?business_id={business_id}").json()
    assert len(customers) >= 1
    wa = customers[0]["whatsapp_no"]
    profile = client.get(f"/customers/{wa}?business_id={business_id}").json()
    assert "history" in profile


def test_create_business_and_duplicate_guard(client):
    body = {"name": "Priya Boutique", "whatsapp_no": "+919888800000", "category": "clothing", "upi_id": "priya@upi"}
    r = client.post("/businesses", json=body)
    assert r.status_code == 201
    created = r.json()
    assert created["name"] == "Priya Boutique" and created["id"]
    # duplicate whatsapp_no is rejected
    dup = client.post("/businesses", json=body)
    assert dup.status_code == 409


def test_end_to_end_shop_creation_flow(client):
    # PR #1's blocked flow: create shop -> add product -> order it
    biz = client.post("/businesses", json={"name": "E2E Shop", "whatsapp_no": "+919777011111", "upi_id": "e2e@upi"}).json()
    bid = biz["id"]
    prod = client.post(f"/products?business_id={bid}", json={"name": "Test Tee", "price": 499, "stock_qty": 5}).json()
    order = client.post("/orders", json={
        "business_id": bid, "customer_no": "+919777022222",
        "items": [{"product_id": prod["id"], "qty": 2}],
    }).json()
    assert order["status"] == "reserved"
    assert order["total"] == 998


def test_bulk_create_products(client, business_id):
    before = len(client.get(f"/products?business_id={business_id}").json())
    r = client.post(f"/products/bulk?business_id={business_id}", json={"products": [
        {"name": "Bulk A", "price": 10, "stock_qty": 5},
        {"name": "Bulk B", "price": 20, "stock_qty": 3},
    ]})
    assert r.status_code == 201 and r.json()["created"] == 2
    after = len(client.get(f"/products?business_id={business_id}").json())
    assert after == before + 2


def test_scan_empty_file_rejected(client, business_id):
    # empty upload is rejected before OCR runs (400); 503 if OCR engine absent
    r = client.post(f"/products/scan?business_id={business_id}",
                    files={"file": ("x.png", b"", "image/png")})
    assert r.status_code in (400, 503)


def test_analytics_summary(client, business_id):
    data = client.get(f"/analytics/summary?business_id={business_id}").json()
    assert "kpis" in data
    assert "revenue_trend" in data and len(data["revenue_trend"]) == 7
    assert "forecast" in data and len(data["forecast"]) == 7
    assert "recommendations" in data and data["recommendations"]


def test_daily_whatsapp_summary(client, business_id):
    data = client.get(f"/analytics/daily-summary?business_id={business_id}").json()
    assert data["channel"] == "whatsapp"
    assert "Orders today:" in data["message"]
    assert "Restock:" in data["message"]
    assert "kpis" in data


def test_recommendations_endpoint(client, business_id):
    products = client.get(f"/products?business_id={business_id}").json()
    data = client.get(f"/recommendations?business_id={business_id}&product_id={products[0]['id']}").json()
    assert data["recommendations"]
    assert all(r["product_id"] != products[0]["id"] for r in data["recommendations"])
    assert all("reason" in r for r in data["recommendations"])


def test_nlu_endpoint(client):
    r = client.post("/nlu/parse", json={"text": "do you have adidas size 9"}).json()
    assert r["intent"] in ("QUERY", "ORDER")
    assert r["entities"]["size"] == "9"


def test_media_vision_search(client, business_id):
    r = client.post("/media/vision-search", json={
        "business_id": business_id, "image_url": "http://x/i.jpg?q=blue checked shirt",
    }).json()
    assert r["matches"]
    assert r["engine"] in ("fashionclip", "text-hint-fallback")


def test_validation_error_envelope(client):
    r = client.post("/nlu/parse", json={})
    assert r.status_code == 422
    assert r.json()["error"]["type"] == "validation_error"


def test_not_found_envelope(client):
    r = client.get("/orders/nonexistent-id")
    assert r.status_code == 404
    assert r.json()["error"]["type"] == "http_error"


def test_openapi_and_docs(client):
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200


def test_auth_otp_flow(client):
    # Send OTP
    r = client.post("/auth/send-otp", json={"phone": "9812345601"})
    assert r.status_code == 200
    assert r.json()["status"] == "sent"

    # Verify using bypass code
    v = client.post("/auth/verify-otp", json={"phone": "9812345601", "code": "888888"})
    assert v.status_code == 200
    assert v.json()["status"] == "verified"
    assert v.json()["access_token"]


def test_webhook_query_param_routing(client, db):
    # Create second business
    body = {
        "name": "Second Shop",
        "whatsapp_no": "+919999900000",
        "category": "grocery",
        "upi_id": "second@upi",
    }
    r = client.post("/businesses", json=body)
    assert r.status_code == 201
    biz2_id = r.json()["id"]

    # Send a query to Second Shop using query parameters (for Twilio webhook sandbox form POSTs)
    q = client.post(
        f"/webhook/whatsapp?business_id={biz2_id}",
        data={
            "MessageSid": "SM_query_biz2",
            "From": "whatsapp:+919000000009",
            "To": "whatsapp:+14155238886",
            "Body": "Maggi Noodles 70g available?",
            "NumMedia": "0",
        },
    )
    assert q.status_code == 200
    assert "Maggi" in q.text

    # Verify the message is scoped to Second Shop (biz2_id) in database
    from app.models import Message
    msg = db.query(Message).filter(Message.business_id == biz2_id).first()
    assert msg is not None
    assert "Maggi" in msg.text
