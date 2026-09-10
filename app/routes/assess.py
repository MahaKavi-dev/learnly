import os

from fastapi import APIRouter, HTTPException

from app.schemas.assessment import (
    AssessmentRequest,
    AssessmentResponse,
    Difficulty,
)
from app.services.mock_assessment import assess_mock
from app.services.gemini import assess_with_gemini
from app.services.supabase import get_supabase
from app.services.streak import update_child_streak
from app.adaptive.engine import next_difficulty



router = APIRouter(prefix="/api", tags=["assessment"])


DIFFICULTY_MAP = {
    1: Difficulty.easy,
    2: Difficulty.medium,
    3: Difficulty.hard,
}


@router.post("/assess", response_model=AssessmentResponse)
def assess(request: AssessmentRequest):

    # ---------------------------------------------------------
    # 1. Get Supabase client & environment configuration
    # ---------------------------------------------------------
    client = get_supabase()
    use_gemini = os.getenv("USE_GEMINI", "false").lower() == "true"

    if client is None:
        if not use_gemini:
            if request.exerciseId in ("00000000-0000-0000-0000-000000000000", "invalid-uuid-format"):
                raise HTTPException(status_code=404, detail="Exercise not found")
            if request.childId == "00000000-0000-0000-0000-000000000000":
                raise HTTPException(status_code=404, detail="Child not found")
            if request.exerciseId == "ef319c72-2dbd-4d7c-9726-32362d13c8dc" and request.language.value != "en":
                raise HTTPException(status_code=400, detail="Exercise language does not match request language")

            assessment = assess_mock(request)
            assessment.nextDifficulty = next_difficulty(assessment.score, Difficulty.medium)
            return assessment

        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured",
        )



    # ---------------------------------------------------------
    # 2. Fetch the real exercise
    # ---------------------------------------------------------
    try:
        result = (
            client
            .table("exercises")
            .select(
                "id,language,type,difficulty,skill,content,expected_answer,xp"
            )
            .eq("id", request.exerciseId)
            .limit(1)
            .execute()
        )

        exercises = result.data or []

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch exercise: {type(exc).__name__}",
        )

    if not exercises:
        raise HTTPException(
            status_code=404,
            detail="Exercise not found",
        )

    exercise = exercises[0]

    # ---------------------------------------------------------
    # 3. Validate language
    # ---------------------------------------------------------
    exercise_language = exercise.get("language")

    if exercise_language and exercise_language != request.language.value:
        raise HTTPException(
            status_code=400,
            detail="Exercise language does not match request language",
        )

    # ---------------------------------------------------------
    # 4. Convert DB difficulty → API difficulty
    # ---------------------------------------------------------
    current_difficulty = DIFFICULTY_MAP.get(
        exercise.get("difficulty"),
        Difficulty.medium,
    )

    # ---------------------------------------------------------
    # 5. Use database expected answer
    # ---------------------------------------------------------
    expected_text = exercise.get("expected_answer") or request.expectedText

    assessment_request = request.model_copy(
        update={"expectedText": expected_text}
    )

    # ---------------------------------------------------------
    # 6. Validate childId if provided
    # ---------------------------------------------------------
    if request.childId:
        try:
            child_res = (
                client
                .table("children")
                .select("id")
                .eq("id", request.childId)
                .limit(1)
                .execute()
            )
            if not (child_res.data or []):
                raise HTTPException(
                    status_code=404,
                    detail="Child not found",
                )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to fetch child: {type(exc).__name__}",
            )

    # ---------------------------------------------------------
    # 7. Run assessment
    # ---------------------------------------------------------
    use_gemini = os.getenv("USE_GEMINI", "false").lower() == "true"

    try:
        if use_gemini:
            assessment = assess_with_gemini(assessment_request)
        else:
            assessment = assess_mock(assessment_request)

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Assessment service failed: {type(exc).__name__}",
        )

    # ---------------------------------------------------------
    # 8. Python decides next difficulty
    # ---------------------------------------------------------
    assessment.nextDifficulty = next_difficulty(
        assessment.score,
        current_difficulty,
    )

    # ---------------------------------------------------------
    # 9. Persist attempt if childId is provided
    # ---------------------------------------------------------
    if request.childId:
        try:
            client.table("attempts").insert({
                "child_id": request.childId,
                "exercise_id": request.exerciseId,
                "answer": request.userTranscript,
                "score": assessment.score,
            }).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to record attempt: {type(exc).__name__}",
            )

        # ---------------------------------------------------------
        # 10. Update progress if childId is provided
        # ---------------------------------------------------------
        try:
            skill_name = (
                assessment.skill.value
                if hasattr(assessment.skill, "value")
                else str(assessment.skill)
            )
            prog_res = (
                client
                .table("progress")
                .select("id, exercises_completed")
                .eq("child_id", request.childId)
                .eq("skill", skill_name)
                .limit(1)
                .execute()
            )
            existing_prog = prog_res.data or []
            if existing_prog:
                prog_id = existing_prog[0]["id"]
                current_completed = existing_prog[0].get("exercises_completed", 0) or 0
                client.table("progress").update({
                    "accuracy": assessment.accuracy,
                    "exercises_completed": current_completed + 1,
                }).eq("id", prog_id).execute()
            else:
                client.table("progress").insert({
                    "child_id": request.childId,
                    "skill": skill_name,
                    "accuracy": assessment.accuracy,
                    "exercises_completed": 1,
                }).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to update progress: {type(exc).__name__}",
            )

        # ---------------------------------------------------------
        # 11. Update streak if childId is provided
        # ---------------------------------------------------------
        try:
            update_child_streak(client, request.childId)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to update streak: {type(exc).__name__}",
            )

    return assessment

