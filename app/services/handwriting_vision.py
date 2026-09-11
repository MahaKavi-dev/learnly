import logging
import os
import time
import traceback
import unicodedata
from typing import Dict, Any, Tuple

import httpx

logger = logging.getLogger("learnly.handwriting")

SUPPORTED_HANDWRITING_LANGUAGES = {"en-IN", "ta-IN", "en", "ta"}


def _normalize_language_code(lang: str) -> str:
    if not lang or lang not in SUPPORTED_HANDWRITING_LANGUAGES:
        raise ValueError(f"Unsupported language '{lang}'. Must be 'en-IN' or 'ta-IN'.")
    if lang in ("en", "en-IN"):
        return "en-IN"
    if lang in ("ta", "ta-IN"):
        return "ta-IN"
    return "en-IN"


def normalize_text_for_comparison(text: str, lang_code: str) -> str:
    if not text:
        return ""
    norm = unicodedata.normalize("NFC", text)
    norm = " ".join(norm.split()).strip()
    if lang_code in ("en", "en-IN"):
        norm = norm.upper()
    return norm


def recognize_handwriting(
    file_bytes: bytes,
    filename: str,
    language_code: str,
    target_text: str,
) -> Dict[str, Any]:
    """
    Submits a handwritten image to Sarvam Document AI API (sarvam-vision)
    and extracts recognized text for comparison against target_text.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Image file content is empty or missing.")

    if not target_text or not target_text.strip():
        raise ValueError("Target text cannot be empty.")

    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        logger.error("SARVAM_API_KEY is not configured in backend environment.")
        raise RuntimeError("SARVAM_API_KEY is missing on the server.")

    clean_lang = _normalize_language_code(language_code)
    clean_target = target_text.strip()

    url_start = "https://api.sarvam.ai/doc-ai/v1/job/digitise"
    headers = {"api-subscription-key": api_key}
    files = {"file": (filename or "handwriting.png", file_bytes, "image/png")}
    data = {"language": clean_lang}

    t0 = time.time()
    logger.info(f"Submitting handwriting image to Sarvam Vision ({clean_lang}, target='{clean_target}')...")

    try:
        with httpx.Client(timeout=20.0) as client:
            res_start = client.post(url_start, headers=headers, data=data, files=files)

            if res_start.status_code not in (200, 201):
                logger.error(f"Sarvam Vision start job failed (HTTP {res_start.status_code}): {res_start.text}")
                raise RuntimeError(f"Sarvam Vision API error (HTTP {res_start.status_code}).")

            start_data = res_start.json()
            job_id = start_data.get("job_id")
            if not job_id:
                raise RuntimeError("Sarvam Vision API did not return a valid job_id.")

            status_url = f"https://api.sarvam.ai/doc-ai/v1/job/{job_id}/status"
            results_url = f"https://api.sarvam.ai/doc-ai/v1/job/{job_id}/results"

            completed = False
            for _ in range(25):
                time.sleep(0.4)
                res_st = client.get(status_url, headers=headers)
                if res_st.status_code == 200:
                    st = res_st.json().get("status", "").lower()
                    if st in ("completed", "success"):
                        completed = True
                        break

            if not completed:
                logger.error(f"Sarvam Vision job {job_id} did not complete within timeout.")
                raise RuntimeError("Sarvam Vision job processing timed out.")

            res_results = client.get(results_url, headers=headers)
            t1 = time.time()
            latency = round(t1 - t0, 2)

            if res_results.status_code != 200:
                logger.error(f"Sarvam Vision results call failed (HTTP {res_results.status_code}): {res_results.text}")
                raise RuntimeError(f"Sarvam Vision results fetch failed (HTTP {res_results.status_code}).")

            res_json = res_results.json()
            extracted_blocks = []

            for doc in res_json.get("documents", []):
                for page in doc.get("pages", []):
                    for block in page.get("blocks", []):
                        t = block.get("text", "").strip()
                        if t:
                            extracted_blocks.append(t)

            recognized_text = " ".join(extracted_blocks).strip()

            norm_target = normalize_text_for_comparison(clean_target, clean_lang)
            norm_recognized = normalize_text_for_comparison(recognized_text, clean_lang)
            is_match = (norm_target == norm_recognized)

            logger.info(f"Sarvam Vision OCR result ({clean_lang}): target='{clean_target}', recognized='{recognized_text}', match={is_match}, latency={latency}s")

            return {
                "targetText": clean_target,
                "recognizedText": recognized_text,
                "languageCode": clean_lang,
                "match": is_match,
                "latencySeconds": latency,
            }

    except httpx.TimeoutException:
        logger.error("Sarvam Vision request timed out.")
        raise RuntimeError("Sarvam Vision request timed out.")
    except (ValueError, RuntimeError):
        raise
    except Exception as err:
        logger.error(f"Sarvam Vision exception: {err}")
        traceback.print_exc()
        raise RuntimeError(f"Sarvam Vision handwriting processing failed: {err}")
