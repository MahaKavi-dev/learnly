import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.handwriting_vision import (
    _normalize_language_code,
    normalize_text_for_comparison,
    recognize_handwriting,
)

client = TestClient(app)


def test_normalize_handwriting_language_code():
    assert _normalize_language_code("en-IN") == "en-IN"
    assert _normalize_language_code("ta-IN") == "ta-IN"
    assert _normalize_language_code("en") == "en-IN"
    assert _normalize_language_code("ta") == "ta-IN"
    with pytest.raises(ValueError):
        _normalize_language_code("fr-FR")


def test_normalize_text_for_comparison():
    assert normalize_text_for_comparison("  cat   ", "en-IN") == "CAT"
    assert normalize_text_for_comparison("பூனை  ", "ta-IN") == "பூனை"


def test_handwriting_missing_image():
    response = client.post(
        "/api/handwriting-test",
        data={"languageCode": "en-IN", "targetText": "CAT"}
    )
    assert response.status_code == 400
    assert "Image file is required" in response.json()["detail"]


def test_handwriting_missing_target_text():
    response = client.post(
        "/api/handwriting-test",
        data={"languageCode": "en-IN", "targetText": "  "},
        files={"image": ("test.png", b"fake png bytes", "image/png")}
    )
    assert response.status_code == 400
    assert "targetText" in response.json()["detail"]


def test_handwriting_unsupported_language():
    response = client.post(
        "/api/handwriting-test",
        data={"languageCode": "de-DE", "targetText": "CAT"},
        files={"image": ("test.png", b"fake png bytes", "image/png")}
    )
    assert response.status_code == 400
    assert "Unsupported language" in response.json()["detail"]


def test_handwriting_success_mocked(monkeypatch):
    def mock_recognize(file_bytes, filename, language_code, target_text):
        return {
            "targetText": "CAT",
            "recognizedText": "CAT",
            "languageCode": "en-IN",
            "match": True,
            "latencySeconds": 1.42
        }

    monkeypatch.setattr("app.routes.handwriting_test.recognize_handwriting", mock_recognize)

    response = client.post(
        "/api/handwriting-test",
        data={"languageCode": "en-IN", "targetText": "CAT"},
        files={"image": ("test.png", b"dummy image bytes", "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["targetText"] == "CAT"
    assert data["recognizedText"] == "CAT"
    assert data["match"] is True
    assert data["latencySeconds"] == 1.42


def test_handwriting_failure_mocked(monkeypatch):
    def mock_recognize_fail(file_bytes, filename, language_code, target_text):
        raise RuntimeError("Sarvam Vision job processing timed out.")

    monkeypatch.setattr("app.routes.handwriting_test.recognize_handwriting", mock_recognize_fail)

    response = client.post(
        "/api/handwriting-test",
        data={"languageCode": "ta-IN", "targetText": "அம்மா"},
        files={"image": ("test.png", b"dummy image bytes", "image/png")}
    )
    assert response.status_code == 500
    assert "timed out" in response.json()["detail"].lower()
