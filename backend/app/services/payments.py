"""Payments façade. Delegates to the active provider based on PAYMENT_MODE.

  mock     -> build a upi:// intent deep link (works on any UPI app, no keys).
  razorpay -> create a hosted Razorpay Payment Link.

Same generate_payment_link / verify_webhook_signature surface either way, so
routers and the pipeline never branch on the provider. If a live provider call
fails, we log and fall back to the UPI link so the order flow never dead-ends
(TRD reliability: rule-based fallback behind every external call).
"""
from __future__ import annotations

import logging
from urllib.parse import quote

from ..config import settings
from ..integrations import razorpay_client
from ..models import Business, Order

log = logging.getLogger("munim.payments")


def _upi_link(business: Business, order: Order) -> str:
    """UPI intent deep link — works on any UPI app, no keys required."""
    amount = float(order.total)
    upi_id = business.upi_id or "demo@upi"
    payee = quote(business.name or "Munim Shop")
    note = quote(f"Munim Order {order.id[:8]}")
    return f"upi://pay?pa={upi_id}&pn={payee}&am={amount:.2f}&cu=INR&tn={note}"


def generate_payment_link(business: Business, order: Order) -> str:
    """Build a payment link for an order (spec F4: itemised bill + UPI link)."""
    if settings.PAYMENT_MODE == "razorpay":
        try:
            return razorpay_client.create_payment_link(
                amount_rupees=float(order.total),
                description=f"Munim Order {order.id[:8]}",
                reference_id=order.id,
                customer_contact=order.customer.whatsapp_no if order.customer else "",
            )
        except Exception as exc:
            log.warning("razorpay payment link failed (%s) — falling back to UPI link", exc)
            return _upi_link(business, order)
    return _upi_link(business, order)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Verify a payment webhook. Mock mode accepts everything (no signing)."""
    if settings.PAYMENT_MODE == "razorpay":
        return razorpay_client.verify_webhook_signature(raw_body, signature)
    return True
