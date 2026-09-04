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

Create exactly {question_count} separate multiple-choice questions using ONLY facts explicitly stated in the document.

IMPORTANT ACCURACY RULES:
- Every question must be directly answerable from the document.
- Do NOT use outside knowledge.
- Do NOT invent facts, benefits, costs, purposes, results, or examples.
- Every question must test a different fact or concept from the document.
- The correct answer must be explicitly supported by the document.
- Do NOT use "All of the above".
- Do not copy the exact answer phrase into the question unless the question is specifically asking the student to identify that term.
- Do not make the correct answer obvious by repeating the same wording from the question.
- Do NOT use "None of the above".
- Do NOT create an answer choice that combines several claims unless the document explicitly supports that exact combination.
- Make all four options plausible and related to the document.
- Only ONE option can be correct.
- Check every option against the document before finalizing the question.
- Do not confuse the project's purpose with its benefits, features, methods, or results.
- If the document does not contain enough information for {question_count} good questions, create fewer high-quality questions rather than inventing information.

Each question must have exactly four options: A, B, C, and D.

Include the correct answer and a short explanation.

Use this exact format:

QUESTION 1:
Question text

A) Option A
B) Option B
C) Option C
D) Option D

ANSWER: A
EXPLANATION: Short explanation based directly on the document

Repeat the same format for every question.

Before giving the final quiz, silently check:
1. The question is supported by the document.
2. Exactly one option is correct.
3. The correct answer is not based on outside knowledge.
4. The explanation matches the document.
5. The question is different from the previous questions.

Document:
{document.content}
"""

    try:
        quiz = ask_ollama(prompt)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

    return QuizResponse(quiz=quiz)