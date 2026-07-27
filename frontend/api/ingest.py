import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

load_dotenv()

IS_VERCEL = os.getenv("VERCEL") is not None
CHROMA_PATH = "/tmp/chroma_db" if IS_VERCEL else os.getenv("CHROMA_PATH", "./chroma_db")

# Cache Google Generative AI embedding model globally to avoid loading it on every query
# Using models/text-embedding-004 is free, fast, and does not require PyTorch/sentence-transformers
embeddings_model = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

def ingest_pdf(pdf_path: str, session_id: str) -> int:
    print(f"Loading {pdf_path}...")
    loader = PyMuPDFLoader(pdf_path)
    docs = loader.load()
    print(f"  Loaded {len(docs)} pages")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(docs)
    print(f"  Split into {len(chunks)} chunks")

    if len(chunks) == 0:
        raise ValueError(
            f"No text extracted from {pdf_path}. "
            "PDF may be scanned or image-based."
        )

    # Each session gets its own isolated collection
    Chroma.from_documents(
        chunks,
        embeddings_model,
        persist_directory=CHROMA_PATH,
        collection_name=session_id
    )

    print(f"  Stored in collection: {session_id}")
    return len(chunks)
