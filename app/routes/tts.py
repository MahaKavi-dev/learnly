import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.tts import TTSRequest, TTSResponse
from app.services.text_to_speech import synthesize_speech

logger = logging.getLogger("learnly.routes.tts")
router = APIRouter()


@router.post("/api/tts", response_model=TTSResponse, status_code=status.HTTP_200_OK)
def text_to_speech_endpoint(request: TTSRequest):
    """
    Synthesize text into natural audio speech using Sarvam Bulbul v3.
    """
    raw_lang = request.languageCode or request.language or "en-IN"
    
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text field is required and cannot be empty."
        )

    try:
        audio_base64, content_type = synthesize_speech(
            text=request.text,
            language=raw_lang,
            speaker=request.speaker or "shubh",
            pace=request.pace or 0.9,
        )
        return TTSResponse(audio=audio_base64, contentType=content_type)

    except ValueError as val_err:
        logger.warning(f"TTS endpoint validation error: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except RuntimeError as run_err:
        logger.error(f"TTS endpoint runtime error: {run_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(run_err)
        )
    except Exception as err:
        logger.error(f"TTS endpoint unexpected error: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during speech synthesis."
        )
