import torch
from transformers import pipeline
import httpx
import tempfile
import os
from ..config import settings  

print("🚀 Initializing AI Audio Transcriber (Whisper) in background...")
device = "cuda:0" if torch.cuda.is_available() else "cpu"
stt_pipeline = pipeline("automatic-speech-recognition", model="openai/whisper-small", device=device)

async def transcribe_audio_url(media_url: str) -> str:
    """WhatsApp se aayi audio URL ko download karke text mein convert karega."""
    
    auth_credentials = None
    if settings.WHATSAPP_MODE == "twilio":
        auth_credentials = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    # 👈 YAHAN CHANGE KIYA HAI: follow_redirects=True
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(media_url, auth=auth_credentials)
        if response.status_code != 200:
            print(f"❌ Audio Download Failed. Status Code: {response.status_code}")
            return "Error: Audio download fail ho gaya."

    with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as temp_audio:
        temp_audio.write(response.content)
        temp_audio_path = temp_audio.name

    try:
        print(f"🎙️ Transcribing downloaded audio: {temp_audio_path}")
        result = stt_pipeline(temp_audio_path, generate_kwargs={"language": "en", "task": "transcribe"})
        text_output = result["text"].strip()
        print(f"📝 Transcribed Text: {text_output}")
        return text_output
    finally:
        os.remove(temp_audio_path)