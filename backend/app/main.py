from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import Base, engine
from app.models import Document, DocumentChunk
from app.api.documents import router as documents_router
from app.api.teacher import router as teacher_router
from app.api.summary import router as summary_router
from app.api.quiz import router as quiz_router
from app.api.flashcards import router as flashcards_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="AI Teacher API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000", "https://ai-teacher-final.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/api")
app.include_router(teacher_router, prefix="/api")
app.include_router(summary_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")
app.include_router(flashcards_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-teacher-api"}

