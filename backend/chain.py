import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from hybrid_retriever import get_hybrid_retriever
from reranker import RerankingRetriever

load_dotenv()

CHROMA_PATH = "./chroma_db"

# Cache embedding model globally to avoid loading it on every query
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

PROMPT_TEMPLATE = """
You are a helpful assistant. Answer the question using ONLY the context provided below.
If the answer is not in the context, say "I don't have enough information to answer that from this document."
Always mention which page the information came from.

Context:
{context}

Question:
{question}

Answer:
"""

def format_docs(docs):
    return "\n\n".join(
        f"[Page {doc.metadata.get('page', '?')}]: {doc.page_content}"
        for doc in docs
    )

def get_chain(session_id: str):
    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings_model,
        collection_name=session_id  # ONLY this session's chunks
    )

    # Use hybrid with a larger k (e.g. 10) for reranking candidates
    underlying_retriever, _ = get_hybrid_retriever(session_id, k=10)
    retriever = RerankingRetriever(underlying_retriever=underlying_retriever, top_k=3)

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.2
    )

    prompt = PromptTemplate(
        template=PROMPT_TEMPLATE,
        input_variables=["context", "question"]
    )

    # The chain now accepts the context directly to prevent running retrieval and reranking twice
    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    return retriever, chain


def ask(question: str, session_id: str, chat_history: list = []) -> dict:
    retriever, chain = get_chain(session_id)

    # Build history context
    history_text = ""
    for msg in chat_history[-4:]:
        history_text += f"Human: {msg['question']}\nAssistant: {msg['answer']}\n"

    full_question = f"{history_text}Human: {question}" if history_text else question

    # Retrieve and rerank candidate documents once
    source_docs = retriever.invoke(question)
    
    # Format document contexts and invoke the chain
    context = format_docs(source_docs)
    answer = chain.invoke({"context": context, "question": full_question})

    sources = [
        {
            "page": doc.metadata.get("page", "?"),
            "source": os.path.basename(doc.metadata.get("source", "unknown"))
        }
        for doc in source_docs
    ]

    return {
        "answer": answer,
        "sources": sources
    }