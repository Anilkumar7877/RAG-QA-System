import os
import re
import json
import uuid
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from ingest import ingest_pdf
from chain import ask

load_dotenv()

app = FastAPI(title="RAG Document Q&A API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
    if not file.filename.lower().endswith(".pdf"):
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

@app.get("/stats/{session_id}")
async def stats(session_id: str):
    import chromadb
    client = chromadb.PersistentClient(path="./chroma_db")
    filename = ""
    try:
        collection = client.get_collection(session_id)
        chunk_count = collection.count()
        sample = collection.get(limit=1)
        if sample and sample["metadatas"] and len(sample["metadatas"]) > 0:
            source_path = sample["metadatas"][0].get("source", "")
            filename = os.path.basename(source_path)
    except Exception as e:
        print("Error fetching stats:", e)
        chunk_count = 0

    return {
        "session_id": session_id,
        "filename": filename,
        "chunks": chunk_count,
        "retrieval_mode": "Hybrid BM25 + Semantic",
        "reranking": "Cross-Encoder (ms-marco-MiniLM-L-6-v2)",
        "embedding_model": "all-MiniLM-L6-v2",
        "llm": "Gemini 2.5 Flash",
        "ragas_baseline": {
            "faithfulness": 0.815,
            "answer_relevancy": 0.736,
            "context_precision": 0.633
        }
    }


@app.get("/document/{filename}")
async def get_document(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="application/pdf")

@app.get("/mindmap/{session_id}")
async def mindmap(session_id: str):
    # Check cache first to avoid redundant LLM calls
    cache_path = os.path.join(UPLOAD_DIR, f"cache_mindmap_{session_id}.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print("Cache read error:", e)

    import chromadb
    from langchain_google_genai import ChatGoogleGenerativeAI

    # Get all chunks from this session
    client = chromadb.PersistentClient(path="./chroma_db")
    try:
        collection = client.get_collection(session_id)
        data = collection.get(limit=20)  # first 20 chunks enough for topics
        chunks_text = "\n\n".join(data["documents"])
    except Exception as e:
        raise HTTPException(status_code=404, detail="Session not found")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.3
    )

    prompt = f"""Analyze the following document content and extract a knowledge graph.
Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{{
  "title": "Main topic of the document",
  "nodes": [
    {{"id": "1", "label": "Main Topic", "type": "root"}},
    {{"id": "2", "label": "Subtopic 1", "type": "topic"}},
    {{"id": "3", "label": "Concept A", "type": "concept"}}
  ],
  "edges": [
    {{"source": "1", "target": "2", "label": "contains"}},
    {{"source": "2", "target": "3", "label": "includes"}}
  ]
}}

Rules:
- 1 root node (the main topic)
- 5-8 topic nodes (major sections/themes)
- 8-15 concept nodes (specific ideas, terms, techniques)
- edges showing relationships between them
- keep labels short (2-4 words max)

Document content:
{chunks_text[:3000]}
"""

    response = llm.invoke(prompt).content

    # Clean response — robustly extract JSON block if present
    clean = response.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
    if match:
        clean = match.group(1).strip()
    else:
        # Fallback to outer-most curly braces
        match = re.search(r"(\{[\s\S]*\})", clean)
        if match:
            clean = match.group(1).strip()

    try:
        graph = json.loads(clean)
        # Cache the generated mind map
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(graph, f, ensure_ascii=False)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse mind map from LLM")

    return graph


@app.get("/summary/{session_id}")
async def summary(session_id: str):
    # Check cache first to avoid redundant LLM calls
    cache_path = os.path.join(UPLOAD_DIR, f"cache_summary_{session_id}.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print("Cache read error:", e)

    import chromadb
    from langchain_google_genai import ChatGoogleGenerativeAI

    # Get all chunks from this session
    client = chromadb.PersistentClient(path="./chroma_db")
    try:
        collection = client.get_collection(session_id)
        data = collection.get(limit=20)  # first 20 chunks enough for core topics
        
        # Format chunk texts with their page numbers
        formatted_chunks = []
        for idx, doc_text in enumerate(data["documents"]):
            page = data["metadatas"][idx].get("page", "?") if data["metadatas"] else "?"
            # Convert 0-indexed to 1-indexed for readable presentation
            display_page = page + 1 if isinstance(page, int) else page
            formatted_chunks.append(f"[Page {display_page}]: {doc_text}")
        
        chunks_text = "\n\n".join(formatted_chunks)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Session not found")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.3
    )

    prompt = f"""Analyze the following document content and extract a list of 4 to 6 major topics.
For each topic, provide a high-level summary paragraph, 3 to 5 critical key points (bullet points), and the page numbers where this topic is mentioned.

Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{{
  "title": "Main title/topic of the document",
  "topics": [
    {{
      "topic": "Name of the Topic",
      "summary": "Concise high-level summary paragraph (2-3 sentences)",
      "key_points": [
        "Significant detail or key takeaway",
        "Another key detail"
      ],
      "page_references": [1, 2]
    }}
  ]
}}

Document content:
{chunks_text[:4000]}
"""

    response = llm.invoke(prompt).content

    # Clean response — robustly extract JSON block if present
    clean = response.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
    if match:
        clean = match.group(1).strip()
    else:
        # Fallback to outer-most curly braces
        match = re.search(r"(\{[\s\S]*\})", clean)
        if match:
            clean = match.group(1).strip()

    try:
        result = json.loads(clean)
        # Cache the generated summary cards
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse document summary from LLM")

    return result