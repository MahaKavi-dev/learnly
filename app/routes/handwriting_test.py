import io
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from PIL import Image, ImageDraw

from app.services.handwriting_vision import recognize_handwriting

logger = logging.getLogger("learnly.routes.handwriting")
router = APIRouter()


@router.post("/api/handwriting-test", status_code=status.HTTP_200_OK)
async def handwriting_test_endpoint(
    image: Optional[UploadFile] = File(None),
    languageCode: Optional[str] = Form(None),
    targetText: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
):
    """
    Temporary test endpoint for Sarvam Vision handwriting feasibility evaluation.
    Converts image file -> Sarvam Document AI -> Recognized text & match comparison.
    """
    lang = languageCode or language or "en-IN"

    if not targetText or not targetText.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="targetText parameter is required and cannot be empty."
        )

    if not image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file is required."
        )

    try:
        file_bytes = await image.read()
        filename = image.filename or "handwriting.png"

        result = recognize_handwriting(
            file_bytes=file_bytes,
            filename=filename,
            language_code=lang,
            target_text=targetText,
        )
        return result

    except ValueError as val_err:
        logger.warning(f"Handwriting test endpoint validation error: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except RuntimeError as run_err:
        logger.error(f"Handwriting test endpoint runtime error: {run_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(run_err)
        )
    except Exception as err:
        logger.error(f"Handwriting test endpoint unexpected error: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during handwriting recognition."
        )
