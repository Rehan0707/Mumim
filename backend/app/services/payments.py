"""Payments. Mock mode builds a upi:// deep link + a hosted mock pay page.

Razorpay swap-in later: same generate_payment_link / handle_webhook surface,
just call the Razorpay orders API and verify the webhook signature.
"""
from __future__ import annotations

from urllib.parse import quote

from ..config import settings
from ..models import Business, Order


def generate_payment_link(business: Business, order: Order) -> str:
    """Build a UPI intent link (spec F4: itemised bill + UPI link)."""
    amount = f"{float(order.total):.2f}"
    if settings.PAYMENT_MODE == "mock":
        upi_id = business.upi_id or "demo@upi"
        payee = quote(business.name or "Munim Shop")
        note = quote(f"Munim Order {order.id[:8]}")
        return f"upi://pay?pa={upi_id}&pn={payee}&am={amount}&cu=INR&tn={note}"
    # razorpay branch would create a payment link and return its short_url
    raise NotImplementedError("Razorpay mode not configured")
