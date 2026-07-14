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
_QUERY = {"available", "avail", "hai", "milega", "milta", "price", "kitna", "kitne",
          "rate", "stock", "size", "kya", "do you have", "have", "dikhao", "show", "details"} # 'dikhao' aur 'details' add kiya

_ORDER = {"order", "buy", "chahiye", "chahie", "de do", "dedo", "reserve", "book",
          "confirm", "haan", "haa", "yes", "ok", "okay", "karun", "karu", "lelo", "want", "khareedna", "kar do", "kardo", "yes", "haan", "reserve it"} # 'khareedna' add kiya
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
    t = f" {re.sub(r'[^a-z0-9\s]', ' ', text.lower())} "
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
    
    entities = extract_entities(text)
    
    if top == 0:
        # No signal — if we have product keywords, treat it as a QUERY, else greeting/unknown
        if entities.get("keywords"):
            intent = "QUERY"
            confidence = 0.5
        else:
            intent = "GREETING" if len(lowered.split()) <= 2 else "UNKNOWN"
            confidence = 0.3
    else:
        # QUERY and ORDER often co-occur ("size available? yes"); prefer ORDER when
        # a confirmation word is present. Only disambiguate between those two — never
        # override a stronger LAST_ORDER / COMPLAINT / GREETING winner.
        if intent in ("QUERY", "ORDER") and scores["ORDER"] and scores["ORDER"] >= scores["QUERY"]:
            intent = "ORDER"
        confidence = min(0.95, 0.55 + 0.15 * top)

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
    stop = (
        _ORDER
        | _QUERY
        | _GREETING
        | {
            "the", "a", "an", "me", "i", "to", "of", "size", "for",
            "who", "what", "where", "when", "why", "how", "you", "your", "he", "she", "it", "they", "we", "us",
            "is", "are", "am", "was", "were", "be", "been", "do", "does", "did", "can", "could", "will", "would",
            "should", "have", "has", "had", "this", "that", "these", "those", "there", "here", "with", "about",
            "at", "by", "from", "on", "in", "out", "up", "down", "into", "over", "after", "before", "or", "and"
        }
    )
    keywords = [w for w in re.findall(r"[a-zA-Z]+", text.lower()) if w not in stop and len(w) > 1]
    if keywords:
        entities["keywords"] = keywords
    return entities
