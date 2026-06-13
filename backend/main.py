import os
import uuid
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from ingest import ingest_pdf
from chain import ask

load_dotenv()

app = FastAPI(title="RAG Document Q&A API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "../data"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class QueryRequest(BaseModel):
    question: str
    session_id: str
    chat_history: list = []


class QueryResponse(BaseModel):
    answer: str
    sources: list


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Unique session per upload
    session_id = f"session_{uuid.uuid4().hex[:12]}"
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        chunk_count = ingest_pdf(file_path, session_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "message": f"Successfully ingested {file.filename}",
        "chunks": chunk_count,
        "filename": file.filename,
        "session_id": session_id
    }


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if not request.session_id:
        raise HTTPException(status_code=400, detail="No document uploaded. Please upload a PDF first.")

    result = ask(request.question, request.session_id, request.chat_history)
    return result