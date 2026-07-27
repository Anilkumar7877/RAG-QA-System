import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

IS_VERCEL = os.getenv("VERCEL") is not None
CHROMA_PATH = "/tmp/chroma_db" if IS_VERCEL else os.getenv("CHROMA_PATH", "./chroma_db")

def get_relevant_chunks(query: str, k: int = 5):
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings
    )
    
    results = vectorstore.similarity_search_with_score(query, k=k)
    
    return [
        {
            "content": doc.page_content,
            "source": doc.metadata.get("source", "unknown"),
            "page": doc.metadata.get("page", "?"),
            "score": round(float(score), 4)
        }
        for doc, score in results
    ]

if __name__ == "__main__":
    query = input("Enter your query: ")
    chunks = get_relevant_chunks(query)
    
    print(f"\nTop {len(chunks)} relevant chunks:\n")
    for i, chunk in enumerate(chunks, 1):
        print(f"--- Chunk {i} (score: {chunk['score']}, page: {chunk['page']}) ---")
        print(chunk["content"])
        print()
