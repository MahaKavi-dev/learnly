import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=== 1. GET /health ===")
r_health = client.get("/health")
print("Status:", r_health.status_code)
print("Response:", r_health.json())
assert r_health.status_code == 200

print("\n=== 2. GET /health/supabase ===")
r_supa = client.get("/health/supabase")
print("Status:", r_supa.status_code)
print("Response:", r_supa.json())
assert r_supa.status_code == 200

print("\n=== 3. GET /api/exercises ===")
r_ex = client.get("/api/exercises?language=en&difficulty=easy")
print("Status:", r_ex.status_code)
print("Response count:", len(r_ex.json()))
print("Sample exercise:", r_ex.json()[0] if r_ex.json() else None)
assert r_ex.status_code == 200

print("\n=== 4. POST /api/assess ===")
r_assess = client.post("/api/assess", json={
    "exerciseId": "ef319c72-2dbd-4d7c-9726-32362d13c8dc",
    "expectedText": "The sun is bright.",
    "userTranscript": "The sun is bright",
    "language": "en"
})
print("Status:", r_assess.status_code)
print("Response:", json.dumps(r_assess.json(), indent=2))
assert r_assess.status_code == 200

print("\n=== 5. POST /api/stt (Real English Audio OGG) ===")
with open("test_speech_en.ogg", "rb") as f:
    ogg_data = f.read()

r_stt_en = client.post(
    "/api/stt",
    data={"language": "en-IN"},
    files={"file": ("recording.ogg", ogg_data, "audio/ogg")}
)
print("Status:", r_stt_en.status_code)
print("Response:", r_stt_en.json())

print("\n=== 6. POST /api/stt (Tamil Audio Test) ===")
r_stt_ta = client.post(
    "/api/stt",
    data={"language": "ta-IN"},
    files={"file": ("recording.ogg", ogg_data, "audio/ogg")}
)
print("Status:", r_stt_ta.status_code)
print("Response:", r_stt_ta.json())

print("\nALL MANUAL API ENDPOINT TESTS COMPLETED!")
