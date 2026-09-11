from typing import Optional
from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize to speech")
    languageCode: Optional[str] = Field(None, description="Language code, e.g. en-IN or ta-IN")
    language: Optional[str] = Field(None, description="Alternative language code field, e.g. en or ta")
    speaker: Optional[str] = Field("shubh", description="Voice speaker ID")
    pace: Optional[float] = Field(0.9, description="Speech pace multiplier")


class TTSResponse(BaseModel):
    audio: str = Field(..., description="Base64 encoded audio string")
    contentType: str = Field("audio/wav", description="MIME content type of the audio")
