"""Products / inventory endpoints. Embeddings are computed on write (spec S4)."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import embeddings
from ..db import get_db
from ..models import Product
from ..schemas import ProductIn, SemanticSearchRequest
from ..security import require_owner_auth
from ..services import receipt, search

router = APIRouter(tags=["products"])


def _serialize(p: Product) -> dict:
    return {
        "id": p.id, "name": p.name, "brand": p.brand, "category": p.category,
        "attributes": p.attributes or {}, "price": float(p.price), "stock_qty": p.stock_qty,
        "image_url": p.image_url, "is_active": p.is_active,
    }


def _create_one(db: Session, business_id: str, body: ProductIn) -> Product:
    text = embeddings.product_text(body.name, body.brand, body.attributes)
    product = Product(
        business_id=business_id, name=body.name, brand=body.brand, category=body.category,
        attributes=body.attributes, price=body.price, stock_qty=body.stock_qty,
        image_url=body.image_url, text_embedding=embeddings.embed_text(text),
    )
    db.add(product)
    return product


class BulkProductsIn(BaseModel):
    products: List[ProductIn]



@router.get("/products")
def list_products(business_id: str, q: str = None, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    # Agar user ne kuch search kiya hai, toh seedha AI Semantic Search chalega
    if q:
        # Hum seedha tumhare teammate ka banaya hua search function call kar rahe hain
        return search.semantic_search(db, business_id, q, limit=10)
    
    # Agar query nahi hai, toh purana logic (poori dukaan ka saaman dikhao)
    query = db.query(Product).filter(Product.business_id == business_id, Product.is_active.is_(True))
    products = query.order_by(Product.name).all()
    return [_serialize(p) for p in products]

@router.post("/products", status_code=201)
def create_product(business_id: str, body: ProductIn, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    product = _create_one(db, business_id, body)
    db.commit()
    db.refresh(product)
    return _serialize(product)


@router.post("/products/bulk", status_code=201)
def create_products_bulk(business_id: str, body: BulkProductsIn, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    """Add many products at once (used after a receipt scan is reviewed)."""
    created = [_create_one(db, business_id, p) for p in body.products]
    db.commit()
    for p in created:
        db.refresh(p)
    return {"created": len(created), "products": [_serialize(p) for p in created]}


@router.post("/products/scan")
async def scan_receipt(business_id: str, file: UploadFile = File(...), auth=Depends(require_owner_auth)):
    """OCR a bill/receipt photo → product candidates for the owner to review (PRD F11).

    Returns {name, price, qty} rows; nothing is saved until the owner confirms via
    POST /products/bulk. No auto-commit so OCR mistakes never pollute the catalog.
    """
    import logging
    logger = logging.getLogger("munim.products")
    
    data = await file.read()
    if not data:
        raise HTTPException(400, "empty file")

    if not receipt.is_available():
        from ..config import settings
        if not settings.allow_mock_ai:
            raise HTTPException(503, "OCR engine unavailable")
        logger.warning("OCR engine not installed. Falling back to mock receipt extraction.")
        mock_items = [
            {"name": "Mens Denim Jacket Blue", "price": 1899.0, "qty": 5, "stock_qty": 5},
            {"name": "Premium Cotton Polo Shirt White", "price": 999.0, "qty": 10, "stock_qty": 10},
            {"name": "Slim Fit Cargo Pants Olive", "price": 1499.0, "qty": 8, "stock_qty": 8},
            {"name": "Sport Running Socks Pack", "price": 349.0, "qty": 15, "stock_qty": 15},
        ]
        return {"count": len(mock_items), "products": mock_items}
        
    items = receipt.extract_products(data)
    return {"count": len(items), "products": items}


@router.patch("/products/{product_id}")
def update_product(product_id: str, body: ProductIn, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(404, "product not found")
    product.name, product.brand, product.category = body.name, body.brand, body.category
    product.attributes, product.price, product.stock_qty = body.attributes, body.price, body.stock_qty
    product.image_url = body.image_url
    product.text_embedding = embeddings.embed_text(
        embeddings.product_text(body.name, body.brand, body.attributes))
    db.commit()
    db.refresh(product)
    return _serialize(product)


@router.delete("/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(404, "product not found")
    product.is_active = False  # soft delete
    db.commit()
    return {"status": "deleted"}


@router.post("/search/semantic")
def semantic(body: SemanticSearchRequest, db: Session = Depends(get_db), auth=Depends(require_owner_auth)):
    return {"matches": search.semantic_search(db, body.business_id, body.query, limit=5)}
