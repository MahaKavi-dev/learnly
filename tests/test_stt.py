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
    assert _normalize_language("en-IN") == "en-IN"
    assert _normalize_language("ta-IN") == "ta-IN"
    assert _normalize_language("en") == "en-IN"
    assert _normalize_language("ta") == "ta-IN"

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

def test_sarvam_stt_tamil_success(monkeypatch):
    class MockResponse:
        status_code = 200
        def json(self):
            return {"transcript": "பூனை ஓடுகிறது", "language_code": "ta-IN"}

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, url, headers, data, files):
            assert url == "https://api.sarvam.ai/speech-to-text"
            assert headers.get("api-subscription-key") == "dummy_sarvam_key"
            assert data.get("language_code") == "ta-IN"
            assert data.get("model") == "saaras:v4"
            assert data.get("mode") == "transcribe"
            return MockResponse()

    monkeypatch.setenv("SARVAM_API_KEY", "dummy_sarvam_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    res = transcribe_audio(b"RIFFdummyWAV", "tamil_speech.wav", "ta-IN")
    assert res == "பூனை ஓடுகிறது"


def test_sarvam_stt_english_success(monkeypatch):
    class MockResponse:
        status_code = 200
        def json(self):
            return {"transcript": "Find the letter B", "language_code": "en-IN"}

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, url, headers, data, files):
            assert url == "https://api.sarvam.ai/speech-to-text"
            assert headers.get("api-subscription-key") == "dummy_sarvam_key"
            assert data.get("language_code") == "en-IN"
            assert data.get("model") == "saaras:v4"
            assert data.get("mode") == "transcribe"
            return MockResponse()

    monkeypatch.setenv("SARVAM_API_KEY", "dummy_sarvam_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    res = transcribe_audio(b"RIFFdummyWAV", "english_speech.wav", "en-IN")
    assert res == "Find the letter B"


def test_sarvam_stt_missing_api_key(monkeypatch):
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    try:
        transcribe_audio(b"RIFFdummyWAV", "test.wav", "en-IN")
        assert False, "Should have raised RuntimeError"
    except RuntimeError as err:
        assert "SARVAM_API_KEY is missing" in str(err)


def test_sarvam_stt_400_bad_request(monkeypatch):
    class MockResponse:
        status_code = 400
        text = "Invalid file format"

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, *args, **kwargs):
            return MockResponse()

    monkeypatch.setenv("SARVAM_API_KEY", "dummy_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    try:
        transcribe_audio(b"RIFFdummyWAV", "test.wav", "en-IN")
        assert False, "Should have raised ValueError"
    except ValueError as err:
        assert "Sarvam STT Bad Request" in str(err)


def test_sarvam_stt_401_auth_error(monkeypatch):
    class MockResponse:
        status_code = 401
        text = "Unauthorized"

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, *args, **kwargs):
            return MockResponse()

    monkeypatch.setenv("SARVAM_API_KEY", "invalid_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    try:
        transcribe_audio(b"RIFFdummyWAV", "test.wav", "en-IN")
        assert False, "Should have raised RuntimeError"
    except RuntimeError as err:
        assert "Authentication failed" in str(err)


def test_sarvam_stt_429_rate_limit(monkeypatch):
    class MockResponse:
        status_code = 429
        text = "Rate limit exceeded"

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, *args, **kwargs):
            return MockResponse()

    monkeypatch.setenv("SARVAM_API_KEY", "dummy_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    try:
        transcribe_audio(b"RIFFdummyWAV", "test.wav", "en-IN")
        assert False, "Should have raised RuntimeError"
    except RuntimeError as err:
        assert "rate limit exceeded" in str(err)


def test_sarvam_stt_500_server_error(monkeypatch):
    class MockResponse:
        status_code = 500
        text = "Internal Server Error"

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, *args, **kwargs):
            return MockResponse()

    monkeypatch.setenv("SARVAM_API_KEY", "dummy_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    try:
        transcribe_audio(b"RIFFdummyWAV", "test.wav", "en-IN")
        assert False, "Should have raised RuntimeError"
    except RuntimeError as err:
        assert "Sarvam STT service error" in str(err)
