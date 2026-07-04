"""Dikhao visual-search bridge (backend ↔ ml/vision).

If FashionCLIP (ml/vision) is installed AND the catalog has image embeddings, we do
real image→image cosine search. Otherwise we fall back to the text-hint stub, so the
feature degrades gracefully instead of breaking the demo.

The repo root is added to sys.path so the backend can import the ML package that the
ML teammate owns in ml/vision/ (single-process demo; split into a service later).
"""
from __future__ import annotations

import logging
import pathlib
import sys
from typing import List, Optional

from sqlalchemy.orm import Session

from ..models import Product
from . import search

log = logging.getLogger("munim.vision")

_ROOT = pathlib.Path(__file__).resolve().parents[3]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def model_available() -> bool:
    try:
        from ml.vision import fashion_clip

        return fashion_clip.is_available()
    except Exception:
        return False


def warmup() -> None:
    """Load FashionCLIP now (used at startup when VISION_PRELOAD=1) so the first
    real request doesn't pay the ~10s model-load cost mid-demo."""
    if not model_available():
        log.info("vision warmup skipped — FashionCLIP not installed")
        return
    try:
        from ml.vision import fashion_clip

        fashion_clip.embed_text("warmup")  # triggers the cached model load
        log.info("FashionCLIP preloaded (VISION_PRELOAD)")
    except Exception as exc:
        log.warning("vision warmup failed: %s", exc)


def catalog_has_embeddings(db: Session, business_id: str) -> bool:
    return (
        db.query(Product)
        .filter(Product.business_id == business_id, Product.image_embedding.isnot(None))
        .first()
        is not None
    )


def search_by_image_url(db: Session, business_id: str, image_url: str, limit: int = 3) -> Optional[List[dict]]:
    """Real image search. Returns None when unavailable so the caller can fall back."""
    if not (model_available() and catalog_has_embeddings(db, business_id)):
        return None
    from ml.vision import fashion_clip

    query_vec = fashion_clip.embed_image_url(image_url)
    if not query_vec:
        return None
    log.info("Dikhao: FashionCLIP image search over catalog")
    return search.image_search(db, business_id, query_vec, limit=limit)
