"""Rule-based NLU: language detect + intent classify + entity extract.

Swappable for IndicBERT later — the contract ({intent, entities, lang, confidence})
is what the pipeline consumes, so the model can drop in behind this same function.
Intents (spec A1): ORDER | QUERY | LAST_ORDER | COMPLAINT | GREETING | UNKNOWN
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

# --- keyword lexicons (English + common Hinglish/Marathi romanizations) ---
_GREETING = {"hi", "hello", "hey", "namaste", "namaskar", "hii"}
_ORDER = {"order", "buy", "chahiye", "chahie", "de do", "dedo", "reserve", "book",
          "confirm", "haan", "haa", "yes", "ok", "okay", "karun", "karu", "lelo", "want"}
_QUERY = {"available", "avail", "hai", "milega", "milta", "price", "kitna", "kitne",
          "rate", "stock", "size", "kya", "do you have", "have"}
_LAST_ORDER = {"last order", "previous", "pichla", "history", "purana", "last time"}
_COMPLAINT = {"complaint", "problem", "issue", "kharab", "defective", "wrong", "return", "refund"}

_SIZE_RE = re.compile(r"\bsize\s*[:=]?\s*(\d{1,2}|xs|s|m|l|xl|xxl|small|medium|large)\b", re.I)
_QTY_RE = re.compile(r"\b(\d+)\s*(kg|kilo|pcs|piece|pieces|packet|units?|nos?)?\b", re.I)
_HINDI_HINTS = {"hai", "milega", "chahiye", "kitna", "karun", "haan", "namaste", "kya", "dedo"}
_DEVANAGARI = re.compile(r"[ऀ-ॿ]")


@dataclass
class NLUResult:
    intent: str
    lang: str
    confidence: float
    entities: Dict[str, object] = field(default_factory=dict)
    raw: str = ""


def detect_lang(text: str) -> str:
    if _DEVANAGARI.search(text or ""):
        return "hi"
    words = set(re.findall(r"[a-z]+", (text or "").lower()))
    if words & _HINDI_HINTS:
        return "hi"
    return "en"


def _score(text: str, lexicon: set) -> int:
    t = f" {text.lower()} "
    return sum(1 for kw in lexicon if f" {kw} " in t or t.strip().startswith(kw))


def parse(text: str, lang: Optional[str] = None) -> NLUResult:
    text = (text or "").strip()
    lang = lang or detect_lang(text)
    lowered = text.lower()

    scores = {
        "COMPLAINT": _score(lowered, _COMPLAINT),
        "LAST_ORDER": _score(lowered, _LAST_ORDER),
        "ORDER": _score(lowered, _ORDER),
        "QUERY": _score(lowered, _QUERY),
        "GREETING": _score(lowered, _GREETING),
    }
    intent = max(scores, key=scores.get)
    top = scores[intent]
    if top == 0:
        # No signal — treat a short greeting-ish blob as greeting, else UNKNOWN.
        intent = "GREETING" if len(lowered.split()) <= 2 else "UNKNOWN"
        confidence = 0.3
    else:
        # QUERY and ORDER often co-occur ("size available? yes"); prefer ORDER if a
        # confirmation word is present alongside product words.
        if scores["ORDER"] and scores["ORDER"] >= scores["QUERY"]:
            intent = "ORDER"
        confidence = min(0.95, 0.55 + 0.15 * top)

    entities = extract_entities(text)
    return NLUResult(intent=intent, lang=lang, confidence=confidence, entities=entities, raw=text)


def extract_entities(text: str) -> Dict[str, object]:
    entities: Dict[str, object] = {}
    size_m = _SIZE_RE.search(text)
    if size_m:
        entities["size"] = size_m.group(1).lower()

    # qty: first standalone number not immediately part of "size N"
    for m in _QTY_RE.finditer(text):
        num = m.group(1)
        if size_m and size_m.group(1) == num:
            continue
        entities["qty"] = int(num)
        if m.group(2):
            entities["unit"] = m.group(2).lower()
        break

    # product keywords: alphabetic tokens minus stopwords/intent words
    stop = _ORDER | _QUERY | _GREETING | {"the", "a", "an", "me", "i", "to", "of", "size", "for"}
    keywords = [w for w in re.findall(r"[a-zA-Z]+", text.lower()) if w not in stop and len(w) > 1]
    if keywords:
        entities["keywords"] = keywords
    return entities
