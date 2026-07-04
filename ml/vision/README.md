# ml/vision — Visual search "Dikhao" (FashionCLIP)  ·  Role 2

Screenshot → detect+crop garment → FashionCLIP 512-d embedding → cosine search
over the catalog's `image_embedding`. Always phrase results as "closest match".

**Contract to match:**

```python
embed_image(image_bytes) -> list[float]   # 512-d, matches products.image_embedding
```

Backend seam: `backend/app/routers/media.py` (`/media/vision-search`).
Demo screenshots that must match seed items: `../../data/screenshots/`.
Weights → `../weights/` (git-ignored).
