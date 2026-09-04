# AI Teacher — Step 1

Starter architecture for the AI Teacher challenge:
- Next.js frontend
- FastAPI backend
- PostgreSQL + pgvector
- PDF extraction
- Chunking
- Optional OpenAI embeddings
- Vector similarity search

## Requirements

- Docker + Docker Compose
- Python 3.11+
- Node.js 20+

## 1. Start PostgreSQL/pgvector

```bash
docker compose up -d db
```

## 2. Configure backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` in the project root and set `DATABASE_URL`.
For vector embeddings, also set `OPENAI_API_KEY`.

Run:

```bash
uvicorn app.main:app --reload --port 8000
```

Health check: http://localhost:8000/health
API docs: http://localhost:8000/docs

## 3. Start frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## 4. Test

Upload a text-based PDF from the frontend.

If `OPENAI_API_KEY` is configured, chunks receive embeddings and `/api/documents/search` performs cosine similarity search.

## Next implementation stage

Add:
1. DOCX/PPTX ingestion
2. topic-based lessons
3. learner profiles
4. structured lesson planner
5. adaptive teacher state machine
6. assessment
7. TTS
8. AI avatar/video
9. multilingual teaching
