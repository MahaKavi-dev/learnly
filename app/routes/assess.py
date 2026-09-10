import os
from fastapi import APIRouter, HTTPException
from app.schemas.assessment import AssessmentRequest, AssessmentResponse, Difficulty
from app.services.mock_assessment import assess_mock
from app.services.gemini import assess_with_gemini
from app.adaptive.engine import next_difficulty

router = APIRouter(prefix="/api", tags=["assessment"])

@router.post("/assess", response_model=AssessmentResponse)
def assess(request: AssessmentRequest):
    use_gemini = os.getenv("USE_GEMINI", "false").lower() == "true"
    try:
        assessment = assess_with_gemini(request) if use_gemini else assess_mock(request)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Assessment service failed: {type(exc).__name__}")

    # Python, not Gemini, decides progression.
    assessment.nextDifficulty = next_difficulty(
        assessment.score, Difficulty.medium
    )
    return assessment
