"""Seed demo data (spec S4): 1 shop, ~25 products, customers, past orders, messages.

Run:  python -m app.seed      (from the backend/ directory, venv active)

Idempotent: drops and recreates all tables, then loads a catalog whose photos are
Unsplash URLs and whose embeddings are computed on insert. Includes the hero items
referenced in the App Flow demo (Nike Air size 9, blue checked shirt, rice, Maggi).
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from . import embeddings
from .db import Base, SessionLocal, engine
from .models import Business, Customer, Message, Order, OrderItem, Product
from .services import crm

IMG = "https://images.unsplash.com/"

CATALOG = [
    # --- clothing (Priya's boutique / Ramesh's clothing) ---
    ("Nike Air Max Sneakers", "Nike", "footwear", {"size": "9", "color": "white"}, 2499, 4, "photo-1542291026-7eec264c27ff"),
    ("Nike Air Max Sneakers", "Nike", "footwear", {"size": "8", "color": "black"}, 2499, 6, "photo-1600185365483-26d7a4cc7519"),
    ("Adidas Running Shoes", "Adidas", "footwear", {"size": "9", "color": "blue"}, 1999, 5, "photo-1595950653106-6c9ebd614d3a"),
    ("Blue Checked Full-Sleeve Shirt", "Peter England", "shirts", {"size": "M", "color": "blue"}, 1299, 8, "photo-1596755094514-f87e34085b2c"),
    ("White Formal Shirt", "Van Heusen", "shirts", {"size": "L", "color": "white"}, 1499, 7, "photo-1602810318383-e386cc2a3ccf"),
    ("Black Slim-Fit Jeans", "Levis", "jeans", {"size": "32", "color": "black"}, 2199, 5, "photo-1542272604-787c3835535d"),
    ("Blue Denim Jeans", "Wrangler", "jeans", {"size": "34", "color": "blue"}, 1799, 6, "photo-1541099649105-f69ad21f3246"),
    ("Cotton Kurta", "Fabindia", "ethnic", {"size": "L", "color": "cream"}, 1599, 4, "photo-1610030469983-98e550d6193c"),
    ("Silk Saree", "Nalli", "ethnic", {"size": "free", "color": "red"}, 4999, 3, "photo-1618901185975-d59f7091bcfe"),
    ("Floral Anarkali Dress", "Biba", "ethnic", {"size": "M", "color": "pink"}, 2899, 2, "photo-1595777457583-95e059d581b8"),
    ("Grey Hoodie", "H&M", "casual", {"size": "L", "color": "grey"}, 1699, 9, "photo-1556821840-3a63f95609a7"),
    ("Round-Neck T-Shirt", "US Polo", "casual", {"size": "M", "color": "navy"}, 799, 12, "photo-1521572163474-6864f9cf17ab"),
    ("Leather Belt", "Hidesign", "accessories", {"size": "free", "color": "brown"}, 999, 10, "photo-1553062407-98eeb64c6a62"),
    ("Analog Wrist Watch", "Titan", "accessories", {"size": "free", "color": "silver"}, 3499, 3, "photo-1523275335684-37898b6baf30"),
    # --- kirana (Ramesh's kirana) ---
    ("Basmati Rice (Tandul) 1kg", "India Gate", "grocery", {"weight": "1kg"}, 89, 40, "photo-1586201375761-83865001e31c"),
    ("Maggi Noodles 70g", "Nestle", "grocery", {"pack": "single"}, 14, 60, "photo-1612929633738-8fe44f7ec841"),
    ("Aashirvaad Atta 5kg", "Aashirvaad", "grocery", {"weight": "5kg"}, 245, 20, "photo-1509440159596-0249088772ff"),
    ("Sunflower Oil 1L", "Fortune", "grocery", {"volume": "1L"}, 145, 25, "photo-1474979266404-7eaacbcd87c5"),
    ("Tata Salt 1kg", "Tata", "grocery", {"weight": "1kg"}, 28, 50, "photo-1518110925495-5fe2fda0442c"),
    ("Amul Butter 100g", "Amul", "dairy", {"weight": "100g"}, 52, 30, "photo-1589985270826-4b7bb135bc9d"),
    ("Red Label Tea 250g", "Brooke Bond", "grocery", {"weight": "250g"}, 135, 18, "photo-1544787219-7f47ccb76574"),
    ("Parle-G Biscuit", "Parle", "grocery", {"pack": "single"}, 10, 80, "photo-1558961363-fa8fdf82db35"),
    ("Toor Dal 1kg", "Tata Sampann", "grocery", {"weight": "1kg"}, 160, 15, "photo-1596797038530-2c107229654b"),
    ("Colgate Toothpaste 100g", "Colgate", "personal-care", {"weight": "100g"}, 55, 22, "photo-1607613009820-a29f7bb81c04"),
    ("Dettol Soap 125g", "Dettol", "personal-care", {"weight": "125g"}, 40, 35, "photo-1600857544200-b2f666a9a2ec"),
]

CUSTOMERS = [
    ("+919812345601", "Anjali Sharma"),
    ("+919812345602", "Rohit Verma"),
    ("+919812345603", "Meena Patil"),
    ("+919812345604", "Sanjay Gupta"),
]


def run() -> None:
    from .config import settings
    if not settings.DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text, inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if tables:
            with engine.begin() as conn:
                table_list = ", ".join(f'"{t}"' for t in tables)
                conn.execute(text(f"DROP TABLE IF EXISTS {table_list} CASCADE;"))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    else:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    random.seed(42)
    try:
        biz = Business(
            name="Ramesh Vastralaya & General Store", whatsapp_no="+919800000000",
            category="clothing", lang_default="hi", upi_id="ramesh@okhdfcbank",
        )
        db.add(biz)
        db.flush()

        products = []
        for name, brand, cat, attrs, price, stock, photo in CATALOG:
            text = embeddings.product_text(name, brand, attrs)
            p = Product(
                business_id=biz.id, name=name, brand=brand, category=cat, attributes=attrs,
                price=price, stock_qty=stock, image_url=f"{IMG}{photo}?w=400",
                text_embedding=embeddings.embed_text(text),
            )
            db.add(p)
            products.append(p)
        db.flush()

        customers = []
        for no, name in CUSTOMERS:
            c = crm.upsert_customer(db, biz.id, no, name)
            customers.append(c)
        db.flush()

        # past PAID orders across the last 10 days -> lively CRM + analytics
        now = datetime.now(timezone.utc)
        for i in range(14):
            cust = random.choice(customers)
            prod = random.choice(products)
            qty = random.randint(1, 3)
            when = now - timedelta(days=random.randint(1, 10), hours=random.randint(0, 20))
            order = Order(business_id=biz.id, customer_id=cust.id, status="paid",
                          total=float(prod.price) * qty, created_at=when, paid_at=when,
                          payment_ref=f"seed_{i}")
            db.add(order)
            db.flush()
            db.add(OrderItem(order_id=order.id, product_id=prod.id, qty=qty, unit_price=float(prod.price)))
            cust.total_spend = float(cust.total_spend or 0) + float(prod.price) * qty
            cust.order_count = (cust.order_count or 0) + 1
            if cust.last_order is None or when > cust.last_order:
                cust.last_order = when
            db.add(Message(business_id=biz.id, customer_id=cust.id, direction="in",
                           input_type="text", text=f"{prod.name} chahiye", intent="ORDER",
                           lang="hi", created_at=when))

        for cust in customers:
            crm.recompute_segment(cust)

        db.commit()
        print(f"✅ Seeded business_id = {biz.id}")
        print(f"   {len(products)} products, {len(customers)} customers, 14 past orders")
        print(f"   Demo WhatsApp shop no: {biz.whatsapp_no}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
