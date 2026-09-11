from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.routes.assess import router as assess_router
from app.routes.stt import router as stt_router
from app.routes.exercises import router as exercises_router
from app.routes.tts import router as tts_router
from app.routes.handwriting_test import router as handwriting_router
from app.services.supabase import supabase_status

app = FastAPI(title="Learnly Backend", version="0.2.0")
app.include_router(assess_router)
app.include_router(stt_router)
app.include_router(exercises_router)
app.include_router(tts_router)
app.include_router(handwriting_router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/supabase")
def health_supabase():
    return supabase_status()


