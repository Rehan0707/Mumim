# Demo Runbook — Munim.ai

One page to run the demo flawlessly. Deadline: **6 Jul 2026**.

## 0. Prereqs (once)
- Python 3.12 venv, Node 18+. Backend deps installed, DB seeded.
- (Optional, for real Dikhao) `pip install -r ml/vision/requirements.txt` + weights cached.

## 1. Start it (2 terminals)

**Backend** (port 8000):
```bash
cd backend && source .venv/bin/activate
python -m app.seed                     # fresh catalog: 1 shop, 25 products, customers, orders
# optional real Dikhao (once): (cd .. && python -m ml.vision.embed_catalog)
VISION_PRELOAD=1 uvicorn app.main:app --port 8000    # preload FashionCLIP so 1st search is instant
```

**Frontend** (port 5173):
```bash
cd frontend && npm install && npm run dev   # open http://localhost:5173
```

Health check before you present: open http://localhost:8000/health → `payment_mode`, `whatsapp_mode`.

## 2. The 5-minute demo script

| Time | Beat | Action |
|---|---|---|
| 0:00 | The chaos | "Every shop runs on WhatsApp + a notebook." |
| 0:30 | 🔥 **Dikhao** | In the simulator, send a **curated shirt/sneaker screenshot** → closest matches appear |
| 1:30 | **Hero order** | Type *"Nike size 9 available?"* → *"yes"* → order + **payment link** + **stock 4→3 live on dashboard** |
| 2:30 | Voice | Send the Hindi/Marathi voice note → same flow |
| 3:15 | Dashboard | Show Analytics: revenue trend + restock alert |
| 4:00 | Tech | Architecture + "real custom ML: FashionCLIP + Indic" slide |
| 4:30 | Startup | TAM + "Shopify for 60M WhatsApp shops" |

**The magic moment:** the customer's *"yes"* moves a number on the owner's dashboard in real time (websocket). Point at it.

## 3. Modes (know your switches)
- **Payments:** `PAYMENT_MODE=razorpay` (live test links) — falls back to UPI link automatically if the API hiccups.
- **WhatsApp:** `WHATSAPP_MODE=mock` (simulator — **use this on stage**, no wifi dependency). `twilio` needs SID/token (not wired; Twilio console outage).
- **Dikhao:** real FashionCLIP if `ml/vision` deps + `embed_catalog` are done; else auto text-hint fallback.

## 4. Failure path (rehearse this!)
- **Wifi dies / Razorpay slow:** order still completes — it falls back to a `upi://` link. If needed, set `PAYMENT_MODE=mock` for zero network.
- **Dikhao misses on a screenshot:** it always returns "closest match" (never "exact"). Use the **curated** screenshots in `data/screenshots/` that match seed items.
- **Anything weird:** the bot never dead-ends — low confidence → "Ek minute, main check karke batata hoon."
- **Total meltdown:** play the backup video (`design/demo-video/`).

## 5. Pre-demo checklist
- [ ] `python -m pytest` in backend → all green
- [ ] Both servers up; `/health` returns ok
- [ ] Dashboard open on Home; simulator ready
- [ ] Curated screenshots + voice note on the demo phone/laptop
- [ ] FashionCLIP warmed (VISION_PRELOAD or one throwaway search)
- [ ] Backup video ready; laptop charged
