import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

load_dotenv()

CHROMA_PATH = "./chroma_db"

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

    print("  Generating embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # Each session gets its own isolated collection
    Chroma.from_documents(
        chunks,
        embeddings,
        persist_directory=CHROMA_PATH,
        collection_name=session_id
    )

    print(f"  Stored in collection: {session_id}")
    return len(chunks)