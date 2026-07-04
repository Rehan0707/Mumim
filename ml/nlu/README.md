# ml/nlu — Intent + NER (IndicBERT)  ·  Role 2

Fine-tune IndicBERT on the labelled-utterances sheet to classify intent
(`ORDER | QUERY | LAST_ORDER | COMPLAINT | GREETING | UNKNOWN`) and extract
entities (brand / product / size / qty).

**Contract to match** (so it drops into the backend unchanged):

```python
parse(text: str, lang: str | None = None) -> {
    "intent": str, "lang": str, "confidence": float, "entities": dict
}
```

Backend seam: `backend/app/services/nlu.py`. Training data: `../data/`.
Put weights in `../weights/` (git-ignored).
