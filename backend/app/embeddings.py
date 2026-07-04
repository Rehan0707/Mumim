"""Pluggable text embedder.

Prefers a real **offline IndicBERT** encoder (Role 2, ml-setup) when its weights are
present under backend/weights/indic-bert; otherwise falls back to a deterministic
hashing bag-of-words vectorizer so the backend ALWAYS works — no heavy deps loaded
at import, no downloads required, no dead search.

Both the catalog (seed) and live queries go through embed_text(), so whichever
encoder is active, dimensions stay consistent within a deployment. `cosine()` is
also dimension-safe, so a stray mismatch degrades to 0 instead of crashing.
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
from functools import lru_cache
from typing import List, Optional

import numpy as np

from .config import settings

log = logging.getLogger("munim.embeddings")

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "..", "weights")
_INDIC_DIR = os.path.join(_WEIGHTS_DIR, "indic-bert")


def _tokenize(text: str) -> List[str]:
    return _TOKEN_RE.findall((text or "").lower())


def _hash_embed(text: str) -> List[float]:
    """Offline fallback: hash tokens (+ char trigrams) into a normalized dense vector."""
    dim = settings.EMBEDDING_DIM
    vec = np.zeros(dim, dtype=np.float32)
    tokens = _tokenize(text)
    grams = tokens + [t[i : i + 3] for t in tokens for i in range(max(1, len(t) - 2))]
    for tok in grams:
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = float(np.linalg.norm(vec))
    if norm > 0:
        vec /= norm
    return vec.tolist()


@lru_cache(maxsize=1)
def _load_indicbert():
    """Lazy-load IndicBERT once. Returns (tokenizer, model) or None if unavailable.

    Heavy deps (torch/transformers) are imported HERE, not at module import, so the
    backend stays importable without them.
    """
    if not os.path.isdir(_INDIC_DIR):
        log.info("IndicBERT weights not found (%s) — using hashing embedder", _INDIC_DIR)
        return None
    try:
        import torch  # noqa: F401
        from transformers import AutoModel, AutoTokenizer

        log.info("loading offline IndicBERT …")
        tokenizer = AutoTokenizer.from_pretrained(_INDIC_DIR)
        model = AutoModel.from_pretrained(_INDIC_DIR)
        model.eval()
        log.info("IndicBERT ready")
        return tokenizer, model
    except Exception as exc:  # pragma: no cover - only when weights present but broken
        log.warning("IndicBERT load failed (%s) — using hashing embedder", exc)
        return None


def embed_text(text: str) -> List[float]:
    """Embed text → normalized dense vector. IndicBERT if available, else hashing."""
    if not text:
        return _hash_embed("")
    bundle = _load_indicbert()
    if bundle is None:
        return _hash_embed(text)

    import torch

    tokenizer, model = bundle
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
    # mean-pool token vectors → one sentence vector, then normalize
    vec = outputs.last_hidden_state.mean(dim=1).squeeze().cpu().numpy()
    norm = float(np.linalg.norm(vec))
    if norm > 0:
        vec = vec / norm
    return vec.astype(np.float32).tolist()


def cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):  # dim guard: never crash on mismatch
        return 0.0
    va, vb = np.asarray(a, dtype=np.float32), np.asarray(b, dtype=np.float32)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


def product_text(name: str, brand: Optional[str] = None, attributes: Optional[dict] = None) -> str:
    """Canonical text used to build a product's text_embedding (name+brand+attributes)."""
    parts = [name or "", brand or ""]
    if attributes:
        parts.extend(str(v) for v in attributes.values())
    return " ".join(p for p in parts if p)
