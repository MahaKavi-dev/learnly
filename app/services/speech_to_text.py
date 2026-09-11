import logging
import os
import traceback
import unicodedata
from typing import Optional

import httpx

logger = logging.getLogger("learnly.stt")

SUPPORTED_LANGUAGES = {"en-IN", "ta-IN", "en", "ta"}


def _normalize_language(lang: str) -> str:
    if not lang or lang not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language '{lang}'. Must be 'en-IN' or 'ta-IN'.")
    if lang in ("en", "en-IN"):
        return "en-IN"
    if lang in ("ta", "ta-IN"):
        return "ta-IN"
    return "en-IN"


def normalize_transcript_text(text: str, language: str = "en") -> str:
    if not text:
        return ""
    # NFC normalization for Unicode characters (especially Tamil)
    norm = unicodedata.normalize("NFC", text)
    # Replace multiple whitespaces/newlines with single space
    norm = " ".join(norm.split()).strip()
    return norm


def transcribe_audio(file_bytes: bytes, filename: str, language: str) -> str:
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Audio file is empty or missing.")

    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        logger.error("SARVAM_API_KEY is not configured in backend environment.")
        raise RuntimeError("SARVAM_API_KEY is missing on the server.")

    lang_code = _normalize_language(language)
    ext = os.path.splitext(filename.lower())[1] if filename else ".m4a"

    mime_map = {
        ".wav": "audio/wav",
        ".mp3": "audio/mp3",
        ".m4a": "audio/x-m4a",
        ".mp4": "audio/mp4",
        ".aac": "audio/aac",
        ".3gp": "audio/3gpp",
        ".3gpp": "audio/3gpp",
        ".ogg": "audio/ogg",
    }
    mime_type = mime_map.get(ext, "audio/x-m4a")

    url = "https://api.sarvam.ai/speech-to-text"
    headers = {
        "api-subscription-key": api_key
    }
    files = {
        "file": (filename or "recording.m4a", file_bytes, mime_type)
    }
    data = {
        "model": "saaras:v4",
        "language_code": lang_code,
        "mode": "transcribe"
    }

    logger.info(f"STT Upload Received: filename='{filename}', bytes={len(file_bytes)}, lang_code='{lang_code}', mime='{mime_type}'")

    try:
        with httpx.Client(timeout=60.0) as client:
            res = client.post(url, headers=headers, data=data, files=files)

        if res.status_code == 200:
            res_json = res.json()
            raw_transcript = res_json.get("transcript", "")
            transcript = normalize_transcript_text(raw_transcript, "ta" if lang_code == "ta-IN" else "en")
            logger.info(f"Sarvam AI STT Success ({lang_code}): '{transcript}'")
            return transcript
        elif res.status_code == 400:
            logger.warning(f"Sarvam AI STT HTTP 400 Bad Request: {res.text}")
            raise ValueError(f"Sarvam STT Bad Request: {res.text}")
        elif res.status_code in (401, 403):
            logger.error("Sarvam AI STT Authentication failed (401/403).")
            raise RuntimeError("Sarvam STT Authentication failed. Check SARVAM_API_KEY configuration.")
        elif res.status_code == 429:
            logger.error("Sarvam AI STT Rate limit exceeded (429).")
            raise RuntimeError("Sarvam STT rate limit exceeded. Please try again in a moment.")
        else:
            logger.error(f"Sarvam AI STT Error (HTTP {res.status_code}): {res.text}")
            raise RuntimeError(f"Sarvam STT service error (HTTP {res.status_code}).")

    except httpx.TimeoutException:
        logger.error("Sarvam STT request timed out after 60s.")
        raise RuntimeError("Sarvam STT request timed out (60s).")
    except (ValueError, RuntimeError):
        raise
    except Exception as err:
        logger.error(f"Sarvam STT request exception: {err}")
        traceback.print_exc()
        raise RuntimeError(f"Sarvam STT failed: {err}")
