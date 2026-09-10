from fastapi.testclient import TestClient
from app.main import app
from app.services.speech_to_text import _normalize_language, normalize_transcript_text, transcribe_audio

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

def test_normalize_transcript_text():
    assert normalize_transcript_text("  The   sun   is bright. \n ") == "The sun is bright."
    # Tamil Unicode NFC test
    tamil_text = "பூனை   ஓடுகிறது"
    assert normalize_transcript_text(tamil_text, "ta") == "பூனை ஓடுகிறது"

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
        def __init__(self, text, no_speech_prob=0.01, avg_logprob=-0.2):
            self.text = text
            self.no_speech_prob = no_speech_prob
            self.avg_logprob = avg_logprob

    class MockModel:
        def transcribe(self, audio_path, language, beam_size=5, temperature=0.0, vad_filter=True, vad_parameters=None, condition_on_previous_text=False):
            return [MockSegment("The sun is bright.")], None

    monkeypatch.setattr("app.services.speech_to_text._get_whisper_model", lambda: MockModel())
    monkeypatch.setattr("app.services.speech_to_text._convert_audio_to_wav", lambda b, input_extension=".wav": "dummy_path.wav")

    res = transcribe_audio(b"RIFFdummyWAV", "test.wav", "en-IN")
    assert res == "The sun is bright."

def test_transcribe_audio_filters_noise_segments(monkeypatch):
    class MockSegment:
        def __init__(self, text, no_speech_prob=0.0, avg_logprob=0.0):
            self.text = text
            self.no_speech_prob = no_speech_prob
            self.avg_logprob = avg_logprob

    class MockModel:
        def transcribe(self, audio_path, language, **kwargs):
            return [
                MockSegment("Hallucinated noise text", no_speech_prob=0.85, avg_logprob=-0.1),
                MockSegment("Valid spoken text", no_speech_prob=0.05, avg_logprob=-0.2),
            ], None

    monkeypatch.setattr("app.services.speech_to_text._get_whisper_model", lambda: MockModel())
    monkeypatch.setattr("app.services.speech_to_text._convert_audio_to_wav", lambda b, input_extension=".wav": "dummy_path.wav")

    res = transcribe_audio(b"RIFFdummyWAV", "test.wav", "en-IN")
    assert res == "Valid spoken text"

