#!/usr/bin/env bash
# Pre-download the FashionCLIP weights into the HuggingFace cache so the demo
# doesn't fetch ~600MB over venue wifi. Run once before the hackathon.
set -euo pipefail

python - <<'PY'
from transformers import CLIPModel, CLIPProcessor
name = "patrickjohncyh/fashion-clip"
print(f"downloading {name} …")
CLIPModel.from_pretrained(name)
CLIPProcessor.from_pretrained(name)
print("done — cached in ~/.cache/huggingface")
PY
