from difflib import SequenceMatcher
import re
from app.schemas.assessment import AssessmentRequest, AssessmentResponse, Skill

def normalize(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^\w\u0B80-\u0BFF\s]", "", text)
    return re.sub(r"\s+", " ", text)

def assess_mock(req: AssessmentRequest) -> AssessmentResponse:
    expected = normalize(req.expectedText)
    actual = normalize(req.userTranscript)
    ratio = SequenceMatcher(None, expected, actual).ratio()
    accuracy = round(ratio * 100)
    expected_words = expected.split()
    actual_words = actual.split()
    fluency = round(min(1, len(actual_words) / max(1, len(expected_words))) * accuracy)
    score = round((accuracy * 0.7) + (fluency * 0.3))
    return AssessmentResponse(
        score=score,
        accuracy=accuracy,
        fluency=fluency,
        skill=Skill.reading_accuracy,
        needsPractice=score < 60,
        feedback="Let's practice once more." if score < 60 else "Great job! Keep going!",
        nextDifficulty="medium",
    )
