import os
import json

from dotenv import load_dotenv
from datasets import Dataset

from ragas import evaluate
from ragas.run_config import RunConfig

from ragas.metrics import (
    Faithfulness,
    ResponseRelevancy,
    LLMContextPrecisionWithoutReference,
)

from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from ragas.llms import LangchainLLMWrapper
from langchain_chroma import Chroma

from chain import ask, get_chain

load_dotenv()

TEST_QUESTIONS = [
    "What landmark event in 1886 is widely recognized as the birth of the modern automobile, and who was responsible for it?",
    "How did Henry Ford's implementation of the moving assembly line in 1913 alter the manufacturing process and retail accessibility of the Model T?",
    "What are the four distinct engineering stages of a classic four-stroke internal combustion engine sequence, and what occurs during each?",
    "What are the three core mechanical systems that replace traditional internal combustion engine components in a Battery Electric Vehicle (BEV)?",
    "How does the concept of regenerative braking work in an electric vehicle, and what role does the power inverter play during this process?"
]

SESSION_ID = "session_9a3922822d5d"


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

    retriever, _ = get_chain(SESSION_ID)

    # Evaluation LLM
    evaluator_llm = LangchainLLMWrapper(
        ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            api_key=os.getenv("GEMINI_API_KEY"),
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

    run_config = RunConfig(max_workers=1)
    results = evaluate(
        dataset=dataset,
        metrics=[
            Faithfulness(),
            ResponseRelevancy(),
            LLMContextPrecisionWithoutReference(),
        ],
        llm=evaluator_llm,
        embeddings=evaluator_embeddings,
        run_config=run_config,
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

    mean_scores = {
        "faithfulness": scores.get("faithfulness"),
        "answer_relevancy": scores.get("answer_relevancy"),
        "context_precision": scores.get("llm_context_precision_without_reference"),
        "mode": "reranked"
    }
    with open("ragas_scores_reranked.json", "w") as f:
        json.dump(mean_scores, f, indent=2)

    print(
        "\nScores saved to ragas_scores_reranked.json"
    )

    return mean_scores


if __name__ == "__main__":
    run_evaluation()