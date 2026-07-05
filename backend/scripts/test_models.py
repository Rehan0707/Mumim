import os
from transformers import AutoTokenizer, AutoModel

# Apne local folders ka rasta (jahan models download hue hain)
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "..", "weights")
INDIC_DIR = os.path.join(WEIGHTS_DIR, "indic-bert")
CLIP_DIR = os.path.join(WEIGHTS_DIR, "fashion-clip")

def test_offline_models():
    print("🚀 Starting offline model test...\n")

    # --- 1. Test IndicBERT ---
    print("🤖 Loading IndicBERT from local cache...")
    tokenizer_bert = AutoTokenizer.from_pretrained(INDIC_DIR)
    model_bert = AutoModel.from_pretrained(INDIC_DIR)

    # Ek dummy Hindi/Hinglish sentence test karte hain
    text = "mujhe laal rang ki shirt chahiye"
    inputs_bert = tokenizer_bert(text, return_tensors="pt")
    outputs_bert = model_bert(**inputs_bert)
    
    print("✅ IndicBERT Success!")
    print(f"Generated Vector Shape (Embeddings): {outputs_bert.last_hidden_state.shape}\n")

    # --- 2. Test FashionCLIP ---
    print("👗 Loading FashionCLIP from local cache...")
    tokenizer_clip = AutoTokenizer.from_pretrained(CLIP_DIR)
    model_clip = AutoModel.from_pretrained(CLIP_DIR)

    # FashionCLIP ke liye basic English text tokenization check
    inputs_clip = tokenizer_clip("red shirt", return_tensors="pt")
    
    print("✅ FashionCLIP Success! Model and Tokenizer loaded properly.\n")
    print("🎉 BOOM! Tera offline AI engine 100% correctly kaam kar raha hai!")

if __name__ == "__main__":
    test_offline_models()