"""Pluggable text embedder.

Real path: a **multilingual sentence-transformer**
(paraphrase-multilingual-MiniLM-L12-v2) — 384-d, understands Hindi/Hinglish/English,
and matches the schema's text_embedding VECTOR(384). This is the encoder the TRD
specifies for text search.

Falls back to a deterministic hashing bag-of-words vectorizer (also 384-d) when the
model/deps are unavailable, so the backend ALWAYS works — no heavy deps at import,
no gated downloads, no dead search. Set MUNIM_EMBEDDER=hash to force the fast fallback
(used in tests). Both encoders + the fallback are 384-d, so dimensions never mismatch.
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
_MODEL_NAME = os.environ.get(
    "MUNIM_EMBED_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)


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
def _load_encoder():
    """Lazy-load the sentence-transformer once. Returns the model or None (→ hashing).

    Heavy deps are imported HERE, not at module import, so the backend stays importable
    without them.
    """
    if os.environ.get("MUNIM_EMBEDDER", "").lower() == "hash":
        return None
    try:
        from sentence_transformers import SentenceTransformer

        log.info("loading sentence-transformer %s …", _MODEL_NAME)
        model = SentenceTransformer(_MODEL_NAME)
        log.info("text encoder ready")
        return model
    except Exception as exc:
        log.info("sentence-transformer unavailable (%s) — using hashing embedder", exc)
        return None


def embed_text(text: str) -> List[float]:
    """Embed text → normalized 384-d vector. Real multilingual model if available, else hashing."""
    if not text:
        return _hash_embed("")
    model = _load_encoder()
    if model is None:
        return _hash_embed(text)
    vec = model.encode(text, normalize_embeddings=True)
    return np.asarray(vec, dtype=np.float32).tolist()


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
