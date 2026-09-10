from enum import Enum
from pydantic import BaseModel, Field

class Language(str, Enum):
    en = "en"
    ta = "ta"

class Skill(str, Enum):
    reading_accuracy = "reading_accuracy"
    reading_fluency = "reading_fluency"
    spelling = "spelling"
    sentence_formation = "sentence_formation"
    vocabulary = "vocabulary"

class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class AssessmentRequest(BaseModel):
    exerciseId: str = Field(min_length=1)
    expectedText: str = Field(min_length=1)
    userTranscript: str = Field(min_length=1)
    language: Language

class AssessmentResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    accuracy: int = Field(ge=0, le=100)
    fluency: int = Field(ge=0, le=100)
    skill: Skill
    needsPractice: bool
    feedback: str = Field(min_length=1)
    nextDifficulty: Difficulty
