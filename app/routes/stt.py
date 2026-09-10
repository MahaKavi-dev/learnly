import logging
import traceback
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.schemas.stt import STTResponse
from app.services.speech_to_text import transcribe_audio

logger = logging.getLogger("learnly.stt")

router = APIRouter(prefix="/api", tags=["stt"])

@router.post("/stt", response_model=STTResponse)
async def stt(
    file: UploadFile = File(...),
    language: str = Form(...),
):
    if not file:
        raise HTTPException(status_code=400, detail="File is empty or missing.")

    try:
        content = await file.read()
    except Exception as err:
        logger.error(f"Failed to read uploaded audio file: {err}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="Failed to read uploaded file.")

    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty or missing.")

    try:
        transcript = transcribe_audio(
            file_bytes=content,
            filename=file.filename or "recording.m4a",
            language=language,
        )
        return STTResponse(transcript=transcript)
    except ValueError as err:
        logger.warning(f"STT Validation error: {err}")
        raise HTTPException(status_code=400, detail=str(err))
    except PermissionError as err:
        logger.error(f"STT Auth/Permission error: {err}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(err))
    except RuntimeError as err:
        logger.error(f"STT Runtime error: {err}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(err))
    except Exception as err:
        logger.error(f"STT Exception [{type(err).__name__}]: {err}")
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"Speech-to-Text service failed: {type(err).__name__}")
