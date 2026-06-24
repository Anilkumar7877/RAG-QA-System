import os
import json

from dotenv import load_dotenv
from datasets import Dataset

from ragas import evaluate

from ragas.metrics import (
    Faithfulness,
    ResponseRelevancy,
    LLMContextPrecisionWithoutReference,
)

from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from ragas.llms import LangchainLLMWrapper
from langchain_chroma import Chroma

from hybrid_retriever import get_hybrid_retriever
from chain import ask

load_dotenv()

TEST_QUESTIONS = [
    "What is embedded AI?",
    "What are the applications of embedded AI?",
    "What is model optimization in embedded AI?",
    "What are the computational foundations of embedded AI?",
    "What is edge AI?",
]

SESSION_ID = "session_68a859afadad"


def run_evaluation():

    print("Running RAG evaluation...\n")

    questions = []
    answers = []
    contexts = []

    # Embedding model
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )

    vectorstore = Chroma(
        persist_directory="./chroma_db",
        embedding_function=embeddings,
        collection_name=SESSION_ID
    )

    retriever, _ = get_hybrid_retriever(SESSION_ID)

    # Evaluation LLM
    evaluator_llm = LangchainLLMWrapper(
        ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0
        )
    )

    evaluator_embeddings = LangchainEmbeddingsWrapper(
        HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
    )

    for q in TEST_QUESTIONS:

        print(f"Q: {q}")

        result = ask(q, SESSION_ID)

        questions.append(q)
        answers.append(result["answer"])

        docs = retriever.invoke(q)

        contexts.append(
            [doc.page_content for doc in docs]
        )

        print(
            f"A: {result['answer'][:100]}...\n"
        )

    dataset = Dataset.from_dict(
        {
            "user_input": questions,
            "response": answers,
            "retrieved_contexts": contexts,
        }
    )

    results = evaluate(
        dataset=dataset,
        metrics=[
            Faithfulness(),
            ResponseRelevancy(),
            LLMContextPrecisionWithoutReference(),
        ],
        llm=evaluator_llm,
        embeddings=evaluator_embeddings,
    )

    df = results.to_pandas()
    scores = (
        df.select_dtypes(include=["number"])
        .mean()
        .to_dict()
    )
    print(df)
    print(df.columns)

    print("\n===== RAGAS RESULTS =====")
    print(
        json.dumps(
            scores,
            indent=2
        )
    )

    scores = {
        "faithfulness": results["faithfulness"],
        "answer_relevancy": results["answer_relevancy"],
        "context_precision": results["context_precision"],
        "mode": "hybrid"
    }
    with open("ragas_scores_hybrid.json", "w") as f:
        json.dump(scores, f, indent=2)

    print(
        "\nScores saved to ragas_scores_hybrid.json"
    )

    return scores


if __name__ == "__main__":
    run_evaluation()