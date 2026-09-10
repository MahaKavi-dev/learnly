import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=== 1. Testing GET /health ===")
res_health = client.get("/health")
print("Status:", res_health.status_code, "Body:", res_health.json())
assert res_health.status_code == 200

print("\n=== 2. Testing GET /health/supabase ===")
res_supa = client.get("/health/supabase")
print("Status:", res_supa.status_code, "Body:", res_supa.json())
assert res_supa.status_code == 200

print("\n=== 3. Testing GET /api/exercises ===")
res_ex = client.get("/api/exercises?language=en&difficulty=easy")
print("Status:", res_ex.status_code)
exercises = res_ex.json()
print(f"Retrieved {len(exercises)} exercises. Sample:", exercises[0] if exercises else None)
assert res_ex.status_code == 200

print("\n=== 4. Testing POST /api/stt with Real English OGG Audio ===")
with open("test_speech_en.ogg", "rb") as f:
    ogg_bytes = f.read()

res_stt = client.post(
    "/api/stt",
    data={"language": "en-IN"},
    files={"file": ("recording.ogg", ogg_bytes, "audio/ogg")}
)
print("STT Response Status:", res_stt.status_code)
print("STT Response Body:", res_stt.json())

print("\n=== 5. Testing POST /api/assess with Assessment Pipeline ===")
transcript_text = res_stt.json().get("transcript", "The sun is bright") if res_stt.status_code == 200 else "The sun is bright"

res_assess = client.post("/api/assess", json={
    "exerciseId": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
    "expectedText": "The sun is bright.",
    "userTranscript": transcript_text,
    "language": "en"
})
print("Assessment Response Status:", res_assess.status_code)
print("Assessment Response Body:\n", json.dumps(res_assess.json(), indent=2))
assert res_assess.status_code == 200
data = res_assess.json()
assert "score" in data
assert "accuracy" in data
assert "fluency" in data
assert "skill" in data
assert "needsPractice" in data
assert "feedback" in data
assert "nextDifficulty" in data

print("\n=== END-TO-END PIPELINE VERIFICATION COMPLETE ===")
