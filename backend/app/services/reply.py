"""Localized reply builder (templates now; IndicTrans2 swap-in later).

Tone mirrors the App Flow examples ("Haan! Nike Air size 9 — ₹2,499. Reserve karun?").
Hinglish for lang='hi', plain English for lang='en'.
"""
from __future__ import annotations

from typing import List, Optional
import os
from groq import Groq

# Groq client ko initialize kar rahe hain
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
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


def fallback(lang: str, user_message: str = "", inventory_context: str = "") -> str:
    """Smart fallback powered by Llama 3 on Groq with Database Context."""
    
    if not user_message:
        return "Ek minute, main check karke batata hoon 🙏" if lang == "hi" else "One minute, let me check and get back to you 🙏"
    
    # Llama 3 ka NAYA dimaag (Language-Aware Dynamic System Prompt)
    # Llama 3 ka NAYA dimaag (Short & Crisp Audio-Friendly Prompt)
    system_prompt = f"""You are a smart, polite, and conversational WhatsApp shopping assistant for a local store. 
Our shop currently has these items in stock: {inventory_context}.

CRITICAL RULE: You MUST reply in the EXACT SAME LANGUAGE as the user's message. 
- If the user writes/speaks in English, reply in pure English. 
- If the user writes/speaks in Hindi or Hinglish, reply in Hindi/Hinglish.

Other Rules:
1. AUDIO FRIENDLY: Your reply will be converted to a voice note. Keep it VERY SHORT (Maximum 2-3 sentences).
2. DO NOT LIST EVERYTHING: If the user asks what we sell, DO NOT read the whole inventory. Just mention unique categories.
3. NEVER invent new products. Only mention what is in the list above.
4. Use plain text only (no asterisks, no bullet points, no bold text)."""
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.3 
        )
        
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"\n🔥🔥 GROQ API ERROR: {e} 🔥🔥\n")
        return "Ek minute, main check karke batata hoon 🙏" if lang == "hi" else "One minute, let me check and get back to you 🙏"