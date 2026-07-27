import os
from typing import List
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from pydantic import ConfigDict

IS_VERCEL = os.getenv("VERCEL") is not None

# Dynamically import sentence_transformers if available.
# On Vercel, we omit torch/sentence-transformers to stay under size limits.
reranker = None
if not IS_VERCEL:
    try:
        from sentence_transformers import CrossEncoder
        reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        print("Successfully loaded MS-MARCO CrossEncoder reranker locally.")
    except ImportError:
        print("sentence-transformers not installed. Reranking will run in bypass mode.")

def rerank(query: str, docs: list, top_k: int = 3) -> list:
    if not docs:
        return docs
    
    # If on Vercel or model failed to load, fall back to bypass
    if reranker is None:
        print(f"  [Rerank Bypass] keeping top {min(len(docs), top_k)} chunks without cross-encoder.")
        return docs[:top_k]
    
    try:
        pairs = [[query, doc.page_content] for doc in docs]
        scores = reranker.predict(pairs)
        
        # Sort by score descending, return top_k
        scored_docs = sorted(zip(scores, docs), reverse=True)
        
        print(f"  Re-ranking {len(docs)} chunks -> keeping top {top_k}")
        for score, doc in scored_docs[:top_k]:
            print(f"  Score {score:.4f} | Page {doc.metadata.get('page', '?')}")
        
        return [doc for _, doc in scored_docs[:top_k]]
    except Exception as e:
        print(f"  Reranker prediction error: {e}. Falling back to default list slicing.")
        return docs[:top_k]

class RerankingRetriever(BaseRetriever):
    underlying_retriever: BaseRetriever
    top_k: int = 3

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun = None
    ) -> List[Document]:
        docs = self.underlying_retriever.invoke(query)
        return rerank(query, docs, top_k=self.top_k)
