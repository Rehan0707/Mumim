# ml/translation — Localized replies (IndicTrans2)  ·  Role 2

Detect the customer's language and render replies in Hindi/Marathi/English. Today
the backend uses Hinglish templates; IndicTrans2 makes replies fully localized.

**Contract to match:** a `localize(text, target_lang) -> str` helper the reply
builder can call.

Backend seam: `backend/app/services/reply.py`. Weights → `../weights/` (git-ignored).
