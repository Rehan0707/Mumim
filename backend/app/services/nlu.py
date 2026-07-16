import os
import json
from groq import Groq

# Groq client initialize kar rahe hain
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def parse(user_message: str) -> dict:
    """
    True AI Intent & Language Router using Llama-3 JSON mode.
    Returns: {"intent": "QUERY", "lang": "hi"}
    """
    
    # Prompt ko strictly JSON output dene ke liye train kiya gaya hai
    system_prompt = """You are the NLU (Natural Language Understanding) brain for a WhatsApp shopping bot.
    Your ONLY job is to analyze the user's message and return a JSON object with exactly two keys: 'intent' and 'lang'.
    
    Rules for 'intent':
    1. GREETING: Greetings, hellos, namaste.
    2. QUERY: Asking for EXACT, SPECIFIC items or their prices (e.g., "I want Tata salt", "do you have Parle G", "price of blue jeans"). DO NOT use this if the user asks for a general category.
    3. ORDER: Confirming a purchase, saying 'reserve it', 'done', 'book it', 'order karni hai'.
    4. COMPLAINT: Asking for refunds, reporting defective items.
    5. UNKNOWN: Asking for general categories, full menus, or options (e.g., "I want to buy grocery items", "show me clothes", "what do you sell?", "kya bechte ho"), or unrelated text.

    Rules for 'lang':
    - "en": If the user is typing in pure English.
    - "hi": If the user is typing in Hindi, Hinglish, or Marathi.
    
    CRITICAL RULE: Respond ONLY with a valid JSON object. No markdown formatting, no conversational text.
    Example valid output: {"intent": "UNKNOWN", "lang": "en"}"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0, # 0.0 taaki AI creative na bane, sirf strict classification kare
            response_format={"type": "json_object"} # Ye Groq ko force karega ki output valid JSON ho
        )
        
        # LLM ka answer nikalo aur JSON ko Python dictionary mein convert karo
        response_text = chat_completion.choices[0].message.content.strip()
        parsed_data = json.loads(response_text)
        
        intent = parsed_data.get("intent", "UNKNOWN").upper()
        lang = parsed_data.get("lang", "en").lower()
        
        # Ek chota sa safety net
        valid_intents = ["GREETING", "QUERY", "ORDER", "COMPLAINT", "UNKNOWN"]
        if intent not in valid_intents:
            intent = "UNKNOWN"
            
        return {"intent": intent, "lang": lang}
        
    except Exception as e:
        print(f"\n🔥🔥 Groq NLU Error: {e} 🔥🔥\n")
        # Agar kuch fategi toh system crash nahi hoga, safe default bhej dega
        return {"intent": "UNKNOWN", "lang": "en"}

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


def get_intent(user_message: str) -> str:
    result = parse(user_message)
    return result.intent
