import os
import torch
import numpy as np
from typing import List
from transformers import AutoTokenizer, AutoModel

from .config import settings

# --- Load Offline Models (Global State so it loads only once on startup) ---
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "..", "weights")
INDIC_DIR = os.path.join(WEIGHTS_DIR, "indic-bert")

print("🤖 Loading offline IndicBERT engine...")
try:
    tokenizer_bert = AutoTokenizer.from_pretrained(INDIC_DIR)
    model_bert = AutoModel.from_pretrained(INDIC_DIR)
except Exception as e:
    print(f"⚠️ Error loading IndicBERT. Did you run download_models.py? Error: {e}")
    tokenizer_bert = None
    model_bert = None

def embed_text(text: str) -> List[float]:
    """Generate real dense vector using offline IndicBERT (768 dimensions)."""
    if not text or tokenizer_bert is None or model_bert is None:
        return np.zeros(settings.EMBEDDING_DIM, dtype=np.float32).tolist()

    # Convert text to tensor and run through the model
    inputs = tokenizer_bert(text, return_tensors="pt", truncation=True, max_length=512)
    
    with torch.no_grad():
        outputs = model_bert(**inputs)
        
    # Mean pooling: Average all token vectors to get one sentence vector
    # Shape goes from [1, seq_len, 768] -> [768]
    vec = outputs.last_hidden_state.mean(dim=1).squeeze().numpy()

    # Normalize the vector (required for accurate cosine similarity)
    norm = float(np.linalg.norm(vec))
    if norm > 0:
        vec /= norm
        
    return vec.tolist()


def cosine(a: List[float], b: List[float]) -> float:
    """Keep teammate's existing cosine logic."""
    if not a or not b:
        return 0.0
    va, vb = np.asarray(a, dtype=np.float32), np.asarray(b, dtype=np.float32)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


def product_text(name: str, brand: str = None, attributes: dict = None) -> str:
    """Keep teammate's existing product text builder."""
    parts = [name or "", brand or ""]
    if attributes:
        parts.extend(str(v) for v in attributes.values())
    return " ".join(p for p in parts if p)