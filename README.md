# 🚀 RAG Document Q&A System

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-black)
![LangChain](https://img.shields.io/badge/LangChain-RAG-orange)
![ChromaDB](https://img.shields.io/badge/ChromaDB-VectorDB-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

A production-grade **Retrieval-Augmented Generation (RAG)** application that enables users to upload PDF documents, interact with them through natural language conversations, view interactive concept mind-maps, and inspect topic-based summaries.

The system combines **hybrid lexical-semantic search**, **cross-encoder reranking**, **vector embeddings**, and **LLM-powered reasoning** to deliver accurate answers with **page-level citations**.

---

## 📸 Overview

Users can:

* Upload PDF documents
* Ask questions in natural language
* Receive context-aware answers with page-level citations
* Continue multi-turn conversations with isolated sessions
* **Interactive Concept Mind-Map:** Visualize relationships between terms, topics, and ideas.
* **Topic Summary Cards:** View a clean grid of synthesized topic breakdowns with key takeaways and page references.

---

## ⚡ Production-Grade Highlights (Recruiter Focus)
* **Response Caching (Zero Latency & Cost Optimization):** Automatically caches generated concept maps and topic summaries as session-based JSON. Duplicate visits load instantly, eliminating redundant LLM API calls and token consumption.
* **Global Model Caching:** Embeddings and retriever model instances are loaded once and globally cached in-memory, avoiding the expensive overhead of initializing weights on every incoming HTTP request.
* **Hybrid Retrieval (BM25 + Semantic Search):** Merges keyword-based BM25 lexical search with semantic dense vector search to capture both exact terminology and high-level concepts.
* **Cross-Encoder Re-ranking:** Integrates a secondary reranking step using the `ms-marco-MiniLM-L-6-v2` cross-encoder, optimizing retrieval precision before content reaches the LLM.

## 📊 RAG Evaluation & Metrics (Ragas Framework)
We benchmarked our RAG pipeline iterations using **Ragas** to ground design choices:

| Metric | Baseline | Hybrid Search | Re-ranked |
| :--- | :---: | :---: | :---: |
| **Faithfulness** (Factual alignment) | `81.5%` | **`100.0%`** | `86.7%` |
| **Context Precision** (Relevant context ranking) | `63.3%` | **`94.0%`** | `86.7%` |
| **Answer Relevancy** (Question focus) | **`73.6%`** | `69.2%` | `64.8%` |

---

## 🏗️ System Architecture

```text
                 ┌─────────────────────┐
                 │     Upload PDF      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      FastAPI        │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      PyMuPDF        │
                 │   Extract Content   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Document Chunking   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ HuggingFace Embed   │
                 │ all-MiniLM-L6-v2    │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      ChromaDB       │
                 │     Vector Store    │
                 └──────────┬──────────┘
                            │
 ────────────────────────────────────────────────────

User Question
      │
      ▼
Embed Query
      │
      ▼
Similarity Search (Top-K Chunks)
      │
      ▼
Gemini 2.5 Flash
      │
      ▼
Answer + Source Citations
      │
      ▼
Next.js Chat Interface
```

---

## ✨ Features

### 📄 PDF Intelligence
* Upload any text-based PDF
* Automatic document parsing
* Smart document chunking
* Metadata preservation

### 🔍 Semantic Search
* Vector-based retrieval
* Context-aware document understanding
* Top-K similarity search
* High-quality embedding generation

### 🤖 Conversational AI
* Powered by Gemini 2.5 Flash
* Multi-turn conversations
* Context retention
* Natural language responses

### 🧠 Concept & Topic Analytics
* **Visual Mind-Map:** An interactive concept hierarchy graph mapping topics to child concepts.
* **Sleek Summary Cards:** Glassmorphic layout showing concise summary paragraphs (1-2 sentences) and key bulleted takeaways (2-3 items of max 15 words) per major theme.

### 📌 Source Attribution
* Page-level citations
* Transparent answer generation
* Traceable document references

### 🔒 Session Isolation
* Independent document sessions
* No cross-document contamination
* Secure retrieval context

### 🧠 Conversation Memory
* Stores recent interactions
* Remembers last 4 exchanges
* Better contextual responses

---

## 🛠️ Tech Stack

| Category        | Technology                     |
| --------------- | ------------------------------ |
| Frontend        | Next.js + Tailwind CSS         |
| Backend         | FastAPI                        |
| LLM             | Gemini 2.5 Flash               |
| Framework       | LangChain LCEL                 |
| Embeddings      | HuggingFace `all-MiniLM-L6-v2` |
| Vector Database | ChromaDB                       |
| PDF Processing  | PyMuPDF                        |
| Language        | Python                         |

---

## 📂 Project Structure

```text
rag-qa-system/
│
├── backend/
│   ├── ingest.py
│   ├── retriever.py
│   ├── hybrid_retriever.py
│   ├── reranker.py
│   ├── chain.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── summary/[sessionId]/page.tsx
│   │   └── mindmap/[sessionId]/page.tsx
│   ├── public/
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/rag-qa-system.git

cd rag-qa-system
```

---

## Backend Setup

### Create Virtual Environment

```bash
cd backend

python -m venv venv
```

### Activate Environment

**Windows**

```bash
venv\Scripts\activate
```

**Linux / macOS**

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment Variables

Create a `.env` file in the `backend` folder:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Start Backend Server

```bash
uvicorn main:app --reload
```

Backend runs on:

```text
http://localhost:8000
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| ------ | --------- | ----------------------- |
| GET | `/health` | Server health check |
| POST | `/ingest` | Upload and index PDF |
| POST | `/query` | Query uploaded document |
| GET | `/mindmap/{session_id}` | Generate/fetch cached mind map JSON |
| GET | `/summary/{session_id}` | Generate/fetch cached summary JSON |

---

## 📈 RAG Pipeline

```text
PDF
 │
 ▼
Text Extraction
 │
 ▼
Chunking
 │
 ▼
Embeddings
 │
 ▼
ChromaDB Storage
 │
 ▼
User Query
 │
 ▼
Similarity Search & BM25 Keyword Hybrid Search
 │
 ▼
Cross-Encoder Reranking
 │
 ▼
Retrieved Context
 │
 ▼
Gemini 2.5 Flash
 │
 ▼
Answer + Citations
```

---

## 📜 License

This project is licensed under the MIT License.
