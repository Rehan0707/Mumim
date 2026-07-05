# ml/ — AI/ML models  ·  Owner: Role 2 (AI/ML Engineer)

Real Indic + fashion models live here. The backend runs rule-based / lightweight
stand-ins today; each model below drops in behind the **same backend seam** with
no API changes (see [../TEAM.md](../TEAM.md)).

## Folders

| Folder | Model | Replaces (backend seam) |
| --- | --- | --- |
| `nlu/` | IndicBERT — intent + NER | `backend/app/services/nlu.py::parse()` |
| `embeddings/` | sentence-transformers (multilingual) | `backend/app/embeddings.py::embed_text()` |
| `vision/` | FashionCLIP + garment crop ("Dikhao") | `backend/app/routers/media.py` vision-search |
| `speech/` | IndicWhisper STT | `backend/app/routers/media.py` transcribe |
| `translation/` | IndicTrans2 | `backend/app/services/reply.py` |
| `forecast/` | LightGBM demand forecast | `backend/app/routers/analytics.py` forecast |
| `notebooks/` | experiments & training runs | — |
| `data/` | labelled utterances, training/eval data | — |
| `weights/` | downloaded model weights (**git-ignored**) | — |

## Ground rules

- **Weights are never committed.** Put a `download_weights.sh` in each model folder
  and keep the actual files under `ml/weights/` (git-ignored).
- **Keep a rule-based fallback** behind every model (TRD reliability requirement).
- Expose a plain function (e.g. `predict(text) -> {...}`) so the backend can import
  or call it over a thin internal service without knowing the model internals.

## Suggested env

```bash
cd ml
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt   # add per-model deps here
```
