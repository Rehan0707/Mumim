# DevOps & Integrations Guide

How to run, configure, integrate, observe, and deploy the Munim.ai backend.

---

## 1. Local setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt     # runtime + test deps
cp .env.example .env
python -m app.seed                       # create + seed munim.db
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

Everything runs in **mock mode** with no external keys.

---

## 2. Configuration (env vars)

All config is env-based (`app/config.py`, loaded from `.env`).

| Var | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | `development` \| `production` |
| `LOG_LEVEL` | `INFO` | `DEBUG`/`INFO`/`WARNING`/`ERROR` |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allow-origin |
| `DATABASE_URL` | `sqlite:///./munim.db` | swap to `postgresql+psycopg://…` for pgvector |
| `PAYMENT_MODE` | `mock` | `mock` \| `razorpay` |
| `RAZORPAY_KEY_ID` / `_SECRET` / `_WEBHOOK_SECRET` | — | Razorpay test creds |
| `WHATSAPP_MODE` | `mock` | `mock` \| `twilio` |
| `TWILIO_ACCOUNT_SID` / `_AUTH_TOKEN` / `_WHATSAPP_FROM` | — | Twilio Sandbox creds |
| `GROQ_API_KEY` | — | optional: Groq API key for conversational LLM fallback |

---

## 3. Health checks

| Endpoint | Meaning |
| --- | --- |
| `GET /health` | basic status + active integration modes |
| `GET /health/live` | liveness (process up) — use for container liveness probe |
| `GET /health/ready` | readiness (DB reachable, `SELECT 1`) — returns `503` if DB down |

---

## 4. Logging & observability

- Structured single-line logs with a per-request id (`rid`), configured in
  `app/logging_config.py`. Uvicorn logs are routed through the same handler.
- `RequestContextMiddleware` (`app/middleware.py`) times every request, logs an
  access line, and returns `X-Request-ID` + `X-Process-Time-ms` headers.
- Conversations (message + intent + language) are logged to the `messages` table
  by the pipeline — that's both the CRM and the model-training flywheel.

---

## 5. Integrations

### WhatsApp — Twilio Sandbox (`WHATSAPP_MODE=twilio`)

1. Activate the Twilio WhatsApp Sandbox; note the join code + sandbox number.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.
3. In production, point the Sandbox **When a message comes in** webhook to
   `https://backend-olive-delta-46.vercel.app/webhook/whatsapp` with method
   `POST`. For a local-only demo, expose the local server with ngrok and use
   `https://<ngrok-url>/webhook/whatsapp` instead.
4. Have each tester join the Sandbox from WhatsApp by sending the console's
   `join <code>` message to the Twilio Sandbox number.
5. Inbound Twilio form payloads are normalized in `routers/webhook.py`. For live
   Sandbox replies, the webhook returns TwiML directly, so the bot answers in the
   same request and does not depend on a second outbound REST call. JSON simulator
   requests still receive the normal JSON response.

The production Vercel URL is stable. Ngrok URLs change when the tunnel restarts,
so refresh the local-demo value before presenting from a laptop.

### Payments — Razorpay (`PAYMENT_MODE=razorpay`)

1. Create a Razorpay **test** account; set `RAZORPAY_KEY_ID` / `_SECRET`.
2. Set `RAZORPAY_WEBHOOK_SECRET` and add a webhook →
   `https://<url>/payments/webhook`.
3. `integrations/razorpay_client.py` creates hosted Payment Links and verifies the
   `X-Razorpay-Signature` (HMAC-SHA256 over the raw body). Invalid signatures → `401`.

In mock mode, `generate_payment_link` returns a `upi://pay?…` intent link and the
webhook accepts any body (no signing).

### Local public webhooks — ngrok

```bash
./scripts/ngrok.sh 8000
# local webhook base = https://<subdomain>.ngrok-free.app
#   Twilio   → /webhook/whatsapp
#   Razorpay → /payments/webhook
```

---

## 6. Error handling

All errors return a consistent envelope:

```json
{ "error": { "type": "out_of_stock", "status": 409, "detail": "…" } }
```

Types: `http_error`, `validation_error`, `out_of_stock`, `order_error`,
`internal_error`. Unhandled exceptions are logged with a traceback and returned as
a safe `500` (no internals leaked). See `app/errors.py`.

---

## 7. Tests

```bash
cd backend && source .venv/bin/activate
python -m pytest              # 43 tests: nlu, orders, pipeline, api
```

Tests use an isolated temp SQLite DB, re-seeded before each test (`tests/conftest.py`).

---

## 8. Deployment notes

- **Backend**: Vercel at `https://backend-olive-delta-46.vercel.app`. The REST
  API and signed Twilio webhook run there; use polling instead of WebSockets in
  the Firebase production frontend.
- **DB**: Neon Postgres (set `DATABASE_URL` in Vercel); Redis and native vector
  indexing remain future production-scale work.
- **Frontend**: Firebase Hosting at `https://munim-app.web.app`, built with
  `npm run build` and deployed with `firebase deploy --only hosting`.
- Keep demo vs dev keys separate; never commit `.env` (git-ignored).
