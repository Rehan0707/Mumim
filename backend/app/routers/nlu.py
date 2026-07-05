"""NLU endpoint (TRD T3: POST /nlu/parse).

Exposes the rule-based NLU service directly. Same contract IndicBERT will serve
later: {text, lang?} -> {intent, entities, lang, confidence}.
"""
from __future__ import annotations

from fastapi import APIRouter

from ..schemas import NLUParseRequest
from ..services import nlu as nlu_svc

router = APIRouter(prefix="/nlu", tags=["nlu"])


@router.post("/parse", summary="Classify intent + extract entities + detect language")
def parse(body: NLUParseRequest):
    result = nlu_svc.parse(body.text, body.lang)
    return {
        "intent": result.intent,
        "lang": result.lang,
        "confidence": result.confidence,
        "entities": result.entities,
    }
