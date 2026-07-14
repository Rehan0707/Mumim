# Munim.ai — the AI munim for every shop

A **WhatsApp-first AI Business Operating System** for local Indian shops: sell, track
stock, and remember customers with zero app install. Built for the **Takeover'26**
hackathon (Business Digitization track).

> This is the **pragmatic MVP**: the full app loop runs end-to-end today with **zero
> external infra or keys** (SQLite, a local WhatsApp simulator, mock UPI, rule-based
> NLU). Every integration is built to the real contract so heavy pieces swap in later.

---

## What works today (the demo)

The hero loop, live:

1. Customer messages the shop on WhatsApp (simulator): *"Nike shoes size 9 available?"*
2. Bot answers instantly with price + a reserve CTA.
3. Customer says *"yes"* → order is created, stock is decremented **transactionally**,
   a UPI payment link is generated, and the reply confirms the order.
4. The owner's **dashboard updates live** (websocket): new order card, stock ticks
   down, low-stock alert fires, activity feed streams the whole loop.

Also working: Hindi/Hinglish replies, voice-order path, "Dikhao" visual-search stub,
CRM auto-built from chats with segments, and analytics (revenue trend + forecast).

---

## Architecture (and the swap-in roadmap)

| Spec calls for | Built now (MVP) | Swap in later (same interface) |
| --- | --- | --- |
| Postgres + pgvector | SQLite + numpy cosine search | `DATABASE_URL` → Postgres; index on `<=>` |
| Twilio / Meta WhatsApp | Local WhatsApp **simulator** | `WHATSAPP_MODE=twilio` in `webhook.py` |
| Razorpay UPI | Mock `upi://` link + mark-paid | `PAYMENT_MODE=razorpay` in `payments.py` |
| IndicBERT intent+NER | Rule-based NLU (`services/nlu.py`) | drop-in behind `nlu.parse()` |
| sentence-transformers | Hashing bag-of-words embedder | replace `embeddings.embed_text()` |
| FashionCLIP "Dikhao" | Text-hint stub (`pipeline._handle_visual`) | image embed in the same function |
| LightGBM forecast | Moving-average projection | replace `analytics.summary` forecast |
| Llama 3 on Groq | Groq API (smart fallback) | `GROQ_API_KEY` (optional, falls back to static template) |

**Message pipeline** (`services/pipeline.py`) is the one path all inputs fan into —
build once, reuse for text / voice / image, exactly as the TRD specifies.

---

## Run it

Two terminals. **Python 3.9+ and Node 18+ only** — no Docker, no keys.

### 1. Backend (FastAPI, port 8000)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.seed          # creates munim.db: 1 shop, 25 products, customers, orders
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (React + Vite, port 5173)

```bash
cd frontend
npm install
npm run dev                 # open http://localhost:5173
```

The Vite dev server proxies `/api` and `/ws` to the backend, so just open the dashboard
and use the **WhatsApp simulator** on the right. Try the quick-action buttons.

---

## Project layout

```
backend/
  app/
    main.py                # FastAPI app + routers + CORS + table create
    config.py  db.py       # env config, SQLAlchemy engine (SQLite→Postgres swap)
    models.py              # businesses/products/customers/orders/order_items/messages
    embeddings.py          # pluggable text embedder (hashing BoW → sentence-transformers)
    seed.py                # demo catalog + customers + past orders (run: python -m app.seed)
    services/
      nlu.py               # intent + entity + language (rule-based → IndicBERT)
      search.py            # vector cosine + attribute boosting (→ pgvector)
      orders.py            # transactional order/stock state machine (spec A3)
      payments.py          # UPI link (mock → Razorpay)
      crm.py               # customer upsert + segmentation
      reply.py             # localized templates (→ IndicTrans2)
      pipeline.py          # THE core message pipeline (spec A1)
    routers/               # webhook, products, orders, customers, analytics, business, ws
frontend/
  src/
    App.tsx                # layout + live websocket wiring
    components/            # Sidebar, WhatsappSimulator, ui helpers
    pages/                 # Home, Inventory, Orders, CRM, Analytics, Settings
```

## API surface (matches TRD T3)

`GET /health` · `GET /health/live` · `GET /health/ready` ·
`POST /webhook/whatsapp` · `POST /nlu/parse` · `POST /media/transcribe` ·
`POST /media/vision-search` · `POST /search/semantic` · `GET/POST /products` ·
`GET/POST /orders` · `POST /orders/{id}/pay` · `POST /payments/webhook` ·
`GET /customers/{wa_no}` · `GET /analytics/summary` · `WS /ws/dashboard`

Interactive docs at **`/docs`** (Swagger UI) and **`/redoc`**.

## Tests

```bash
cd backend && source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest              # nlu, orders (oversell/txn), pipeline, api
```

## More docs

- [DevOps & Integrations Guide](docs/DEVOPS.md) — config, Twilio/Razorpay/ngrok, health, logging, deploy
- [Contributing & Branching](CONTRIBUTING.md)

---

## Next steps (post-MVP)

1. **Real ML**: fine-tune IndicBERT on the labelled-utterances sheet; embed the catalog
   with FashionCLIP for true "Dikhao"; wire IndicWhisper for voice.
2. **Real infra**: point `DATABASE_URL` at Postgres+pgvector; move sessions/queues to Redis.
3. **Real channels**: flip `WHATSAPP_MODE=twilio` and `PAYMENT_MODE=razorpay`, add ngrok
   for the public webhook.
4. **Polish for demo**: seed beautiful data, record a backup video, rehearse the 5-min script.
