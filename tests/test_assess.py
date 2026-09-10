from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    assert client.get("/health").json()["status"] == "ok"

def test_assess_mock(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
        "expectedText": "The sun is bright.",
        "userTranscript": "The sun is bright",
        "language": "en"
    })
    assert r.status_code == 200
    assert set(r.json()) == {
        "score", "accuracy", "fluency", "skill",
        "needsPractice", "feedback", "nextDifficulty"
    }

def test_assess_wrong_answer(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
        "expectedText": "B",
        "userTranscript": "X",
        "language": "en"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 0
    assert data["accuracy"] == 0
    assert data["needsPractice"] is True
    assert data["nextDifficulty"] == "easy"

def test_assess_correct_medium(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": "ef7a0fdb-89e7-4c18-9c9d-98d842dae2d3",
        "expectedText": "SCHOOL",
        "userTranscript": "SCHOOL",
        "language": "en"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 100
    assert data["accuracy"] == 100
    assert data["nextDifficulty"] == "hard"

def test_assess_language_mismatch(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
        "expectedText": "B",
        "userTranscript": "B",
        "language": "ta"
    })
    assert r.status_code == 400
    assert r.json()["detail"] == "Exercise language does not match request language"

def test_assess_database_answer_overrides_client(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": "ef7a0fdb-89e7-4c18-9c9d-98d842dae2d3",
        "expectedText": "WRONG",
        "userTranscript": "B",
        "language": "en"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 0
    assert data["accuracy"] == 0
    assert data["needsPractice"] is True
    assert data["nextDifficulty"] == "easy"

def test_assess_missing_exercise_id(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": "00000000-0000-0000-0000-000000000000",
        "expectedText": "TEST",
        "userTranscript": "TEST",
        "language": "en"
    })
    assert r.status_code == 404
    assert r.json()["detail"] == "Exercise not found"

def test_assess_invalid_exercise_id(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": "invalid-uuid-format",
        "expectedText": "TEST",
        "userTranscript": "TEST",
        "language": "en"
    })
    assert r.status_code in (400, 404, 502)
    assert r.status_code != 500

from app.services.supabase import get_supabase

VALID_CHILD_ID = "096e0481-844a-4a68-a589-e888f3781318"
EASY_EXERCISE_ID = "ef319c72-2dbd-4d7c-9726-32362d13c8dc"

def test_assess_persistence_success(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en",
        "childId": VALID_CHILD_ID
    })
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 100

    sb = get_supabase()
    if sb:
        res = (
            sb.table("attempts")
            .select("id, child_id, exercise_id, answer, score")
            .eq("child_id", VALID_CHILD_ID)
            .eq("exercise_id", EASY_EXERCISE_ID)
            .eq("answer", "B")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        assert res.data
        attempt = res.data[0]
        assert attempt["child_id"] == VALID_CHILD_ID
        assert attempt["exercise_id"] == EASY_EXERCISE_ID
        assert attempt["answer"] == "B"
        assert attempt["score"] == 100

        sb.table("attempts").delete().eq("id", attempt["id"]).execute()

def test_assess_persistence_wrong_answer(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "X_PERSIST_TEST",
        "language": "en",
        "childId": VALID_CHILD_ID
    })
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 0
    assert data["needsPractice"] is True

    sb = get_supabase()
    if sb:
        res = (
            sb.table("attempts")
            .select("id, child_id, exercise_id, answer, score")
            .eq("child_id", VALID_CHILD_ID)
            .eq("exercise_id", EASY_EXERCISE_ID)
            .eq("answer", "X_PERSIST_TEST")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        assert res.data
        attempt = res.data[0]
        assert attempt["score"] == 0

        sb.table("attempts").delete().eq("id", attempt["id"]).execute()

def test_assess_invalid_child_id(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en",
        "childId": "00000000-0000-0000-0000-000000000000"
    })
    assert r.status_code == 404
    assert r.json()["detail"] == "Child not found"

def test_assess_no_child_id(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en"
    })
    assert r.status_code == 200
    assert set(r.json()) == {
        "score", "accuracy", "fluency", "skill",
        "needsPractice", "feedback", "nextDifficulty"
    }

def test_assess_progress_first_creation(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    sb = get_supabase()
    if sb:
        # Clear any prior test progress for isolation
        sb.table("progress").delete().eq("child_id", VALID_CHILD_ID).execute()

    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en",
        "childId": VALID_CHILD_ID
    })
    assert r.status_code == 200
    data = r.json()

    if sb:
        res = (
            sb.table("progress")
            .select("id, child_id, skill, accuracy, exercises_completed")
            .eq("child_id", VALID_CHILD_ID)
            .eq("skill", data["skill"])
            .execute()
        )
        assert res.data
        prog = res.data[0]
        assert prog["child_id"] == VALID_CHILD_ID
        assert prog["skill"] == data["skill"]
        assert prog["accuracy"] == data["accuracy"]
        assert prog["exercises_completed"] == 1

        # Clean up
        sb.table("progress").delete().eq("id", prog["id"]).execute()
        sb.table("attempts").delete().eq("child_id", VALID_CHILD_ID).execute()

def test_assess_progress_subsequent_update(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    sb = get_supabase()
    if sb:
        sb.table("progress").delete().eq("child_id", VALID_CHILD_ID).execute()

    # First attempt
    r1 = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en",
        "childId": VALID_CHILD_ID
    })
    assert r1.status_code == 200

    # Second attempt
    r2 = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en",
        "childId": VALID_CHILD_ID
    })
    assert r2.status_code == 200

    if sb:
        res = (
            sb.table("progress")
            .select("id, child_id, skill, accuracy, exercises_completed")
            .eq("child_id", VALID_CHILD_ID)
            .eq("skill", r2.json()["skill"])
            .execute()
        )
        # Ensure single updated progress record, no duplicate logical rows
        assert len(res.data) == 1
        prog = res.data[0]
        assert prog["exercises_completed"] == 2

        # Clean up
        sb.table("progress").delete().eq("id", prog["id"]).execute()
        sb.table("attempts").delete().eq("child_id", VALID_CHILD_ID).execute()

def test_assess_progress_wrong_answer(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    sb = get_supabase()
    if sb:
        sb.table("progress").delete().eq("child_id", VALID_CHILD_ID).execute()

    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "X_WRONG_PROG",
        "language": "en",
        "childId": VALID_CHILD_ID
    })
    assert r.status_code == 200
    data = r.json()
    assert data["accuracy"] == 0

    if sb:
        res = (
            sb.table("progress")
            .select("id, accuracy, exercises_completed")
            .eq("child_id", VALID_CHILD_ID)
            .eq("skill", data["skill"])
            .execute()
        )
        assert res.data
        assert res.data[0]["accuracy"] == 0

        # Clean up
        sb.table("progress").delete().eq("id", res.data[0]["id"]).execute()
        sb.table("attempts").delete().eq("child_id", VALID_CHILD_ID).execute()

def test_assess_progress_no_child_id(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en"
    })
    assert r.status_code == 200

def test_assess_progress_invalid_child_id(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en",
        "childId": "00000000-0000-0000-0000-000000000000"
    })
    assert r.status_code == 404
    assert r.json()["detail"] == "Child not found"

from app.services.streak import update_child_streak

def test_assess_streak_first_day(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    sb = get_supabase()
    if not sb:
        return
    sb.table("streaks").delete().eq("child_id", VALID_CHILD_ID).execute()

    res = update_child_streak(sb, VALID_CHILD_ID, activity_date="2026-09-01")
    assert res["current_streak"] == 1
    assert res["longest_streak"] == 1
    assert res["last_activity_date"] == "2026-09-01"

    sb.table("streaks").delete().eq("child_id", VALID_CHILD_ID).execute()

def test_assess_streak_consecutive_day(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    sb = get_supabase()
    if not sb:
        return
    sb.table("streaks").delete().eq("child_id", VALID_CHILD_ID).execute()

    res1 = update_child_streak(sb, VALID_CHILD_ID, activity_date="2026-09-01")
    assert res1["current_streak"] == 1

    res2 = update_child_streak(sb, VALID_CHILD_ID, activity_date="2026-09-02")
    assert res2["current_streak"] == 2
    assert res2["longest_streak"] == 2
    assert res2["last_activity_date"] == "2026-09-02"

    sb.table("streaks").delete().eq("child_id", VALID_CHILD_ID).execute()

def test_assess_streak_same_day_duplicate(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    sb = get_supabase()
    if not sb:
        return
    sb.table("streaks").delete().eq("child_id", VALID_CHILD_ID).execute()

    res1 = update_child_streak(sb, VALID_CHILD_ID, activity_date="2026-09-01")
    assert res1["current_streak"] == 1

    # Second assessment submission on same day
    res2 = update_child_streak(sb, VALID_CHILD_ID, activity_date="2026-09-01")
    assert res2["current_streak"] == 1
    assert res2["longest_streak"] == 1

    sb.table("streaks").delete().eq("child_id", VALID_CHILD_ID).execute()

def test_assess_streak_skipped_day_reset(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    sb = get_supabase()
    if not sb:
        return
    sb.table("streaks").delete().eq("child_id", VALID_CHILD_ID).execute()

    # Day 1 -> streak 1
    update_child_streak(sb, VALID_CHILD_ID, activity_date="2026-09-01")
    # Day 2 -> streak 2
    update_child_streak(sb, VALID_CHILD_ID, activity_date="2026-09-02")
    # Day 4 (Day 3 skipped) -> current streak resets to 1, longest streak preserved at 2
    res = update_child_streak(sb, VALID_CHILD_ID, activity_date="2026-09-04")
    assert res["current_streak"] == 1
    assert res["longest_streak"] == 2
    assert res["last_activity_date"] == "2026-09-04"

    sb.table("streaks").delete().eq("child_id", VALID_CHILD_ID).execute()

def test_assess_streak_no_child_id(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en"
    })
    assert r.status_code == 200

def test_assess_streak_invalid_child_id(monkeypatch):
    monkeypatch.setenv("USE_GEMINI", "false")
    r = client.post("/api/assess", json={
        "exerciseId": EASY_EXERCISE_ID,
        "expectedText": "B",
        "userTranscript": "B",
        "language": "en",
        "childId": "00000000-0000-0000-0000-000000000000"
    })
    assert r.status_code == 404
    assert r.json()["detail"] == "Child not found"




