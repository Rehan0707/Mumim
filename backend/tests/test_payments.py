"""Payment provider selection, contact sanitization, and graceful fallback."""
from app.integrations import razorpay_client
from app.models import Business, Customer, Order
from app.services import payments


def test_clean_contact_keeps_valid_drops_malformed():
    assert razorpay_client._clean_contact("+91 98123 45601") == "919812345601"
    assert razorpay_client._clean_contact("+91900") == ""   # too short
    assert razorpay_client._clean_contact(None) == ""


def test_mock_mode_returns_upi_link(db, business_id):
    biz = db.get(Business, business_id)
    cust = db.query(Customer).filter(Customer.business_id == business_id).first()
    order = Order(business_id=business_id, customer_id=cust.id, total=100, status="reserved")
    db.add(order)
    db.flush()
    link = payments.generate_payment_link(biz, order)
    assert link.startswith("upi://pay?")


def test_razorpay_failure_falls_back_to_upi(db, business_id, monkeypatch):
    biz = db.get(Business, business_id)
    cust = db.query(Customer).filter(Customer.business_id == business_id).first()
    order = Order(business_id=business_id, customer_id=cust.id, total=100, status="reserved")
    db.add(order)
    db.flush()

    monkeypatch.setattr(payments.settings, "PAYMENT_MODE", "razorpay")

    def _boom(*args, **kwargs):
        raise RuntimeError("razorpay down")

    monkeypatch.setattr(payments.razorpay_client, "create_payment_link", _boom)
    link = payments.generate_payment_link(biz, order)
    assert link.startswith("upi://")  # never dead-ends the order
