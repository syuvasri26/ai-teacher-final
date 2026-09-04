import os
import tempfile
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document, DocumentChunk
from app.schemas.document import DocumentOut, SearchRequest, SearchResult
from app.services.chunking import chunk_text
from app.services.embedding import embed_text
from app.services.pdf import extract_pdf_text

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Step 1 currently supports PDF uploads.")

    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    try:
        content = extract_pdf_text(temp_path)
    finally:
        os.unlink(temp_path)

    if not content.strip():
        raise HTTPException(400, "No text could be extracted from the PDF.")

    doc = Document(
        title=file.filename,
        source_type="pdf",
        content=content,
    )
    db.add(doc)
    db.flush()

    for i, chunk in enumerate(chunk_text(content)):
        embedding = None
        # Embeddings are optional in Step 1 so the app can run without an API key.
        # Set OPENAI_API_KEY to enable vector search.
        try:
            embedding = embed_text(chunk)
        except RuntimeError:
            pass

        db.add(DocumentChunk(
            document_id=doc.id,
            chunk_index=i,
            content=chunk,
            embedding=embedding,
        ))

    db.commit()
    db.refresh(doc)
    return doc

@router.get("", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    return list(db.scalars(select(Document).order_by(Document.id.desc())))

@router.post("/search", response_model=list[SearchResult])
def search_documents(payload: SearchRequest, db: Session = Depends(get_db)):
    try:
        query_embedding = embed_text(payload.query)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

    distance = DocumentChunk.embedding.cosine_distance(query_embedding)
    rows = db.execute(
        select(DocumentChunk, distance.label("distance"))
        .where(DocumentChunk.embedding.is_not(None))
        .order_by(distance)
        .limit(payload.limit)
    ).all()

    return [
        SearchResult(
            chunk_id=chunk.id,
            document_id=chunk.document_id,
            content=chunk.content,
            score=1 - float(dist),
        )
        for chunk, dist in rows
    ]
