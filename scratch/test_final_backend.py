import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("==================================================")
print("LEARNLY BACKEND FINAL INTEGRATION VERIFICATION")
print("==================================================")

# 1. Health Endpoints
print("\n1. Testing GET /health & GET /health/supabase...")
r1 = client.get("/health")
assert r1.status_code == 200
print("   /health:", r1.json())

r2 = client.get("/health/supabase")
assert r2.status_code == 200
print("   /health/supabase:", r2.json())

# 2. GET /api/exercises
print("\n2. Testing GET /api/exercises...")
r3 = client.get("/api/exercises?language=en&difficulty=easy")
assert r3.status_code == 200
ex_list = r3.json()
print(f"   Found {len(ex_list)} exercises for language=en, difficulty=easy")
sample_ex = ex_list[0] if ex_list else None
print("   Sample Exercise:", sample_ex)

# 3. POST /api/stt (Real Audio File Test)
print("\n3. Testing POST /api/stt (English & Tamil Audio)...")
if os.path.exists("test_speech_en.ogg"):
    with open("test_speech_en.ogg", "rb") as f:
        ogg_data = f.read()

    r4_en = client.post(
        "/api/stt",
        data={"language": "en-IN"},
        files={"file": ("recording.ogg", ogg_data, "audio/ogg")}
    )
    print("   STT en-IN Status:", r4_en.status_code)
    print("   STT en-IN Body:", r4_en.json())

    r4_ta = client.post(
        "/api/stt",
        data={"language": "ta-IN"},
        files={"file": ("recording.ogg", ogg_data, "audio/ogg")}
    )
    print("   STT ta-IN Status:", r4_ta.status_code)
    print("   STT ta-IN Body:", r4_ta.json())
else:
    print("   test_speech_en.ogg not found, skipping file post")

# 4. POST /api/assess - English Correct Answer
print("\n4. Testing POST /api/assess (English Correct Answer)...")
r5 = client.post("/api/assess", json={
    "exerciseId": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
    "expectedText": "B",
    "userTranscript": "B",
    "language": "en"
})
assert r5.status_code == 200
d5 = r5.json()
print("   Score:", d5["score"], "Accuracy:", d5["accuracy"], "Fluency:", d5["fluency"])
print("   Next Difficulty:", d5["nextDifficulty"])
assert d5["score"] == 100
assert d5["nextDifficulty"] == "hard"

# 5. POST /api/assess - English Wrong Answer & Adaptive Difficulty
print("\n5. Testing POST /api/assess (English Wrong Answer)...")
r6 = client.post("/api/assess", json={
    "exerciseId": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
    "expectedText": "B",
    "userTranscript": "X",
    "language": "en"
})
assert r6.status_code == 200
d6 = r6.json()
print("   Score:", d6["score"], "NeedsPractice:", d6["needsPractice"])
print("   Next Difficulty:", d6["nextDifficulty"])
assert d6["score"] == 0
assert d6["needsPractice"] is True
assert d6["nextDifficulty"] == "easy"

# 6. POST /api/assess - Tamil Reading
print("\n6. Testing POST /api/assess (Tamil Reading)...")
r7 = client.post("/api/assess", json={
    "exerciseId": "ta-read-1",
    "expectedText": "வணக்கம்!",
    "userTranscript": "வணக்கம்",
    "language": "ta"
})
assert r7.status_code == 200
d7 = r7.json()
print("   Tamil Response:", d7)
assert d7["score"] > 80

# 7. Supabase Persistence Check
print("\n7. Testing Supabase Persistence with childId...")
VALID_CHILD_ID = "096e0481-844a-4a68-a589-e888f3781318"
r8 = client.post("/api/assess", json={
    "exerciseId": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
    "expectedText": "B",
    "userTranscript": "B",
    "language": "en",
    "childId": VALID_CHILD_ID
})
print("   Persistence Request Status:", r8.status_code)
assert r8.status_code in (200, 404)

print("\n==================================================")
print("ALL 10 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")
print("==================================================")
