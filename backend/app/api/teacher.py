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
    document_id: int
    limit: int = 5
    language: str = "English"
class AskResponse(BaseModel):
    answer: str

class LessonPointsRequest(BaseModel):
    document_id: int
    limit: int = 5


class LessonPointsResponse(BaseModel):
    title: str
    points: list[str]
@router.post("/lesson-points", response_model=LessonPointsResponse)
def lesson_points(
    payload: LessonPointsRequest,
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(DocumentChunk)
        .where(
            DocumentChunk.document_id == payload.document_id,
            DocumentChunk.embedding.is_not(None),
        )
        .order_by(DocumentChunk.chunk_index)
        .limit(payload.limit)
    ).scalars().all()

    if not rows:
        raise HTTPException(
            404,
            "No document content is available. Upload a PDF first.",
        )

    context = "\n\n".join(chunk.content for chunk in rows)

    prompt = f"""You are an AI Teacher.

Create a short lesson title and 3 to 5 key teaching points from ONLY the document context below.
Rules:
- The first line must be the lesson title.
- Then provide 3 to 5 teaching points.
- Use only information from the document.
- Make each point short and easy to understand.
- Focus on the most important ideas a student should learn.
- Return ONLY one teaching point per line.
- Do not use numbering.
- Do not use bullets.
- Do not use emojis.

Document context:
{context}

Key teaching points:
"""

    try:
        answer = ask_ollama(prompt)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    lines = [line.strip() for line in answer.splitlines() if line.strip()]
    title = lines[0] if lines else "AI Teacher Lesson"
    points = []

    for line in answer.splitlines():
        clean = line.strip()

        if clean.startswith("- "):
            clean = clean[2:].strip()
        elif clean.startswith("* "):
            clean = clean[2:].strip()
        elif clean.startswith("• "):
            clean = clean[2:].strip()

        if clean:
            points.append(clean)

    return LessonPointsResponse(title=title, points=points[1:6])

@router.post("/ask", response_model=AskResponse)
def ask_teacher(
    payload: AskRequest,
    db: Session = Depends(get_db),
):
    if not payload.question.strip():
        raise HTTPException(400, "Question cannot be empty.")

    try:
        query_embedding = embed_text(payload.question.split("\n\nRespond in ")[0])
    except Exception as exc:
        raise HTTPException(500, f"Embedding failed: {exc}")

    distance = DocumentChunk.embedding.cosine_distance(query_embedding)

    rows = db.execute(
    select(DocumentChunk, distance.label("distance"))
    .where(
        DocumentChunk.document_id == payload.document_id,
        DocumentChunk.embedding.is_not(None),
    )
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

Use the document context below as your ONLY source.

DOCUMENT:
{context}

STUDENT QUESTION:
{payload.question}

RESPONSE LANGUAGE:
{payload.language}

Instructions:
- First determine the answer from the DOCUMENT.
- The document is about a Smart Waste Segregation System using Raspberry Pi and YOLOv11.
- Stay strictly on the subject described in the DOCUMENT.
- Do not introduce unrelated subjects.
- Do not invent facts.
- Explain only information supported by the DOCUMENT.
- Keep the explanation simple and suitable for a student.
- Preserve important technical terms such as Raspberry Pi, YOLOv11, paper, metal, plastic, and biodegradable materials.
- Respond entirely in the requested RESPONSE LANGUAGE.
- If the DOCUMENT does not contain the answer, say:
"I couldn't find that information in the uploaded documents."

Teacher answer:
"""
    try:
        answer = ask_ollama(prompt)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

    return AskResponse(answer=answer)


