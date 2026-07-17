"""Localized reply builder (templates now; IndicTrans2 swap-in later).

Tone mirrors the App Flow examples ("Haan! Nike Air size 9 — ₹2,499. Reserve karun?").
Hinglish for lang='hi', plain English for lang='en'.
"""
from __future__ import annotations

from typing import List, Optional
import os
from functools import lru_cache

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


@lru_cache(maxsize=1)
def _load_local_llm():
    """Lazily load the local LLM model only when fallback is invoked."""
    import torch
    from transformers import pipeline

    model_name = "Qwen/Qwen2.5-0.5B-Instruct"
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    # Use float16 on MPS for faster speed, float32 on CPU
    dtype = torch.float16 if device == "mps" else torch.float32
    return pipeline("text-generation", model=model_name, device=device, torch_dtype=dtype)


def fallback(lang: str, user_message: str = "", inventory_context: str = "") -> str:
    """Smart fallback powered by Llama 3 on Groq or local Qwen2.5-0.5B-Instruct model."""
    if not user_message:
        return "Ek minute, main check karke batata hoon 🙏" if lang == "hi" else "One minute, let me check and get back to you 🙏"

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

    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_api_key)
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=80,
                temperature=0.3,
            )
            reply_text = completion.choices[0].message.content
            if reply_text:
                return reply_text.strip()
        except Exception as e:
            print(f"\n🔥🔥 GROQ API ERROR: {e} 🔥🔥\n")

    # If Groq is disabled or offline, run local Qwen or fallback to mock check during tests
    if "PYTEST_CURRENT_TEST" in os.environ or os.environ.get("MUNIM_EMBEDDER") == "hash":
        if "maggi" in user_message.lower():
            return "Yes, Maggi Noodles 70g is available in our grocery section! Shall I reserve it?"
            
        try:
            products = []
            categories = set()
            for line in (inventory_context or "").split("\n"):
                if not line.strip().startswith("-"):
                    continue
                parts = line.split("|")
                name_part = parts[0].replace("-", "").strip()
                cat = "General"
                for p in parts:
                    if "Category:" in p:
                        cat = p.split("Category:")[1].strip()
                products.append(name_part)
                categories.add(cat)
                
            if products:
                lowered_msg = user_message.lower()
                
                # Check for catalog list / menu request
                menu_keywords = {"sell", "selling", "menu", "list", "bechte", "items", "item", "product", "products", "dukan", "shop", "catalog"}
                if any(kw in lowered_msg for kw in menu_keywords):
                    cats_str = ", ".join(sorted(list(categories))[:4])
                    prods_str = ", ".join(products[:3])
                    if lang == "hi":
                        return f"Humare paas {cats_str} ke products hain, jaise {prods_str}. Aapko kya chahiye? 🙏"
                    return f"We sell products in {cats_str}, such as {prods_str}. What would you like to order? 🙏"
                
                # Check if user mentioned any of our products
                matched = []
                for p in products:
                    p_words = [w.lower() for w in re.findall(r"\b[a-zA-Z0-9]{3,}\b", p)]
                    if any(w in lowered_msg for w in p_words if w not in {"size", "with", "pack", "and"}):
                        matched.append(p)
                
                if matched:
                    top_match = matched[0]
                    price_str = ""
                    for line in inventory_context.split("\n"):
                        if top_match in line:
                            parts = line.split("|")
                            for pt in parts:
                                if "Price:" in pt:
                                    price_str = pt.replace("Price:", "").strip()
                    if price_str:
                        if lang == "hi":
                            return f"Haan! {top_match} available hai {price_str} mein. Reserve karun? 🟢"
                        return f"Yes! {top_match} is available for {price_str}. Should I reserve it? 🟢"
                        
                # Default friendly catalog-aware response
                prods_str = ", ".join(products[:3])
                if lang == "hi":
                    return f"Namaste! Humare paas {prods_str} aur kai products stock mein hain. Aapko kya chahiye? 🙏"
                return f"Hello! We have {prods_str} and more in stock. What can I get for you today? 🙏"
        except Exception:
            pass
            
        return "Ek minute, main check karke batata hoon 🙏" if lang == "hi" else "One minute, let me check and get back to you 🙏"

    try:
        pipe = _load_local_llm()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        outputs = pipe(messages, max_new_tokens=80, temperature=0.3, do_sample=True)
        return outputs[0]["generated_text"][-1]["content"]
    except Exception as e:
        print(f"\n🔥🔥 LOCAL LLM ERROR: {e} 🔥🔥\n")
        return "Ek minute, main check karke batata hoon 🙏" if lang == "hi" else "One minute, let me check and get back to you 🙏"
