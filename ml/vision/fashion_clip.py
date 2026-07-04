"""FashionCLIP embeddings for visual search ("Dikhao").

Model: patrickjohncyh/fashion-clip — CLIP ViT-B/32 fine-tuned on fashion imagery.
Produces 512-d vectors that match products.image_embedding VECTOR(512), so both the
catalog image and a customer's screenshot land in the same space → cosine search.

The model is lazy-loaded and cached. `is_available()` returns False when torch /
transformers / pillow aren't installed, so the backend falls back to the text-hint
stub and the demo never breaks (TRD reliability: rule-based fallback behind ML).
"""
from __future__ import annotations

import io
import logging
import urllib.request
from functools import lru_cache
from typing import List, Optional, Union

log = logging.getLogger("munim.vision")

MODEL_NAME = "patrickjohncyh/fashion-clip"
EMBED_DIM = 512


def is_available() -> bool:
    """True only if the heavy deps are importable (checked without loading weights)."""
    try:
        import PIL  # noqa: F401
        import torch  # noqa: F401
        import transformers  # noqa: F401

        return True
    except Exception:
        return False


@lru_cache(maxsize=1)
def _load():
    import torch
    from transformers import CLIPModel, CLIPProcessor

    log.info("loading FashionCLIP (%s) …", MODEL_NAME)
    model = CLIPModel.from_pretrained(MODEL_NAME)
    model.eval()
    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    torch.set_grad_enabled(False)
    log.info("FashionCLIP ready")
    return model, processor


def _normalize(vec) -> List[float]:
    import numpy as np

    v = np.asarray(vec, dtype="float32").ravel()
    norm = float(np.linalg.norm(v))
    if norm > 0:
        v = v / norm
    return v.tolist()


def embed_image(image: Union[bytes, bytearray, "object"]) -> List[float]:
    """Embed a PIL image or raw image bytes → normalized 512-d vector."""
    import torch
    from PIL import Image

    model, processor = _load()
    if isinstance(image, (bytes, bytearray)):
        image = Image.open(io.BytesIO(image)).convert("RGB")
    with torch.no_grad():
        inputs = processor(images=image, return_tensors="pt")
        feats = model.get_image_features(**inputs)
    return _normalize(feats[0].cpu().numpy())


def embed_text(text: str) -> List[float]:
    """Embed a text query into the SAME space (enables text→image search too)."""
    import torch

    model, processor = _load()
    with torch.no_grad():
        inputs = processor(text=[text], return_tensors="pt", padding=True, truncation=True)
        feats = model.get_text_features(**inputs)
    return _normalize(feats[0].cpu().numpy())


def embed_image_url(url: str, timeout: int = 15) -> Optional[List[float]]:
    """Download an image and embed it. Returns None on any failure (caller falls back)."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            data = resp.read()
        return embed_image(data)
    except Exception as exc:
        log.warning("embed_image_url failed for %s: %s", url, exc)
        return None
