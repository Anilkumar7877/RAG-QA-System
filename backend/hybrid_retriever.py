from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
try:
    from langchain_classic.retrievers import EnsembleRetriever
except ImportError:
    from langchain.retrievers import EnsembleRetriever

CHROMA_PATH = "./chroma_db"

# Cache embedding model globally to avoid loading it on every query
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_hybrid_retriever(session_id: str, docs=None, k: int = 3):
    # Semantic retriever
    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings_model,
        collection_name=session_id
    )
    semantic_retriever = vectorstore.as_retriever(search_kwargs={"k": k})

    # BM25 retriever needs raw documents
    if docs is None:
        # Fetch all docs from collection
        collection = vectorstore._collection.get()
        from langchain_core.documents import Document
        docs = [
            Document(
                page_content=text,
                metadata=meta
            )
            for text, meta in zip(
                collection["documents"],
                collection["metadatas"]
            )
        ]

    bm25_retriever = BM25Retriever.from_documents(docs)
    bm25_retriever.k = k

    # Ensemble: 30% BM25 + 70% semantic
    hybrid = EnsembleRetriever(
        retrievers=[bm25_retriever, semantic_retriever],
        weights=[0.3, 0.7]
    )

    return hybrid, docs