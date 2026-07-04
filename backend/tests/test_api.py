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


def test_analytics_summary(client, business_id):
    data = client.get(f"/analytics/summary?business_id={business_id}").json()
    assert "kpis" in data
    assert "revenue_trend" in data and len(data["revenue_trend"]) == 7
    assert "forecast" in data and len(data["forecast"]) == 7


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
