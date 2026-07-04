"""Payments façade. Delegates to the active provider based on PAYMENT_MODE.

  mock     -> build a upi:// intent deep link (works on any UPI app, no keys).
  razorpay -> create a hosted Razorpay Payment Link.

Same generate_payment_link / verify_webhook_signature surface either way, so
routers and the pipeline never branch on the provider.
"""
from __future__ import annotations

from urllib.parse import quote

from ..config import settings
from ..integrations import razorpay_client
from ..models import Business, Order


def generate_payment_link(business: Business, order: Order) -> str:
    """Build a payment link for an order (spec F4: itemised bill + UPI link)."""
    amount = float(order.total)
    if settings.PAYMENT_MODE == "razorpay":
        return razorpay_client.create_payment_link(
            amount_rupees=amount,
            description=f"Munim Order {order.id[:8]}",
            reference_id=order.id,
            customer_contact=order.customer.whatsapp_no if order.customer else "",
        )
    # mock (default): UPI intent deep link
    upi_id = business.upi_id or "demo@upi"
    payee = quote(business.name or "Munim Shop")
    note = quote(f"Munim Order {order.id[:8]}")
    return f"upi://pay?pa={upi_id}&pn={payee}&am={amount:.2f}&cu=INR&tn={note}"


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Verify a payment webhook. Mock mode accepts everything (no signing)."""
    if settings.PAYMENT_MODE == "razorpay":
        return razorpay_client.verify_webhook_signature(raw_body, signature)
    return True
