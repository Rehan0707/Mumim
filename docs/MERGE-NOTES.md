# Merge Notes — `feature/ml-setup` → `main`

**Merged:** 5 Jul 2026 (commits `c3616b0` merge + `8cc8421` hardening).
**For:** Role 2 (AI/ML). Thanks for the IndicBERT work! 🙏 A few things to know.

## What was merged
- Offline model caching setup (`backend/scripts/download_models.py`)
- Real IndicBERT integration in `backend/app/embeddings.py`
- Semantic `?q` search on `GET /products`

## What I changed on merge (and why)
Your `embeddings.py` broke `main` for anyone without the ML deps/weights, so I
reworked it into a **robust hybrid** (same real-IndicBERT behaviour, safe fallback):

1. **Lazy loading** — `torch`/`transformers` and the model now load *inside a cached
   loader*, not at module import. Before, `import app.*` pulled in torch and loaded
   IndicBERT at import → the backend wouldn't even start without the heavy deps
   (CI, fresh clones, other teammates all broke).
2. **Real fallback** — when weights are absent it now falls back to the hashing
   embedder instead of returning **zero vectors** (zeros = dead search / broken hero flow).
3. **Dimension-safe `cosine()`** — IndicBERT is **768-dim** but the seeded catalog is
   **384-dim**; mixing them crashed cosine. It now returns 0 on a length mismatch
   instead of raising.

Your real path is fully preserved: **IndicBERT activates automatically** when
`backend/weights/indic-bert/` exists.

## To activate real IndicBERT
```bash
cd backend && source .venv/bin/activate
python scripts/download_models.py        # fetch weights into backend/weights/
python -m app.seed                        # RE-SEED so the catalog re-embeds at 768-dim
uvicorn app.main:app --port 8000
```
⚠️ **Re-seed after downloading** — catalog and query embeddings must use the same
encoder (both 768-dim), or search quality degrades.

## Please do next
- **Rebase your next work on `main`** — your branch was 5 commits behind; `main` now
  has everything (Razorpay live, FashionCLIP Dikhao, demo cards, this merge).
- Note: `requirements.txt` pins `transformers==4.46.3`; FashionCLIP (`ml/vision`) was
  tested on 5.x. Both expose `CLIPModel`, so fine — just flag if a fresh install misbehaves.

_This branch has been deleted on the remote (fully merged). Restore anytime from `5e5a58c` if needed._
