import logging
import os
import traceback
from functools import lru_cache
from typing import Dict, Tuple

import httpx

logger = logging.getLogger("learnly.tts")

SUPPORTED_TTS_LANGUAGES = {"en-IN", "ta-IN", "en", "ta"}
MAX_TEXT_LENGTH = 500


def _normalize_tts_language(lang: str) -> str:
    if not lang or lang not in SUPPORTED_TTS_LANGUAGES:
        raise ValueError(f"Unsupported language '{lang}'. Must be 'en-IN' or 'ta-IN'.")
    if lang in ("en", "en-IN"):
        return "en-IN"
    if lang in ("ta", "ta-IN"):
        return "ta-IN"
    return "en-IN"


@lru_cache(maxsize=128)
def _synthesize_cached(text: str, lang_code: str, speaker: str, pace: float) -> Tuple[str, str]:
    """
    Internal cached helper to call Sarvam Bulbul v3 REST API.
    Returns (audio_base64, content_type).
    """
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        logger.error("SARVAM_API_KEY is not configured in backend environment.")
        raise RuntimeError("SARVAM_API_KEY is missing on the server.")

    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [text],
        "target_language_code": lang_code,
        "speaker": speaker or "shubh",
        "pace": pace or 0.9,
        "model": "bulbul:v3",
    }

    logger.info(f"Sarvam TTS Request: text='{text}', lang_code='{lang_code}', speaker='{speaker}', pace={pace}")

    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.post(url, headers=headers, json=payload)

        if res.status_code == 200:
            res_json = res.json()
            audios = res_json.get("audios", [])
            if not audios or not audios[0]:
                logger.error("Sarvam TTS returned 200 OK but empty audios list.")
                raise RuntimeError("Sarvam TTS returned empty audio data.")
            
            logger.info(f"Sarvam TTS Success ({lang_code}): base64 length={len(audios[0])}")
            return audios[0], "audio/wav"

        elif res.status_code == 400:
            logger.warning(f"Sarvam TTS HTTP 400 Bad Request: {res.text}")
            raise ValueError(f"Sarvam TTS Bad Request: {res.text}")
        elif res.status_code in (401, 403):
            logger.error("Sarvam TTS Authentication failed (401/403).")
            raise RuntimeError("Sarvam TTS Authentication failed. Check SARVAM_API_KEY configuration.")
        elif res.status_code == 429:
            logger.error("Sarvam TTS Rate limit exceeded (429).")
            raise RuntimeError("Sarvam TTS rate limit exceeded. Please try again in a moment.")
        else:
            logger.error(f"Sarvam TTS Error (HTTP {res.status_code}): {res.text}")
            raise RuntimeError(f"Sarvam TTS service error (HTTP {res.status_code}).")

    except httpx.TimeoutException:
        logger.error("Sarvam TTS request timed out after 15s.")
        raise RuntimeError("Sarvam TTS request timed out.")
    except (ValueError, RuntimeError):
        raise
    except Exception as err:
        logger.error(f"Sarvam TTS request exception: {err}")
        traceback.print_exc()
        raise RuntimeError(f"Sarvam TTS failed: {err}")


def synthesize_speech(text: str, language: str, speaker: str = "shubh", pace: float = 0.9) -> Tuple[str, str]:
    """
    Main service function for Text-to-Speech synthesis using Sarvam Bulbul v3.
    """
    if not text or not text.strip():
        raise ValueError("Text to synthesize cannot be empty.")
    
    clean_text = text.strip()
    if len(clean_text) > MAX_TEXT_LENGTH:
        raise ValueError(f"Text length exceeds maximum allowed limit of {MAX_TEXT_LENGTH} characters.")

    lang_code = _normalize_tts_language(language)
    return _synthesize_cached(clean_text, lang_code, speaker, pace)
