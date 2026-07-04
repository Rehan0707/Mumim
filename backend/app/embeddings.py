"""Pluggable embedder.

Pragmatic MVP: a deterministic hashing bag-of-words vectorizer — zero downloads,
works fully offline, produces a normalized EMBEDDING_DIM vector. Mechanically it
is real vector search (cosine over dense vectors); only the encoder is simple.

To swap in real semantics later, replace `embed_text` with a sentence-transformers
call (e.g. paraphrase-multilingual-MiniLM-L12-v2) — nothing else changes.
"""
from __future__ import annotations

import hashlib
import re
from typing import List

import numpy as np

from .config import settings

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> List[str]:
    return _TOKEN_RE.findall((text or "").lower())


def embed_text(text: str) -> List[float]:
    """Hash tokens (+ char bigrams for fuzziness) into a normalized dense vector."""
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


def cosine(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    va, vb = np.asarray(a, dtype=np.float32), np.asarray(b, dtype=np.float32)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


def product_text(name: str, brand: str = None, attributes: dict = None) -> str:
    """Canonical text used to build a product's text_embedding (spec: name+brand+attributes)."""
    parts = [name or "", brand or ""]
    if attributes:
        parts.extend(str(v) for v in attributes.values())
    return " ".join(p for p in parts if p)
