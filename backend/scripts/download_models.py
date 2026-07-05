import os
from transformers import AutoTokenizer, AutoModel

# Local folder path jahan models save honge
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "..", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

def download_and_cache():
    # 1. IndicBERT Setup (For Intent Classification)
    print("🤖 Downloading IndicBERT model...")
    indicbert_name = "ai4bharat/indic-bert"
    indicbert_dir = os.path.join(WEIGHTS_DIR, "indic-bert")
    
    tokenizer_bert = AutoTokenizer.from_pretrained(indicbert_name)
    model_bert = AutoModel.from_pretrained(indicbert_name)
    
    tokenizer_bert.save_pretrained(indicbert_dir)
    model_bert.save_pretrained(indicbert_dir)
    print(f"✅ IndicBERT saved locally at: {indicbert_dir}")

    # 2. FashionCLIP Setup (For Visual Search)
    print("\n👗 Downloading FashionCLIP architecture components...")
    fashion_name = "openai/clip-vit-base-patch32"
    fashion_dir = os.path.join(WEIGHTS_DIR, "fashion-clip")
    
    tokenizer_clip = AutoTokenizer.from_pretrained(fashion_name)
    model_clip = AutoModel.from_pretrained(fashion_name)
    
    tokenizer_clip.save_pretrained(fashion_dir)
    model_clip.save_pretrained(fashion_dir)
    print(f"✅ FashionCLIP components saved locally at: {fashion_dir}")

if __name__ == "__main__":
    print("🚀 Starting local model caching pipeline...")
    download_and_cache()
    print("\n🎉 All models cached successfully! Your machine is ready offline.")