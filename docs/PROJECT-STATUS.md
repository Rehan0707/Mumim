# Munim.ai — Project Status

**As of:** 5 Jul 2026 · **Deadline:** 6 Jul 2026 · **Repo:** [github.com/Rehan0707/Mumim](https://github.com/Rehan0707/Mumim)

> **TL;DR:** The full P0 demo path is **built, real, and working end-to-end** — text ordering,
> real Razorpay payments, real FashionCLIP visual search, real multilingual semantic search,
> receipt-scan onboarding, and a live dashboard. Twilio is authenticated & wired; the only
> remaining step is the live phone round-trip config (your Twilio console + phone).

**Overall: ~90% of the demo scope done.** Remaining is mostly polish + optional differentiators.

---

## ✅ DONE

### Backend API (Role 3) — 100%
- FastAPI + Uvicorn + Pydantic, layered architecture (routers → services → integrations)
- Schema: businesses, products, customers, orders, order_items, messages (SQLite via SQLAlchemy)
- **Transactional** order + stock decrement (oversell-proof); order state machine
- All endpoints: `/webhook/whatsapp`, `/nlu/parse`, `/media/transcribe`, `/media/vision-search`,
  `/products` (+`/scan` +`/bulk`), `/orders` (+`/pay` +`/payments/webhook` +`/fulfill`),
  `/businesses` (+POST), `/customers`, `/analytics/summary`, `/health` (+`/live` +`/ready`), `WS /ws/dashboard`
- Logging, request-id middleware, global exception handling, CORS, Swagger `/docs`
- **35 automated tests pass**; CI green (GitHub Actions)

### Integrations / DevOps (Role 1) — 95%
- ✅ GitHub repo, branching strategy, `.gitignore`, `.env` / `.env.example`
- ✅ **Razorpay — LIVE** (real test keys, verified: real hosted payment links)
- ✅ **Twilio — authenticated & wired** (`WHATSAPP_MODE=twilio`, real SID+token verified)
- ✅ **ngrok installed + tunnel live** (public webhook URL working)
- ✅ Logging, middleware, health checks, CI, docs
- ⏳ *Live phone→bot round-trip* needs Sandbox webhook config + join (below)

### AI / ML (Role 2) — 75%
- ✅ **Real multilingual semantic search** (sentence-transformers; understands Hindi/Hinglish)
- ✅ **Real FashionCLIP visual "Dikhao"** (image→product, 25/25 catalog embedded)
- ✅ **Real receipt/bill OCR** (easyocr → auto-extract products)
- ✅ Rule-based NLU intent+entity (fast, deterministic fallback)
- ⏳ Voice (real IndicWhisper) — currently mock transcribe
- ⏳ Localized replies (IndicTrans2) — currently Hinglish templates
- ⏳ Forecast (LightGBM) — currently moving-average stub

### Frontend (Role 4/5) — 90%
- ✅ Live dashboard: Home, Inventory, Orders, CRM, Analytics, Settings (real data + websocket)
- ✅ WhatsApp simulator with **Dikhao product-photo cards** + live mode label
- ✅ **Receipt-scan** camera flow (upload → OCR → review → add)
- ✅ **Landing + Auth + Onboarding** front-door flow
- ✅ The "magic moment": customer "yes" moves dashboard numbers live

---

## 🔲 REMAINING

### Blocking-ish (for a fully-live demo)
| Item | Owner | Notes |
|---|---|---|
| Twilio Sandbox webhook + phone join | You + teammate | Point sandbox "when a message comes in" → ngrok `/webhook/whatsapp`; join from phone. ~5 min |

### Optional differentiators (nice-to-have, spec P1/P2)
| Item | Owner | Status |
|---|---|---|
| Real voice orders (IndicWhisper) | Role 2 | stubbed |
| Multilingual replies (IndicTrans2) | Role 2 | templates |
| Real forecast (LightGBM) | Role 2 | stub chart |
| Postgres + pgvector migration (PR #2) | Role 1 | **deferred to post-hackathon** (SQLite works; PR removed tests + needs infra) |

### Demo prep (Role 5) — the win factors
| Item | Status |
|---|---|
| Curated demo screenshots that match seed items | ⏳ todo |
| Clean Hindi/Marathi voice note | ⏳ todo |
| Pitch deck (5-min) | ⏳ todo |
| Backup demo video | ⏳ todo |
| Rehearse 5-min script ×5 | ⏳ todo |

---

## PRD feature scorecard (F1–F12)
| ID | Feature | Status |
|---|---|---|
| F1 | WhatsApp text ordering | ✅ real |
| F2 | Visual search "Dikhao" | ✅ **real (FashionCLIP)** |
| F3 | AI inventory (auto-decrement, low-stock) | ✅ real |
| F4 | Auto billing + payment | ✅ **real (Razorpay)** |
| F5 | Owner dashboard | ✅ real (live) |
| F6 | Voice orders | 🟡 stub |
| F7 | Multilingual replies | 🟡 templates |
| F8 | Customer CRM | ✅ real |
| F9 | Analytics + forecast | ✅ KPIs real / forecast stub |
| F10 | Daily WhatsApp summary | ⬜ roadmap |
| F11 | Catalog onboarding by photo | ✅ **real (receipt OCR)** |
| F12 | Recommendations | ⬜ roadmap |

**MVP set the PRD says to "build real" (F1–F5) = all done ✅**

---

## Open PRs
- **PR #2** (Postgres+pgvector) — **not merged**, deferred post-hackathon (removed tests, reverts receipt scan, needs Postgres running)
- **PR #3** (frontend redesign) — **partially merged**: took Landing/Auth/Onboarding; skipped the static-mockup dashboard pages to protect the live dashboard

## Known risks / mitigations
- Wifi/Twilio on stage → simulator is offline-safe (`WHATSAPP_MODE=mock`); Razorpay falls back to UPI
- Dikhao top-1 accuracy → use curated screenshots that match seed items
- Heavy ML deps → kept out of core `requirements.txt` (opt-in `requirements-ml.txt`); tests run without them
