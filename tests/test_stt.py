from fastapi.testclient import TestClient
from app.main import app

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
