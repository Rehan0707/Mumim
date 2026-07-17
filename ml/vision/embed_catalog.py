"""Compute FashionCLIP image_embedding for every product (run once after seeding).

Downloads each product's image_url, embeds it with FashionCLIP, and stores the 512-d
vector in products.image_embedding — enabling real "Dikhao" image search.

Usage (from repo root, backend venv with ml/vision deps installed):
    python -m ml.vision.embed_catalog
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))                 # import ml.vision.*
sys.path.insert(0, str(ROOT / "backend"))     # import app.*

from ml.vision import fashion_clip  # noqa: E402


def run() -> None:
    if not fashion_clip.is_available():
        raise SystemExit("FashionCLIP deps missing — pip install -r ml/vision/requirements.txt")

    from backend.app.db import SessionLocal
    from backend.app.models import Product

    db = SessionLocal()
    try:
        products = db.query(Product).all()
        done, failed = 0, 0
        for p in products:
            if not p.image_url:
                continue
            vec = fashion_clip.embed_image_url(p.image_url)
            if vec:
                p.image_embedding = vec
                done += 1
                print(f"  ✓ {p.name}")
            else:
                failed += 1
                print(f"  ✗ {p.name} (image fetch/embed failed)")
        db.commit()
        print(f"\nEmbedded {done} products ({failed} failed) into image_embedding.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
