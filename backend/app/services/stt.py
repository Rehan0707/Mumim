import logging
import os
import tempfile
from urllib.parse import parse_qs, urlparse
import requests
from ..config import settings

log = logging.getLogger("munim.stt")

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

def transcribe(audio_url: str) -> str:
    """Transcribes an audio URL using Groq Whisper, falling back to mock hint logic if keys/deps are missing."""
    # First check for mock hint
    hint = _hint_from_url(audio_url)
    
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        log.info("GROQ_API_KEY not set, using mock fallback transcription.")
        return hint or "don kilo tandul ani ek maggi"
        
    try:
        from groq import Groq
        client = Groq(api_key=groq_api_key)
        
        # Download the audio file to a temporary file
        log.info("Downloading audio from %s", audio_url)
        
        # If it's a mock audio URL (e.g. doesn't start with http/https), just use fallback
        if not audio_url.startswith(("http://", "https://")):
            log.info("Not a remote URL, using mock fallback: %s", audio_url)
            return hint or "don kilo tandul ani ek maggi"
            
        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        
        # Guess extension or use .ogg/wav/mp3
        ext = ".ogg"
        if "audio/mpeg" in response.headers.get("Content-Type", ""):
            ext = ".mp3"
        elif "audio/wav" in response.headers.get("Content-Type", ""):
            ext = ".wav"
            
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name
            
        try:
            log.info("Sending to Groq Whisper for transcription...")
            with open(tmp_path, "rb") as file:
                transcription = client.audio.transcriptions.create(
                    file=(f"audio{ext}", file.read()),
                    model="whisper-large-v3",
                )
            log.info("Transcription success: %s", transcription.text)
            return transcription.text
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as exc:
        log.error("Groq Whisper transcription failed: %s. Falling back to mock.", exc)
        return hint or "don kilo tandul ani ek maggi"