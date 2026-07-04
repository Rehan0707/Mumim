# ml/speech — Voice → text (IndicWhisper)  ·  Role 2

Transcribe WhatsApp voice notes (Hindi/Marathi) to text, then feed the same NLU
pipeline. Whisper-small + Bhashini fallback is fine for the demo.

**Contract to match:**

```python
transcribe(audio_bytes_or_url) -> {"text": str, "lang": str}
```

Backend seam: `backend/app/routers/media.py` (`/media/transcribe`).
Demo voice notes: `../../data/voice-notes/`. Weights → `../weights/` (git-ignored).
