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

STRICT_PROMPT_TEMPLATE = """
You are an expert, helpful assistant. Answer the question thoroughly and completely using ONLY the context provided below.
If the answer is not in the context, say "I don't have enough information to answer that from this document."

Provide a comprehensive, well-structured explanation using markdown. Feel free to use lists, bold text, and paragraphs to make the answer clear, easy to read, and detailed.
For every main fact or topic you describe, cite the source page(s) (e.g., "[Page X]" or "(Page X)") where the information was found in the context.

Context:
{context}

Question:
{question}

Answer:
"""

GENERAL_PROMPT_TEMPLATE = """
You are an expert, helpful assistant. Answer the question thoroughly and completely.
You should prioritize using the context provided below to answer the question, citing page numbers (e.g., "[Page X]" or "(Page X)") where appropriate.

If the context does not contain enough information to answer the question, you MUST answer the question using your general knowledge. When answering from general knowledge, you MUST start your response with a brief warning wrapped in [NO_DOC_CONTEXT]...[/NO_DOC_CONTEXT] tags explaining why the document context was insufficient (e.g., "[NO_DOC_CONTEXT]I don't have enough information to answer that from this document. The provided text focuses on automotive engineering and does not contain any information about X.[/NO_DOC_CONTEXT]"). Then, provide the general knowledge answer.

Provide a comprehensive, well-structured explanation using markdown. Feel free to use lists, bold text, and paragraphs to make the answer clear, easy to read, and detailed.

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

def get_chain(session_id: str, restrict_to_pdf: bool = True):
    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings_model,
        collection_name=session_id  # ONLY this session's chunks
    )

    # Use hybrid with a larger k (e.g. 15) for reranking candidates
    underlying_retriever, _ = get_hybrid_retriever(session_id, k=15)
    retriever = RerankingRetriever(underlying_retriever=underlying_retriever, top_k=6)

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.2
    )

    template = STRICT_PROMPT_TEMPLATE if restrict_to_pdf else GENERAL_PROMPT_TEMPLATE

    prompt = PromptTemplate(
        template=template,
        input_variables=["context", "question"]
    )

    # The chain now accepts the context directly to prevent running retrieval and reranking twice
    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    return retriever, chain


def ask(question: str, session_id: str, chat_history: list = [], restrict_to_pdf: bool = True) -> dict:
    retriever, chain = get_chain(session_id, restrict_to_pdf)

    # Build history context
    history_text = ""
    for msg in chat_history[-4:]:
        history_text += f"Human: {msg['question']}\nAssistant: {msg['answer']}\n"

    full_question = f"{history_text}Human: {question}" if history_text else question

    # Detect if the query is a global/summary query
    is_global = any(
        kw in question.lower()
        for kw in [
            "summarize", "summary", "overview", "all the topics", 
            "explain all", "whole document", "entire document", 
            "what is this pdf about", "what is this document about",
            "topics covered in this pdf", "topics covered", "table of contents"
        ]
    )

    if is_global:
        # Fetch up to 25 chunks from Chroma to cover the whole document
        vectorstore = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=embeddings_model,
            collection_name=session_id
        )
        try:
            data = vectorstore._collection.get(limit=25)
            # Convert to Document format
            from langchain_core.documents import Document
            source_docs = [
                Document(page_content=text, metadata=meta)
                for text, meta in zip(data["documents"], data["metadatas"])
            ]
            print(f"  Global query detected: retrieved {len(source_docs)} raw chunks representing the whole document.")
        except Exception as e:
            print(f"  Error loading global chunks: {e}. Falling back to standard retriever.")
            source_docs = retriever.invoke(question)
    else:
        # Retrieve and rerank candidate documents once
        source_docs = retriever.invoke(question)
    
    # Sort source documents chronologically by page number
    source_docs = sorted(source_docs, key=lambda d: d.metadata.get('page', 0) if isinstance(d.metadata.get('page'), int) else 0)

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