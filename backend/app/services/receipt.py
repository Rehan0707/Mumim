"""Receipt / bill scanning → product extraction (PRD F11: catalog onboarding by photo).

A shopkeeper photographs a supplier bill or receipt; we OCR it (easyocr, offline,
torch-backed) and parse the line items into {name, price, qty} candidates that the
owner reviews before adding to inventory.

easyocr is lazy-loaded so the backend stays importable without it; if it's missing,
extract_products() returns [] and the API surfaces a clear "OCR unavailable" message.
"""
from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import List, Optional

log = logging.getLogger("munim.receipt")

# lines that are clearly not products
_SKIP = re.compile(
    r"\b(total|subtotal|sub-total|tax|gst|cgst|sgst|igst|vat|cash|change|balance|"
    r"invoice|bill|receipt|date|time|qty|rate|amount|item|description|thank|welcome|"
    r"gstin|phone|mob|tel|address|discount|round|net|payable|due|no\.?)\b",
    re.I,
)
_PRICE = re.compile(r"(?:₹|rs\.?|inr)?\s*(\d{1,6}(?:[.,]\d{1,2})?)", re.I)
_QTY = re.compile(r"^\s*(\d{1,3})\s*(?:x|×|\*|@|nos?|pcs?)\b", re.I)


def is_available() -> bool:
    try:
        import easyocr  # noqa: F401

        return True
    except Exception:
        return False


@lru_cache(maxsize=1)
def _get_reader():
    import easyocr

    log.info("loading easyocr reader (first run downloads models) …")
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    log.info("easyocr ready")
    return reader


def _group_rows(results) -> List[List]:
    """Group OCR tokens into visual rows by their vertical center."""
    toks = []
    for bbox, text, conf in results:
        ys = [pt[1] for pt in bbox]
        xs = [pt[0] for pt in bbox]
        toks.append({"y": sum(ys) / 4, "x": min(xs), "h": max(ys) - min(ys), "text": text, "conf": conf})
    if not toks:
        return []
    toks.sort(key=lambda t: t["y"])
    median_h = sorted(t["h"] for t in toks)[len(toks) // 2] or 10
    rows, cur, cur_y = [], [], None
    for t in toks:
        if cur_y is None or abs(t["y"] - cur_y) <= median_h * 0.7:
            cur.append(t)
            cur_y = t["y"] if cur_y is None else (cur_y + t["y"]) / 2
        else:
            rows.append(sorted(cur, key=lambda z: z["x"]))
            cur, cur_y = [t], t["y"]
    if cur:
        rows.append(sorted(cur, key=lambda z: z["x"]))
    return rows


def _parse_line(text: str) -> Optional[dict]:
    raw = text.strip()
    if len(raw) < 3 or _SKIP.search(raw):
        return None

    qty = 1
    qm = _QTY.search(raw)
    if qm:
        qty = int(qm.group(1))
        raw = raw[qm.end():].strip()

    prices = _PRICE.findall(raw)
    if not prices:
        return None
    price = float(prices[-1].replace(",", "."))  # rightmost number = line price
    if price <= 0 or price > 100000:
        return None

    # name = text with currency + the price number stripped, but units kept
    # (a digit followed by a letter, e.g. 1kg / 100g, is a unit — keep it).
    name = re.sub(r"(?:₹|rs\.?|inr)", " ", raw, flags=re.I)
    name = re.sub(r"\d+(?:[.,]\d+)?(?![A-Za-z])", " ", name)  # strip prices, keep 1kg/100g
    name = re.sub(r"[^A-Za-z0-9&'./ -]", " ", name)
    name = " ".join(name.split()).title()
    if len(re.sub(r"[^A-Za-z]", "", name)) < 2:  # need at least some letters
        return None

    return {"name": name, "price": round(price, 2), "qty": qty, "stock_qty": qty}


def extract_products(image_bytes: bytes) -> List[dict]:
    """OCR an image and return product candidates. [] if OCR unavailable."""
    if not is_available():
        return []
    import numpy as np
    from PIL import Image
    import io

    reader = _get_reader()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    results = reader.readtext(np.array(img))
    products = []
    for row in _group_rows(results):
        parsed = _parse_line(" ".join(t["text"] for t in row))
        if parsed:
            products.append(parsed)
    log.info("receipt scan: extracted %d product candidates", len(products))
    return products
