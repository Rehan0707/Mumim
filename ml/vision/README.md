# ml/vision — Visual search "Dikhao" (FashionCLIP)  ·  Role 2

Screenshot → detect+crop garment → FashionCLIP 512-d embedding → cosine search
over the catalog's `image_embedding`. Always phrase results as "closest match".

**Contract to match:**

```python
embed_image(image_bytes) -> list[float]   # 512-d, matches products.image_embedding
```

Backend seam: `backend/app/routers/media.py` (`/media/vision-search`) +
`backend/app/services/vision.py` (bridge with graceful fallback).
Demo screenshots that must match seed items: `../../data/screenshots/`.

## Enable real Dikhao (implemented ✅)

```bash
# from repo root, in the backend venv
pip install -r ml/vision/requirements.txt   # torch, transformers, pillow
./ml/vision/download_weights.sh              # pre-cache FashionCLIP (~600MB) — do before demo
cd backend && python -m app.seed && cd ..    # fresh catalog
python -m ml.vision.embed_catalog            # compute products.image_embedding
```

Now `/media/vision-search` and the WhatsApp image path use real image→image cosine
search. Without these deps/embeddings it auto-falls back to the text-hint stub.

**Demo tips**
- The model loads on first request (~10s). **Warm it once before demoing**, or set
  `VISION_PRELOAD=1` (loads at startup).
- For wifi-fail safety set `HF_HUB_OFFLINE=1` after the weights are cached.
- Use **curated screenshots** that clearly match seed items (spec F2 rule) — generic
  images give noisier top-1 results.
