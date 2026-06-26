# RAG QA System: Issues Faced and Solutions

This document logs the major technical challenges encountered during the migration from Groq to Google Gemini, package configuration, performance optimization, and local environment setup, along with their respective solutions.

---

## 1️⃣ Embedding Model Initialization Latency (Slow Frontend Response)
* **Issue**: Sending a user query or uploading a PDF was extremely slow, taking 2–4 seconds per request even on localhost.
* **Cause**: In `chain.py`, `hybrid_retriever.py`, and `ingest.py`, the `HuggingFaceEmbeddings` model (`all-MiniLM-L6-v2`) was instantiated locally inside the query processing functions. This meant that PyTorch had to read, load, and initialize the model parameters from disk on every single API call.
* **Solution**: Moved the initialization of `HuggingFaceEmbeddings` to the global module scope at the top of the files. The model is now loaded exactly once when the FastAPI server imports the modules on startup. Successive queries and ingestions now run in milliseconds.

---

## 2️⃣ API Quota Exhaustion (429 ResourceExhausted Errors)
* **Issue**: Testing Gemini models returned `429 ResourceExhausted: You exceeded your current quota` errors, causing requests to fail.
* **Cause**: Free tier API keys have strict daily limits (e.g., 20 requests per day) for newer or preview models like `gemini-3.5-flash` or `gemini-2.5-flash`.
* **Solution**: Configured the LLM backend to use the lightweight **`gemini-3.1-flash-lite`** model, which has its own independent, higher-quota free-tier rate limits, successfully restoring full query and evaluation capabilities.

---

## 3️⃣ Ragas Evaluation Concurrency Floods
* **Issue**: Running the Ragas evaluation script hit rate limit errors and timed out.
* **Cause**: By default, Ragas fires evaluation metrics concurrently (in parallel). For a set of 5 test questions, this generated 40–50 parallel calls, immediately flooding and blocking the free-tier Gemini API endpoint.
* **Solution**: Limited the evaluation concurrency to 1 worker by importing `RunConfig` and passing it to the `evaluate()` function in `evaluate.py`:
  ```python
  from ragas.run_config import RunConfig
  
  run_config = RunConfig(max_workers=1)
  results = evaluate(
      dataset=dataset,
      metrics=[...],
      llm=evaluator_llm,
      embeddings=evaluator_embeddings,
      run_config=run_config,
  )
  ```

---

## 4️⃣ Outdated or Mismatched Global Python Packages
* **Issue**: Executing the evaluation script via `python evaluate.py` raised errors like `ImportError: cannot import name 'ContextOverflowError' from 'langchain_core.exceptions'`.
* **Cause**: The command was executing using the global system Python installation, which contained mismatched or outdated versions of `langchain-core` and `langchain-google-genai`.
* **Solution**: Run the script using the correct python executable residing inside the virtual environment:
  ```powershell
  .\venv\Scripts\python.exe evaluate.py
  ```

---

