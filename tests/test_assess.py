from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    assert client.get("/health").json()["status"] == "ok"

def test_assess_mock(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": "en-read-1",
        "expectedText": "The sun is bright.",
        "userTranscript": "The sun is bright",
        "language": "en"
    })
    assert r.status_code == 200
    assert set(r.json()) == {
        "score", "accuracy", "fluency", "skill",
        "needsPractice", "feedback", "nextDifficulty"
    }
