import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

CHROMA_PATH = "./chroma_db"
DATA_PATH = "../data"

def ingest_pdf(pdf_path: str):
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

    print("  Generating embeddings (first run downloads model ~90MB)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )

    vectorstore = Chroma.from_documents(
        chunks,
        embeddings,
        persist_directory=CHROMA_PATH
    )
    print(f"  Stored in ChromaDB at {CHROMA_PATH}")
    return len(chunks)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <path_to_pdf>")
        sys.exit(1)
    count = ingest_pdf(sys.argv[1])
    print(f"\nDone! {count} chunks ingested.")