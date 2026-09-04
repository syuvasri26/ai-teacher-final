from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document
from app.services.llm import ask_ollama


router = APIRouter(prefix="/quiz", tags=["quiz"])


class QuizRequest(BaseModel):
    document_id: int
    question_count: int = 5


class QuizResponse(BaseModel):
    quiz: str


@router.post("", response_model=QuizResponse)
def create_quiz(
    payload: QuizRequest,
    db: Session = Depends(get_db),
):
    document = db.scalar(
        select(Document).where(Document.id == payload.document_id)
    )

    if not document:
        raise HTTPException(404, "Document not found.")

    if not document.content or not document.content.strip():
        raise HTTPException(400, "The document has no text.")

    question_count = max(1, min(payload.question_count, 10))

    prompt = f"""You are an AI Teacher creating a study quiz.

Create exactly {question_count} separate multiple-choice questions using ONLY the document content below.

IMPORTANT:
- You MUST create all {question_count} questions.
- Do not stop after one question.
- Each question must test a different fact or concept from the document.
- The correct answer must directly answer the question.
- Do not confuse a system's main purpose with its benefits, features, or results.

Use this exact format:

QUESTION 1:
Question text

A) Option A
B) Option B
C) Option C
D) Option D

ANSWER: A
EXPLANATION: Short explanation

Repeat the same format for every question.

Document:
{document.content}
"""

    try:
        quiz = ask_ollama(prompt)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

    return QuizResponse(quiz=quiz)