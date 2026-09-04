from pydantic import BaseModel

class DocumentOut(BaseModel):
    id: int
    title: str
    source_type: str

    model_config = {"from_attributes": True}

class SearchRequest(BaseModel):
    query: str
    limit: int = 5

class SearchResult(BaseModel):
    chunk_id: int
    document_id: int
    content: str
    score: float
