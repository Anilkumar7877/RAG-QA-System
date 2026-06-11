import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv()
print("API KEY:", os.getenv("GROQ_API_KEY"))
CHROMA_PATH = "./chroma_db"

PROMPT_TEMPLATE = """
You are a helpful assistant. Answer the question using ONLY the context provided below.
If the answer is not in the context, say "I don't have enough information to answer that."
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

def get_chain():
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings
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


def ask(question: str) -> dict:
    retriever, chain = get_chain()

    # Get source docs separately
    source_docs = retriever.invoke(question)

    # Get answer
    answer = chain.invoke(question)

    sources = [
        {
            "page": doc.metadata.get("page", "?"),
            "source": doc.metadata.get("source", "unknown")
        }
        for doc in source_docs
    ]

    return {
        "answer": answer,
        "sources": sources
    }


if __name__ == "__main__":
    print("RAG Q&A Ready. Type 'exit' to quit.\n")
    while True:
        question = input("You: ")
        if question.lower() == "exit":
            break
        response = ask(question)
        print(f"\nAnswer: {response['answer']}")
        print(f"\nSources: {response['sources']}\n")