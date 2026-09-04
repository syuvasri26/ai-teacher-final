from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import DocumentChunk
from app.services.embedding import embed_text
from app.services.llm import ask_ollama


router = APIRouter(prefix="/teacher", tags=["teacher"])


class AskRequest(BaseModel):
    question: str
    limit: int = 5


class AskResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=AskResponse)
def ask_teacher(
    payload: AskRequest,
    db: Session = Depends(get_db),
):
    if not payload.question.strip():
        raise HTTPException(400, "Question cannot be empty.")

    try:
        query_embedding = embed_text(payload.question)
    except Exception as exc:
        raise HTTPException(500, f"Embedding failed: {exc}")

    distance = DocumentChunk.embedding.cosine_distance(query_embedding)

    rows = db.execute(
        select(DocumentChunk, distance.label("distance"))
        .where(DocumentChunk.embedding.is_not(None))
        .order_by(distance)
        .limit(payload.limit)
    ).all()

    if not rows:
        raise HTTPException(
            404,
            "No document content is available. Upload a PDF first.",
        )

    context_parts = []

    for chunk, dist in rows:
        context_parts.append(
            f"[Document {chunk.document_id}, chunk {chunk.chunk_index}]\n"
            f"{chunk.content}"
        )

    context = "\n\n".join(context_parts)

    prompt = f"""You are an AI Teacher.

Answer the student's question using ONLY the document context provided below.

If the answer cannot be found in the context, clearly say:
"I couldn't find that information in the uploaded documents."

Explain the answer clearly and simply, like a helpful teacher.

Document context:
{context}

Student question:
{payload.question}

Teacher answer:
"""

    try:
        answer = ask_ollama(prompt)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

    return AskResponse(answer=answer)
