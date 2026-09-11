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
    
    from app.services.mock_assessment import extract_target_text
    target_exp = extract_target_text(req.expectedText)
    target_act = extract_target_text(req.userTranscript)

    prompt = f"""
You are an educational response evaluator for Learnly, evaluating a primary school child's reading practice.
Do not diagnose dyslexia or make medical claims.
Language: {req.language.value}
Expected target text: "{target_exp}"
Student spoken transcript: "{target_act}" (Raw: "{req.userTranscript}")

Evaluation Guidelines:
1. Ignore minor punctuation, case, accents, or instruction words (e.g. "Find the letter", "Read this word", "சொல்லை படி").
2. If the student accurately spoke the target text/letter/words, return a high score (90-100), high accuracy (90-100), high fluency (90-100), set needsPractice=false, and give encouraging child-friendly feedback in {req.language.value}.
3. Only set needsPractice=true if the student severely misread or missed the core target text.
Return only the structured GeminiAssessment JSON object.
"""
    try:
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
    except Exception as exc:
        print(f"Gemini evaluation failed with model {model}: {exc}. Retrying with gemini-flash-latest...")
        try:
            response = client.models.generate_content(
                model="gemini-flash-latest",
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
        except Exception as exc2:
            print(f"Gemini fallback evaluation failed: {exc2}. Falling back to mock assessment.")
            from app.services.mock_assessment import assess_mock
            return assess_mock(req)
