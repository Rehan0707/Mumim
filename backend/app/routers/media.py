"""Media endpoints (TRD T3: /media/transcribe, /media/vision-search).

Mock mode: voice transcription and visual search are stubbed against the same
downstream services. A `text=` / `q=` hint in the URL simulates the model output
(IndicWhisper transcript / FashionCLIP-matched query), so the full pipeline is
exercisable with zero model weights. Swap the stubs for real inference later —
the request/response contracts stay identical.
"""
from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import TranscribeRequest, VisionSearchRequest
from ..services import nlu as nlu_svc
from ..services import search as search_svc
from ..services import vision as vision_svc

router = APIRouter(prefix="/media", tags=["media"])


def _hint_from_url(url: str) -> str:
    """Pull a `text=`/`q=` hint from a mock media URL (simulator convenience)."""
    try:
        qs = parse_qs(urlparse(url).query)
    except Exception:
        return ""
    for key in ("text", "q", "caption"):
        if key in qs and qs[key]:
            return qs[key][0]
    return ""


@router.post("/transcribe", summary="Voice note → text (mock IndicWhisper)")
def transcribe(body: TranscribeRequest):
    text = _hint_from_url(body.audio_url) or "don kilo tandul ani ek maggi"
    lang = body.lang or nlu_svc.detect_lang(text)
    return {"text": text, "lang": lang, "engine": "mock-indicwhisper"}


@router.post("/vision-search", summary="Screenshot → closest catalog matches (FashionCLIP)")
def vision_search(body: VisionSearchRequest, db: Session = Depends(get_db)):
    # Real FashionCLIP image search when the model + catalog embeddings are present…
    real = vision_svc.search_by_image_url(db, body.business_id, body.image_url, limit=body.limit)
    if real is not None:
        return {"engine": "fashionclip", "matches": real}
    # …otherwise fall back to the text-hint stub (a `q=`/`text=` hint in the URL).
    query = _hint_from_url(body.image_url) or "shirt"
    entities = nlu_svc.extract_entities(query)
    matches = search_svc.semantic_search(db, body.business_id, query, entities, limit=body.limit)
    return {"query": query, "engine": "text-hint-fallback", "matches": matches}
