from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document
from app.services.llm import ask_ollama


router = APIRouter(prefix="/summary", tags=["summary"])


class SummaryRequest(BaseModel):
    document_id: int


class SummaryResponse(BaseModel):
    summary: str


@router.post("", response_model=SummaryResponse)
def summarize_document(
    payload: SummaryRequest,
    db: Session = Depends(get_db),
):
    document = db.scalar(
        select(Document).where(Document.id == payload.document_id)
    )

    if not document:
        raise HTTPException(404, "Document not found.")

    if not document.content or not document.content.strip():
        raise HTTPException(400, "The document has no text to summarize.")

    prompt = f"""You are an AI Teacher.

Create a clear and simple study summary of the document below.

Use ONLY the document content.
Do not add information that is not in the document.

Organize the summary with:
1. Main topic
2. Key points
3. Important details

Document:
{document.content}

Study summary:
"""

    try:
        summary = ask_ollama(prompt)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

    return SummaryResponse(summary=summary)
