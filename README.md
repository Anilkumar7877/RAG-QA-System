# 🚀 RAG Document Q&A System

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-black)
![LangChain](https://img.shields.io/badge/LangChain-RAG-orange)
![ChromaDB](https://img.shields.io/badge/ChromaDB-VectorDB-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

A production-grade **Retrieval-Augmented Generation (RAG)** application that enables users to upload PDF documents and interact with them through natural language conversations.

The system combines **semantic search**, **vector embeddings**, and **LLM-powered reasoning** to deliver accurate answers with **page-level citations**.

---

## 📸 Overview

Users can:

* Upload PDF documents
* Ask questions in natural language
* Receive context-aware answers
* View source page citations
* Continue multi-turn conversations
* Keep documents isolated per session

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
Groq Llama 3.3-70B
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

* Powered by Llama 3.3-70B via Groq
* Multi-turn conversations
* Context retention
* Natural language responses

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
| LLM             | Groq (Llama 3.3-70B)           |
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
│   ├── chain.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   └── page.tsx
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

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
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

| Method | Endpoint  | Description             |
| ------ | --------- | ----------------------- |
| GET    | `/health` | Server health check     |
| POST   | `/ingest` | Upload and index PDF    |
| POST   | `/query`  | Query uploaded document |

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
Similarity Search
 │
 ▼
Retrieved Context
 │
 ▼
Llama 3.3 (Groq)
 │
 ▼
Answer + Citations
```

---

## 📜 License

This project is licensed under the MIT License.

---

### ⭐ If you found this project useful, consider giving it a star!
