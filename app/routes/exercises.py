from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from app.services.supabase import get_supabase

router = APIRouter(prefix="/api", tags=["exercises"])

DIFFICULTY_STR_TO_INT = {
    "easy": 1,
    "medium": 2,
    "hard": 3,
    "1": 1,
    "2": 2,
    "3": 3,
}

DIFFICULTY_INT_TO_STR = {
    1: "easy",
    2: "medium",
    3: "hard",
}

# Fallback mock exercises for offline/development mode when Supabase is unconfigured
MOCK_EXERCISES = [
    {
        "id": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
        "language": "en",
        "type": "reading",
        "difficulty": 1,
        "skill": "reading_accuracy",
        "content": "The sun is bright.",
        "expected_answer": "The sun is bright.",
        "xp": 10,
    },
    {
        "id": "ef7a0fdb-89e7-4c18-9c9d-98d842dae2d3",
        "language": "en",
        "type": "writing",
        "difficulty": 2,
        "skill": "spelling",
        "content": "S_HOOL",
        "expected_answer": "SCHOOL",
        "xp": 20,
    },
    {
        "id": "ta-read-1",
        "language": "ta",
        "type": "reading",
        "difficulty": 1,
        "skill": "reading_accuracy",
        "content": "வணக்கம்!",
        "expected_answer": "வணக்கம்!",
        "xp": 10,
    },
    {
        "id": "ta-write-1",
        "language": "ta",
        "type": "writing",
        "difficulty": 2,
        "skill": "spelling",
        "content": "பூ_ன",
        "expected_answer": "பூனை",
        "xp": 20,
    },
]

@router.get("/exercises", response_model=List[Dict[str, Any]])
def get_exercises(
    language: Optional[str] = Query(None, description="Filter by language code (en or ta)"),
    type: Optional[str] = Query(None, description="Filter by exercise type (reading or writing)"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (easy/medium/hard or 1/2/3)"),
    skill: Optional[str] = Query(None, description="Filter by skill name"),
):
    client = get_supabase()

    # Normalize difficulty filter
    target_diff_int: Optional[int] = None
    if difficulty:
        diff_lower = str(difficulty).lower().strip()
        target_diff_int = DIFFICULTY_STR_TO_INT.get(diff_lower)

    # Normalize language filter (e.g. en-IN -> en, ta-IN -> ta)
    target_lang: Optional[str] = None
    if language:
        lang_str = str(language).lower().strip()
        target_lang = "ta" if "ta" in lang_str else "en" if "en" in lang_str else lang_str

    if client is not None:
        try:
            query = client.table("exercises").select("*")
            if target_lang:
                query = query.eq("language", target_lang)
            if type:
                query = query.eq("type", type)
            if target_diff_int is not None:
                query = query.eq("difficulty", target_diff_int)
            if skill:
                query = query.eq("skill", skill)

            res = query.execute()
            if res.data:
                return res.data
        except Exception:
            pass  # Fallback to local mock data if Supabase query fails

    # Offline / Mock Fallback Filtering
    filtered = MOCK_EXERCISES
    if target_lang:
        filtered = [e for e in filtered if e.get("language") == target_lang]
    if type:
        filtered = [e for e in filtered if e.get("type") == type]
    if target_diff_int is not None:
        filtered = [e for e in filtered if e.get("difficulty") == target_diff_int]
    if skill:
        filtered = [e for e in filtered if e.get("skill") == skill]

    return filtered
