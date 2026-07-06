"""Catalog search: dense-vector cosine + structured attribute boosting.

Matches the TRD /search/semantic contract. In-process numpy cosine over all active
products (fine for a demo catalog of ~25). Swap to pgvector ivfflat by changing the
candidate fetch to an ORDER BY embedding <=> query_vec query — scoring stays the same.
"""
from __future__ import annotations

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

    if db.bind.dialect.name == "postgresql":
        # Native pgvector database-side search (using <=> operator via Product.text_embedding.cosine_distance)
        distance_expr = Product.text_embedding.cosine_distance(q_vec)
        results = (
            db.query(Product, distance_expr)
            .filter(Product.business_id == business_id, Product.is_active.is_(True))
            .order_by(distance_expr)
            .limit(limit * 3)  # fetch larger candidate pool to apply python keyword/size boosting
            .all()
        )
        scored = []
        for p, distance in results:
            # Cosine distance = 1.0 - Cosine similarity
            score = 1.0 - float(distance) if distance is not None else 0.0

            # keyword overlap boost (brand/name are the strongest signals for a demo)
            hay = f"{p.name} {p.brand or ''} {p.category or ''}".lower()
            overlap = sum(1 for k in keywords if k in hay)
            score += 0.15 * overlap

            # attribute (size) boost / penalty
            attrs = {str(k).lower(): str(v).lower() for k, v in (p.attributes or {}).items()}
            if want_size:
                if attrs.get("size") == want_size:
                    score += 0.4
                elif "size" in attrs:
                    score -= 0.1  # has a size but not the requested one

            scored.append((score, p))
    else:
        # Fallback NumPy in-memory scan (SQLite / testing)
        products = (
            db.query(Product)
            .filter(Product.business_id == business_id, Product.is_active.is_(True))
            .all()
        )
        scored = []
        for p in products:
            score = embeddings.cosine(q_vec, p.text_embedding or [])

            # keyword overlap boost (brand/name are the strongest signals for a demo)
            hay = f"{p.name} {p.brand or ''} {p.category or ''}".lower()
            overlap = sum(1 for k in keywords if k in hay)
            score += 0.15 * overlap

            # attribute (size) boost / penalty
            attrs = {str(k).lower(): str(v).lower() for k, v in (p.attributes or {}).items()}
            if want_size:
                if attrs.get("size") == want_size:
                    score += 0.4
                elif "size" in attrs:
                    score -= 0.1  # has a size but not the requested one

            scored.append((score, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [_to_match(p, score) for score, p in scored[:limit] if score > 0]


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
            if p.image_embedding
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
