from difflib import SequenceMatcher
import re
from app.schemas.assessment import AssessmentRequest, AssessmentResponse, Skill

def extract_target_text(text: str) -> str:
    if not text:
        return ""
    patterns = [
        r"^(?:Find the letter|Read this word|Read this sentence|Read aloud|Read|Write the word for|Complete the word|Write the word|Write aloud)[:\s]+",
        r"^(?:எழுத்தைக் கண்டுபிடி|எழுத்தை கண்டுபிடி|சொல்லை படி|வாக்கியத்தை படி|சத்தமாக படி|சொல்லை எழுது|எழுத்தை எழுது)[:\s]+",
        r"^இந்த (?:சொல்லை|வாக்கியத்தை) படி[:\s]+",
        r"[\s\.:]+(?:என்ற எழுத்தைக் கண்டுபிடி|என்ற எழுத்தை கண்டுபிடி|எழுத்தைக் கண்டுபிடி|எழுத்தை கண்டுபிடி)[\s\.]*$",
        r"^(?:என்ற எழுத்தைக் கண்டுபிடி|என்ற எழுத்தை கண்டுபிடி)[\s\.:]+",
    ]
    cleaned = text.strip()
    for pat in patterns:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE).strip()
    return cleaned if cleaned else text.strip()

def normalize(text: str) -> str:
    text = extract_target_text(text)
    text = text.strip().lower()
    text = re.sub(r"[^\w\u0B80-\u0BFF\s]", "", text)
    return re.sub(r"\s+", " ", text).strip()

def assess_mock(req: AssessmentRequest) -> AssessmentResponse:
    expected = normalize(req.expectedText)
    actual = normalize(req.userTranscript)

    if not actual:
        return AssessmentResponse(
            score=0,
            accuracy=0,
            fluency=0,
            skill=Skill.reading_accuracy,
            needsPractice=True,
            feedback="Could not hear clearly. Please try speaking again!",
            nextDifficulty="easy",
        )

    if expected == actual:
        accuracy = 100
    else:
        exp_words = expected.split()
        act_words = actual.split()
        if not exp_words:
            accuracy = 0
        else:
            matches = sum(1 for w in act_words if w in exp_words)
            word_acc = (matches / max(len(exp_words), len(act_words))) * 100
            char_ratio = SequenceMatcher(None, expected, actual).ratio() * 100
            accuracy = round((word_acc * 0.7) + (char_ratio * 0.3))

    fluency = round(min(100, accuracy))
    score = accuracy

    needs_practice = score < 60
    feedback = "Let's practice once more." if needs_practice else "Great job! Keep going!"

    return AssessmentResponse(
        score=score,
        accuracy=accuracy,
        fluency=fluency,
        skill=Skill.reading_accuracy,
        needsPractice=needs_practice,
        feedback=feedback,
        nextDifficulty="medium",
    )
