import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.text_to_speech import _normalize_tts_language, synthesize_speech, _synthesize_cached

client = TestClient(app)


def test_normalize_tts_language():
    assert _normalize_tts_language("en-IN") == "en-IN"
    assert _normalize_tts_language("ta-IN") == "ta-IN"
    assert _normalize_tts_language("en") == "en-IN"
    assert _normalize_tts_language("ta") == "ta-IN"
    with pytest.raises(ValueError):
        _normalize_tts_language("fr-FR")


def test_tts_english_request_success(monkeypatch):
    class MockResponse:
        status_code = 200
        def json(self):
            return {"request_id": "req-123", "audios": ["UklGRlAAAABXQVZFZm10"]}

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, url, headers, json):
            assert url == "https://api.sarvam.ai/text-to-speech"
            assert headers.get("api-subscription-key") == "dummy_tts_key"
            assert json.get("target_language_code") == "en-IN"
            assert json.get("model") == "bulbul:v3"
            assert json.get("inputs") == ["CAT"]
            return MockResponse()

    _synthesize_cached.cache_clear()
    monkeypatch.setenv("SARVAM_API_KEY", "dummy_tts_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    response = client.post(
        "/api/tts",
        json={"text": "CAT", "languageCode": "en-IN"}
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["audio"] == "UklGRlAAAABXQVZFZm10"
    assert res_data["contentType"] == "audio/wav"


def test_tts_tamil_request_success(monkeypatch):
    class MockResponse:
        status_code = 200
        def json(self):
            return {"request_id": "req-456", "audios": ["UklGRlAAAABXQVZFZm10VEE="]}

    class MockClient:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def post(self, url, headers, json):
            assert url == "https://api.sarvam.ai/text-to-speech"
            assert headers.get("api-subscription-key") == "dummy_tts_key"
            assert json.get("target_language_code") == "ta-IN"
            assert json.get("model") == "bulbul:v3"
            assert json.get("inputs") == ["அம்மா"]
            return MockResponse()

    _synthesize_cached.cache_clear()
    monkeypatch.setenv("SARVAM_API_KEY", "dummy_tts_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    response = client.post(
        "/api/tts",
        json={"text": "அம்மா", "languageCode": "ta-IN"}
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["audio"] == "UklGRlAAAABXQVZFZm10VEE="
    assert res_data["contentType"] == "audio/wav"


def test_tts_empty_text():
    response = client.post(
        "/api/tts",
        json={"text": "   ", "languageCode": "en-IN"}
    )
    assert response.status_code == 400
    assert "Text field is required" in response.json()["detail"] or "empty" in response.json()["detail"]


def test_tts_unsupported_language():
    response = client.post(
        "/api/tts",
        json={"text": "Hello", "languageCode": "es-ES"}
    )
    assert response.status_code == 400
    assert "Unsupported language" in response.json()["detail"]


def test_tts_missing_api_key(monkeypatch):
    _synthesize_cached.cache_clear()
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    response = client.post(
        "/api/tts",
        json={"text": "CAT", "languageCode": "en-IN"}
    )
    assert response.status_code == 500
    assert "SARVAM_API_KEY is missing" in response.json()["detail"]


def test_tts_sarvam_api_error(monkeypatch):
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

    _synthesize_cached.cache_clear()
    monkeypatch.setenv("SARVAM_API_KEY", "dummy_tts_key")
    monkeypatch.setattr("httpx.Client", MockClient)

    response = client.post(
        "/api/tts",
        json={"text": "CAT", "languageCode": "en-IN"}
    )
    assert response.status_code == 500
    assert "rate limit exceeded" in response.json()["detail"]
