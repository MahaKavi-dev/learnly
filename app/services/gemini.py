import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from app.schemas.assessment import AssessmentRequest, AssessmentResponse, Skill

class GeminiAssessment(BaseModel):
    score: int = Field(ge=0, le=100)
    accuracy: int = Field(ge=0, le=100)
    fluency: int = Field(ge=0, le=100)
    skill: Skill
    needsPractice: bool
    feedback: str

def assess_with_gemini(req: AssessmentRequest) -> AssessmentResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    client = genai.Client(api_key=api_key)
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    prompt = f"""
You are an educational response evaluator for Learnly.
Do not diagnose dyslexia or make medical claims.
Language: {req.language.value}
Exercise ID: {req.exerciseId}
Expected text: {req.expectedText}
Student transcript: {req.userTranscript}
Evaluate this reading response. Return only the structured fields.
Give child-friendly feedback in the student's language.
"""
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiAssessment,
        ),
    )
    parsed = response.parsed or GeminiAssessment.model_validate_json(response.text)
    return AssessmentResponse(
        score=parsed.score,
        accuracy=parsed.accuracy,
        fluency=parsed.fluency,
        skill=parsed.skill,
        needsPractice=parsed.needsPractice,
        feedback=parsed.feedback,
        nextDifficulty="medium",
    )
