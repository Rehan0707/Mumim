# Team & Folder Ownership Map

Munim.ai is a **5-person** build. Each person owns a lane (a set of folders) and
pushes into it via short-lived branches (see [CONTRIBUTING.md](CONTRIBUTING.md)).
If you touch someone else's folder, open a PR and tag them.

> **Rule:** build against the agreed **stub contracts** so nobody is blocked.
> Every service already returns mock JSON — swap real logic in behind the same
> function/endpoint signatures.

## Who owns what

| Role | Owner | Folders | What you build |
| --- | --- | --- | --- |
| **1 · DevOps & Integrations** | **Rehan** | `infra/`, `scripts/`, `.github/`, `backend/app/integrations/` | Repo, branching, Twilio + Razorpay + ngrok, CI, deploy, logging/health |
| **2 · AI / ML Engineer** | _teammate_ | `ml/` | IndicBERT (intent+NER), FashionCLIP (Dikhao), IndicWhisper (voice), IndicTrans2, LightGBM forecast |
| **3 · Backend API Engineer** | **Rehan** | `backend/` | FastAPI services, endpoints, Postgres+pgvector, orders/inventory, CRM |
| **4 · Frontend Developer** | _teammate_ | `frontend/` | React + Vite + Tailwind dashboard, WhatsApp simulator, live websocket UI |
| **5 · Product & Design** | _teammate_ | `design/`, `data/` | Pitch deck, mockups, brand, demo catalog, screenshots, voice notes, backup video, QA |

_(Rehan covers Roles 1 & 3; the other three teammates take Roles 2, 4, 5.)_

## Repository layout

```
munim/
├── backend/        [Role 3] FastAPI app — working MVP (SQLite, mock integrations)
├── frontend/       [Role 4] React dashboard + WhatsApp simulator
├── ml/             [Role 2] real models — swap in behind backend's nlu/search/media
│   ├── nlu/ vision/ speech/ translation/ embeddings/ forecast/
│   ├── notebooks/  data/  weights/(git-ignored)
├── infra/          [Role 1] docker, deploy configs, ngrok
├── design/         [Role 5] pitch-deck, mockups, brand, demo-video
├── data/           [Role 5] seed-catalog, screenshots, voice-notes
├── docs/           [shared] PRD/TRD context + DevOps guide
└── scripts/        [Role 1] dev/ops helper scripts (ngrok, etc.)
```

## How the ML lane plugs in (no rewrites)

The backend already exposes the contracts the models will serve. Role 2 builds the
real model in `ml/` and the backend swaps its call target — nothing else changes:

| Backend seam (today: rule-based/mock) | Real model in `ml/` |
| --- | --- |
| `backend/app/services/nlu.py` → `parse()` | `ml/nlu/` (IndicBERT) |
| `backend/app/services/search.py` + `embeddings.py` | `ml/embeddings/` (sentence-transformers) |
| `backend/app/routers/media.py` → vision-search | `ml/vision/` (FashionCLIP) |
| `backend/app/routers/media.py` → transcribe | `ml/speech/` (IndicWhisper) |
| `backend/app/services/reply.py` | `ml/translation/` (IndicTrans2) |
| `backend/app/routers/analytics.py` → forecast | `ml/forecast/` (LightGBM) |
