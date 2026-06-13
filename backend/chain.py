import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

CHROMA_PATH = "./chroma_db"

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
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
        collection_name=session_id  # ONLY this session's chunks
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2
    )

    prompt = PromptTemplate(
        template=PROMPT_TEMPLATE,
        input_variables=["context", "question"]
    )

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
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

    source_docs = retriever.invoke(question)
    answer = chain.invoke(full_question)

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