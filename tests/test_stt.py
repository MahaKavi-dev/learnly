from fastapi.testclient import TestClient
from app.main import app
from app.services.speech_to_text import _normalize_language, transcribe_audio

client = TestClient(app)

def test_stt_unsupported_language():
    response = client.post(
        "/api/stt",
        data={"language": "fr-FR"},
        files={"file": ("test.wav", b"fake audio bytes", "audio/wav")}
    )
    assert response.status_code == 400
    assert "Unsupported language" in response.json()["detail"]

def test_stt_empty_file():
    response = client.post(
        "/api/stt",
        data={"language": "en-IN"},
        files={"file": ("test.wav", b"", "audio/wav")}
    )
    assert response.status_code == 400
    assert "empty or missing" in response.json()["detail"].lower()

def test_normalize_language():
    assert _normalize_language("en-IN") == "en"
    assert _normalize_language("ta-IN") == "ta"
    assert _normalize_language("en") == "en"
    assert _normalize_language("ta") == "ta"

def test_stt_response_shape(monkeypatch):
    def mock_transcribe_audio(file_bytes, filename, language):
        return "The sun is bright."

    monkeypatch.setattr("app.routes.stt.transcribe_audio", mock_transcribe_audio)

    response = client.post(
        "/api/stt",
        data={"language": "en-IN"},
        files={"file": ("test.wav", b"dummy audio content", "audio/wav")}
    )
    assert response.status_code == 200
    assert response.json() == {"transcript": "The sun is bright."}

def test_stt_no_speech_handling(monkeypatch):
    def mock_transcribe_audio(file_bytes, filename, language):
        return ""

    monkeypatch.setattr("app.routes.stt.transcribe_audio", mock_transcribe_audio)

    response = client.post(
        "/api/stt",
        data={"language": "ta-IN"},
        files={"file": ("silence.wav", b"silent audio content", "audio/wav")}
    )
    assert response.status_code == 200
    assert response.json() == {"transcript": ""}

def test_transcribe_audio_mocked_whisper(monkeypatch):
    class MockSegment:
        def __init__(self, text):
            self.text = text

    class MockModel:
        def transcribe(self, audio_path, language, beam_size=5):
            return [MockSegment("The sun is bright.")], None

    monkeypatch.setattr("app.services.speech_to_text._get_whisper_model", lambda: MockModel())

    res = transcribe_audio(b"RIFFdummyWAV", "test.wav", "en-IN")
    assert res == "The sun is bright."
