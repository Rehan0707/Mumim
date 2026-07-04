# ml/embeddings — Text embeddings (sentence-transformers)  ·  Role 2

Replace the hashing bag-of-words embedder with a real multilingual model
(e.g. `paraphrase-multilingual-MiniLM-L12-v2`, 384-d to match the schema).

**Contract to match:**

```python
embed_text(text: str) -> list[float]   # 384-d, matches products.text_embedding
```

Backend seam: `backend/app/embeddings.py`. Nothing else changes — search is pure
cosine. Weights → `../weights/` (git-ignored).
