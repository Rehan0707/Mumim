"""Catalog search: dense-vector cosine + structured attribute boosting.

Matches the TRD /search/semantic contract. In-process numpy cosine over all active
products (fine for a demo catalog of ~25). Swap to pgvector ivfflat by changing the
candidate fetch to an ORDER BY embedding <=> query_vec query — scoring stays the same.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from .. import embeddings
from ..models import Product


def semantic_search(
    db: Session,
    business_id: str,
    query: str,
    entities: Optional[Dict[str, object]] = None,
    limit: int = 5,
) -> List[dict]:
    entities = entities or {}
    q_vec = embeddings.embed_text(query)
    want_size = str(entities.get("size")).lower() if entities.get("size") else None
    keywords = [k.lower() for k in entities.get("keywords", [])]

    # Demo catalogs are intentionally small (~25 SKUs), so scan all active products
    # and blend lexical + vector scores. This is more robust than trusting a
    # database-side vector shortlist when deployed data was embedded by an older
    # model/hash version.
    products = (
        db.query(Product)
        .filter(Product.business_id == business_id, Product.is_active.is_(True))
        .all()
    )
    scored = [
        (_product_score(p, q_vec, keywords, want_size), p)
        for p in products
    ]

    scored.sort(key=lambda x: x[0], reverse=True)
    return [_to_match(p, score) for score, p in scored[:limit] if score >=   0]


def _product_score(p: Product, q_vec: list[float], keywords: list[str], want_size: str | None) -> float:
    emb = p.text_embedding
    score = embeddings.cosine(q_vec, emb if emb is not None else [])
    hay = f"{p.name} {p.brand or ''} {p.category or ''}".lower()
    hay_words = set(re.findall(r"[a-z0-9]+", hay))

    synonyms = {
        "shoe": {"shoe", "shoes", "sneaker", "sneakers", "footwear"},
        "shoes": {"shoe", "shoes", "sneaker", "sneakers", "footwear"},
        "sneaker": {"shoe", "shoes", "sneaker", "sneakers", "footwear"},
        "sneakers": {"shoe", "shoes", "sneaker", "sneakers", "footwear"},
    }
    for keyword in keywords:
        variants = synonyms.get(keyword, {keyword})
        if any(v in hay_words or v in hay for v in variants):
            score += 0.45
        if p.brand and keyword == p.brand.lower():
            score += 0.6

    attrs = {str(k).lower(): str(v).lower() for k, v in (p.attributes or {}).items()}
    if want_size:
        if attrs.get("size") == want_size:
            score += 0.5
        elif "size" in attrs:
            score -= 0.15

    return score


def image_search(
    db: Session,
    business_id: str,
    query_vec: List[float],
    limit: int = 3,
) -> List[dict]:
    """Cosine search over products.image_embedding.
    
    Uses pgvector database-side query under PostgreSQL, falls back to NumPy cosine scan under SQLite.
    """
    if not query_vec:
        return []

    if db.bind.dialect.name == "postgresql":
        distance_expr = Product.image_embedding.cosine_distance(query_vec)
        results = (
            db.query(Product, distance_expr)
            .filter(
                Product.business_id == business_id,
                Product.is_active.is_(True),
                Product.image_embedding.isnot(None)
            )
            .order_by(distance_expr)
            .limit(limit)
            .all()
        )
        scored = []
        for p, distance in results:
            score = 1.0 - float(distance) if distance is not None else 0.0
            scored.append((score, p))
    else:
        products = (
            db.query(Product)
            .filter(Product.business_id == business_id, Product.is_active.is_(True))
            .all()
        )
        scored = [
            (embeddings.cosine(query_vec, p.image_embedding), p)
            for p in products
            if p.image_embedding is not None
        ]

    scored.sort(key=lambda x: x[0], reverse=True)
    return [_to_match(p, score) for score, p in scored[:limit] if score > 0]


def _to_match(p: Product, score: float) -> dict:
    return {
        "product_id": p.id,
        "name": p.name,
        "brand": p.brand,
        "size": (p.attributes or {}).get("size"),
        "attributes": p.attributes or {},
        "price": float(p.price),
        "stock_qty": p.stock_qty,
        "image_url": p.image_url,
        "score": round(float(score), 3),
    }
