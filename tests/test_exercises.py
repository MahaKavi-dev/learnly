from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_exercises_all():
    response = client.get("/api/exercises")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_get_exercises_filter_language():
    response = client.get("/api/exercises?language=en")
    assert response.status_code == 200
    data = response.json()
    assert all(e["language"] == "en" for e in data)

def test_get_exercises_filter_type():
    response = client.get("/api/exercises?type=reading")
    assert response.status_code == 200
    data = response.json()
    assert all(e["type"] == "reading" for e in data)

def test_get_exercises_filter_difficulty():
    response = client.get("/api/exercises?difficulty=easy")
    assert response.status_code == 200
    data = response.json()
    assert all(e["difficulty"] == 1 for e in data)
