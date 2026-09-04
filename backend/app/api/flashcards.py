from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document
from app.services.llm import ask_ollama


router = APIRouter(prefix="/flashcards", tags=["flashcards"])


class FlashcardRequest(BaseModel):
    document_id: int
    card_count: int = 5


class FlashcardResponse(BaseModel):
    flashcards: list[dict[str, str]]


@router.post("", response_model=FlashcardResponse)
def create_flashcards(
    payload: FlashcardRequest,
    db: Session = Depends(get_db),
):
    document = db.scalar(
        select(Document).where(Document.id == payload.document_id)
    )

    if not document:
        raise HTTPException(404, "Document not found.")

    if not document.content or not document.content.strip():
        raise HTTPException(400, "The document has no text.")

    card_count = max(1, min(payload.card_count, 10))

    prompt = f"""You are an AI Teacher creating study flashcards.

Create exactly {card_count} separate flashcards using ONLY facts explicitly stated in the document.

IMPORTANT ACCURACY RULES:
- Use ONLY information from the document.
- Do NOT use outside knowledge.
- Do NOT invent facts or examples.
- Each flashcard must test a different fact or concept.
- Keep questions short and clear.
- Keep answers short and directly supported by the document.
- Do not make the answer a long paragraph.
- Do not repeat the same fact in different flashcards.

Use this exact format:

FLASHCARD 1:
QUESTION: Question text
ANSWER: Short answer

FLASHCARD 2:
QUESTION: Question text
ANSWER: Short answer

Repeat for every flashcard.

Before giving the final flashcards, silently check:
1. The question is supported by the document.
2. The answer is explicitly supported by the document.
3. The question and answer match.
4. Each flashcard tests a different fact or concept.

Document:
{document.content}
"""

    try:
        result = ask_ollama(prompt)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

    flashcards = []

    blocks = result.split("FLASHCARD")

    for block in blocks[1:]:
        lines = block.strip().splitlines()

        question = ""
        answer = ""

        for line in lines:
            if line.upper().startswith("QUESTION:"):
                question = line.split(":", 1)[1].strip()
            elif line.upper().startswith("ANSWER:"):
                answer = line.split(":", 1)[1].strip()

        if question and answer:
            flashcards.append(
                {
                    "question": question,
                    "answer": answer,
                }
            )

    if not flashcards:
        raise HTTPException(
            500,
            "The AI did not return readable flashcards.",
        )

    return FlashcardResponse(flashcards=flashcards)