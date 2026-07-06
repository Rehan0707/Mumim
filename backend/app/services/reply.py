"""Localized reply builder (templates now; IndicTrans2 swap-in later).

Tone mirrors the App Flow examples ("Haan! Nike Air size 9 — ₹2,499. Reserve karun?").
Hinglish for lang='hi', plain English for lang='en'.
"""
from __future__ import annotations

from typing import List, Optional
import os
from groq import Groq

# Groq client ko initialize kar rahe hain (uses dummy key if missing to avoid import crashes)
client = Groq(api_key=os.getenv("GROQ_API_KEY") or "DUMMY_KEY_FOR_TESTS")
LOW_STOCK_THRESHOLD = 3


def _rupees(amount: float) -> str:
    return f"₹{amount:,.0f}" if float(amount).is_integer() else f"₹{amount:,.2f}"


def greeting(lang: str) -> str:
    return "Namaste! 🙏 Kya chahiye aapko aaj?" if lang == "hi" else "Hi! 🙏 What are you looking for today?"


def not_found(lang: str) -> str:
    return (
        "Abhi ye stock mein nahi hai. Kuch aur dikhaun? 🙏"
        if lang == "hi"
        else "That's not in stock right now. Want me to show something else? 🙏"
    )


def availability(match: dict, lang: str) -> str:
    """Answer a QUERY with the top match + a reserve CTA."""
    price = _rupees(match["price"])
    size = match.get("size")
    label = match["name"] + (f" size {size}" if size else "")
    if match["stock_qty"] <= 0:
        return (
            f"{label} abhi out of stock hai 😔 Alternative dikhaun?"
            if lang == "hi"
            else f"{label} is out of stock 😔 Want an alternative?"
        )
    if lang == "hi":
        return f"Haan! {label} — {price}. Reserve karun? 🟢"
    return f"Yes! {label} — {price}. Shall I reserve it? 🟢"


def visual_matches(matches: List[dict], lang: str) -> str:
    """Dikhao reply — always 'closest match', never 'exact' (spec F2 rule)."""
    if not matches:
        return not_found(lang)
    top = matches[0]
    price = _rupees(top["price"])
    if lang == "hi":
        return f"Exact ye nahi, par milta-julta hai 👇\n{top['name']} — {price}. Reserve karun?"
    return f"Not the exact one, but here's the closest match 👇\n{top['name']} — {price}. Shall I reserve it?"


def order_confirmed(order_no: str, total: float, payment_link: str, lang: str) -> str:
    price = _rupees(total)
    if lang == "hi":
        return (
            f"✅ Order #{order_no} ready! Total {price}.\n"
            f"Pay karein: {payment_link}\nStock update ho gaya. Dhanyavaad! 🙏"
        )
    return (
        f"✅ Order #{order_no} ready! Total {price}.\n"
        f"Pay here: {payment_link}\nStock updated. Thank you! 🙏"
    )


def out_of_stock(name: str, lang: str) -> str:
    return (
        f"Sorry, {name} abhi khatam ho gaya 😔 Waitlist mein daal dun?"
        if lang == "hi"
        else f"Sorry, {name} just went out of stock 😔 Shall I add you to the waitlist?"
    )


def last_order(order: Optional[dict], lang: str) -> str:
    if not order:
        return (
            "Aapka koi purana order nahi mila." if lang == "hi" else "I couldn't find any past orders for you."
        )
    items = ", ".join(f"{i['qty']}× {i['name']}" for i in order["items"])
    price = _rupees(order["total"])
    if lang == "hi":
        return f"Aapka last order tha: {items} — {price}. Dobara chahiye? 🙂"
    return f"Your last order was: {items} — {price}. Want it again? 🙂"


def fallback(lang: str, user_message: str = "") -> str:
    """Smart fallback powered by Llama 3 on Groq."""
    
    # Agar function call mein user_message nahi pass hua, toh purana reply de do
    if not user_message:
        return "Ek minute, main check karke batata hoon 🙏" if lang == "hi" else "One minute, let me check and get back to you 🙏"
    
    # Llama 3 ka dimaag (System Prompt)
    system_prompt = """Tu ek smart, polite aur conversational WhatsApp shopping assistant hai. 
Humare store mein sirf ye cheezein milti hain: Shoes, Grocery items, Personal Care products, Watches aur Clothing. 
Tera kaam user ke messages ka natural Hindi-English mix mein chota aur friendly reply karna hai. 
Lekin dhyan rahe:
1. Agar user koi aisi cheez maange jo hum nahi bechte (jaise mobile phones ya electronics), toh politely mana kar de aur humare available categories (Shoes, Grocery, Personal Care, Watches, Clothing) suggest kar.
2. User ke sawalon ka jawab hamesha store ki categories ke hisaab se de.
3. Kripya sirf plain text reply de, koi code ya lists mat bhej."""
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        # Yeh line terminal mein exact error chhap degi
        print(f"\n🔥🔥 GROQ API ERROR: {e} 🔥🔥\n")
        
        return "Ek minute, main check karke batata hoon 🙏" if lang == "hi" else "One minute, let me check and get back to you 🙏"