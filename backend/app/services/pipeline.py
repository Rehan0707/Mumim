"""The core message pipeline (spec A1) — one path for text/voice/image.

  1 message arrives           -> handle_message()
  2 detect type & language    -> nlu.detect_lang / media stubs
  3 intent classify           -> nlu.parse
  4 extract entities + search -> nlu + search.semantic_search
  5 execute action            -> orders.place_order / crm / payments
  6 localized reply           -> reply.*
  7 emit dashboard events     -> returned to the async route to broadcast

Returns {"reply", "intent", "lang", "events", "customer_id"}. The route logs the
outbound message and pushes events over the websocket. A tiny in-memory session
holds the "pending reserve" between a QUERY and the customer's "yes" (Redis later).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Business, Message, Order, PendingReservation, Product
from . import crm, nlu, orders, payments, reply, search, vision

PENDING_RESERVATION_TTL = timedelta(minutes=30)


def _expired(timestamp: datetime) -> bool:
    """SQLite returns naive timestamps even for timezone-aware columns."""
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    return timestamp < datetime.now(timezone.utc)


def _get_pending(db: Session, business_id: str, whatsapp_no: str) -> Optional[dict]:
    pending = (
        db.query(PendingReservation)
        .filter(
            PendingReservation.business_id == business_id,
            PendingReservation.whatsapp_no == whatsapp_no,
        )
        .first()
    )
    if pending and _expired(pending.expires_at):
        db.delete(pending)
        db.commit()
        return None
    if not pending:
        return None
    return {"product_id": pending.product_id, "qty": pending.qty, "name": pending.name}


def _stage_pending(db: Session, business_id: str, whatsapp_no: str, product_id: str, qty: int, name: str) -> None:
    pending = (
        db.query(PendingReservation)
        .filter(
            PendingReservation.business_id == business_id,
            PendingReservation.whatsapp_no == whatsapp_no,
        )
        .first()
    )
    if pending is None:
        pending = PendingReservation(
            business_id=business_id,
            whatsapp_no=whatsapp_no,
            product_id=product_id,
            qty=qty,
            name=name,
            expires_at=datetime.now(timezone.utc) + PENDING_RESERVATION_TTL,
        )
        db.add(pending)
    else:
        pending.product_id = product_id
        pending.qty = qty
        pending.name = name
        pending.expires_at = datetime.now(timezone.utc) + PENDING_RESERVATION_TTL
    db.commit()


def _clear_pending(db: Session, business_id: str, whatsapp_no: str) -> None:
    pending = (
        db.query(PendingReservation)
        .filter(
            PendingReservation.business_id == business_id,
            PendingReservation.whatsapp_no == whatsapp_no,
        )
        .first()
    )
    if pending:
        db.delete(pending)
        db.commit()

def _log_message(db: Session, business_id: str, customer_id: Optional[str], direction: str,
                 input_type: str, text: str, intent: Optional[str] = None, lang: Optional[str] = None,
                 media_url: Optional[str] = None) -> None:
    db.add(Message(business_id=business_id, customer_id=customer_id, direction=direction,
                   input_type=input_type, text=text, intent=intent, lang=lang, media_url=media_url))
    db.commit()


def handle_message(
    db: Session,
    business: Business,
    from_no: str,
    input_type: str = "text",
    text: Optional[str] = None,
    media_url: Optional[str] = None,
    customer_name: Optional[str] = None,
) -> dict:
    events: List[dict] = []

    # Step 1-2: customer + type/lang. (voice/image go through media stubs -> text.)
    customer = crm.upsert_customer(db, business.id, from_no, customer_name)
    if input_type == "image":
        return _handle_visual(db, business, customer, media_url, events)
    if input_type == "voice":
        if not text and not settings.allow_mock_ai:
            lang = business.lang_default or "hi"
            reply_text = "Voice orders are temporarily unavailable. Please send the order as text."
            _log_message(db, business.id, customer.id, "in", input_type, "[voice note]", "UNKNOWN", lang, media_url)
            _log_message(db, business.id, customer.id, "out", "text", reply_text, "UNKNOWN", lang)
            events.append({"type": "new_message", "data": {
                "customer_no": from_no, "direction": "in", "text": "[voice note]", "intent": "UNKNOWN"}})
            events.append({"type": "new_message", "data": {
                "customer_no": from_no, "direction": "out", "text": reply_text}})
            return {"reply": reply_text, "intent": "UNKNOWN", "lang": lang,
                    "events": events, "customer_id": customer.id, "matches": []}
        text = text or "[voice note]"  # real IndicWhisper transcript swaps in here

    text = (text or "").strip()
    result = nlu.parse(text)
    lang = result.lang

    _log_message(db, business.id, customer.id, "in", input_type, text, result.intent, lang, media_url)
    events.append({"type": "new_message", "data": {
        "customer_no": from_no, "direction": "in", "text": text, "intent": result.intent}})

    # Step 4-5: dispatch by intent. `cards` collects product matches to show in chat.
    cards: List[dict] = []
    reply_text = _dispatch(db, business, customer, result, events, cards)

    # Step 6: log outbound.
    _log_message(db, business.id, customer.id, "out", "text", reply_text, result.intent, lang)
    events.append({"type": "new_message", "data": {
        "customer_no": from_no, "direction": "out", "text": reply_text}})

    return {"reply": reply_text, "intent": result.intent, "lang": lang,
            "events": events, "customer_id": customer.id, "matches": cards}


def _dispatch(db, business, customer, result, events, cards) -> str:
    intent, lang, entities = result.intent, result.lang, result.entities
    if intent == "GREETING":
        return reply.greeting(lang)

    if intent == "LAST_ORDER":
        last = (db.query(Order).filter(Order.customer_id == customer.id)
                .order_by(Order.created_at.desc()).first())
        return reply.last_order(orders.serialize(last) if last else None, lang)

    if intent == "COMPLAINT" or intent == "UNKNOWN":
        _PENDING.pop(key, None)
        # Database se ACTIVE products uthao (taaki out-of-stock ya hidden items na dikhe)
        available_products = db.query(Product).filter(
            Product.business_id == business.id,
            Product.is_active == True
        ).limit(20).all()
        
        if available_products:
            details = []
            for p in available_products:
                # Agar category ya brand None hai toh usko handle karo
                cat = p.category or "General"
                brand = f" ({p.brand})" if p.brand else ""
                stock = f"In Stock ({p.stock_qty})" if p.stock_qty > 0 else "Out of Stock"
                
                # Attributes (jaise size/color) ko extract karke string banao
                attrs = ""
                if p.attributes:
                    # Example: {'size': 'M, L', 'color': 'White'} -> "size: M, L, color: White"
                    attr_list = [f"{k}: {v}" for k, v in p.attributes.items()]
                    attrs = f" | Details: {', '.join(attr_list)}"

                # Final line jo LLM padhega
                details.append(f"- {p.name}{brand} | Category: {cat} | Price: ₹{p.price} | {stock}{attrs}")
            
            inventory_context = "\n".join(details)
        else:
            inventory_context = "abhi dukan mein naya stock aana baaki hai"
            
        return reply.fallback(lang, user_message=result.raw, inventory_context=inventory_context)
     
    if intent == "ORDER":
        # Confirmation of a pending reserve? -> place the order.
        pending = _get_pending(db, business.id, customer.whatsapp_no)
        confirm_words = {"yes", "haan", "haa", "ok", "okay", "confirm", "karun", "karu", "reserve", "kar do", "reserve it"}
        is_confirm = bool(set(result.raw.lower().split()) & confirm_words)
        if pending and (is_confirm or not entities.get("keywords")):
            return _place(db, business, customer, pending, lang, events)
        # ORDER intent but new product mentioned -> search then ask to confirm.
        return _query_and_stage(db, business, customer, result, lang, events, cards)

    # QUERY (default): search and stage a reserve.
    return _query_and_stage(db, business, customer, result, lang, events, cards)


def _query_and_stage(db, business, customer, result, lang, events, cards) -> str:
    matches = search.semantic_search(db, business.id, result.raw, result.entities, limit=3)
    if not matches:
        _clear_pending(db, business.id, customer.whatsapp_no)
        return reply.not_found(lang)
    top = matches[0]
    _stage_pending(
        db, business.id, customer.whatsapp_no, top["product_id"],
        int(result.entities.get("qty", 1)), top["name"],
    )
    cards.append(top)  # show the matched product (with photo) in chat
    return reply.availability(top, lang)


def _place(db, business, customer, pending, lang, events) -> str:
    try:
        order = orders.place_order(
            db, business.id, customer.id,
            [{"product_id": pending["product_id"], "qty": pending["qty"]}],
        )
    except orders.OutOfStock:
        _clear_pending(db, business.id, customer.whatsapp_no)
        return reply.out_of_stock(pending["name"], lang)

    order.payment_link = payments.generate_payment_link(business, order)
    db.commit()
    db.refresh(order)
    _clear_pending(db, business.id, customer.whatsapp_no)

    # Step 7 events: new order card + stock ticks + low-stock alert.
    events.append({"type": "new_order", "data": orders.serialize(order)})
    for item in order.items:
        prod = item.product
        events.append({"type": "stock_update", "data": {
            "product_id": prod.id, "name": prod.name, "stock_qty": prod.stock_qty}})
        if prod.stock_qty <= reply.LOW_STOCK_THRESHOLD:
            events.append({"type": "low_stock", "data": {
                "product_id": prod.id, "name": prod.name, "stock_qty": prod.stock_qty}})

    return reply.order_confirmed(order.id[:4], float(order.total), order.payment_link, lang)


def _handle_visual(db, business, customer, media_url, events) -> str:
    """Dikhao visual search (F2). MVP: match the screenshot's tagged query text to
    the catalog via text search; real FashionCLIP image embedding swaps in here."""
    lang = business.lang_default or "hi"
    # The simulator passes a hint query as the media 'caption'; fall back to any text.
    query = (media_url or "").split("q=")[-1] if media_url and "q=" in media_url else ""
    _log_message(db, business.id, customer.id, "in", "image", query or "[image]", "QUERY", lang, media_url)
    events.append({"type": "new_message", "data": {
        "customer_no": customer.whatsapp_no, "direction": "in", "text": "📷 [image]", "intent": "QUERY"}})

    # Real FashionCLIP image search when available; else text-hint fallback.
    matches = None
    if media_url:
        matches = vision.search_by_image_url(db, business.id, media_url, limit=3)
    if matches is None:
        if not settings.allow_mock_ai:
            reply_text = "Visual search is temporarily unavailable. Please describe the item in text."
            _log_message(db, business.id, customer.id, "out", "text", reply_text, "QUERY", lang)
            events.append({"type": "new_message", "data": {
                "customer_no": customer.whatsapp_no, "direction": "out", "text": reply_text}})
            return {"reply": reply_text, "intent": "QUERY", "lang": lang,
                    "events": events, "customer_id": customer.id, "matches": []}
        matches = search.semantic_search(db, business.id, query or "shirt", {}, limit=3)
    if matches:
        _stage_pending(
            db, business.id, customer.whatsapp_no,
            matches[0]["product_id"], 1, matches[0]["name"],
        )
    reply_text = reply.visual_matches(matches, lang)
    _log_message(db, business.id, customer.id, "out", "text", reply_text, "QUERY", lang)
    events.append({"type": "new_message", "data": {
        "customer_no": customer.whatsapp_no, "direction": "out", "text": reply_text}})
    # show the closest-match product photos in chat (the "Dikhao" wow)
    return {"reply": reply_text, "intent": "QUERY", "lang": lang,
            "events": events, "customer_id": customer.id, "matches": matches[:3]}
