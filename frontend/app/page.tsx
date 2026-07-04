"use client";
import { useState, useRef } from "react";
import axios from "axios";

const API = "http://localhost:8000";

interface Source {
  page: number;
  source: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<any>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus("Uploading...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/ingest`, formData);
      setSessionId(res.data.session_id);
      setUploadStatus(`✅ ${res.data.filename} ingested — ${res.data.chunks} chunks`);
      const statsRes = await axios.get(`${API}/stats/${res.data.session_id}`);
      setStats(statsRes.data);
    } catch {
      setUploadStatus("❌ Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk() {
    if (!question.trim() || loading) return;
    if (!sessionId) {
      alert("Please upload a PDF first.");
      return;
    }
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    try {
      const history = messages
        .filter((_, i) => i % 2 === 0)
        .map((msg, i) => ({
          question: msg.content,
          answer: messages[i * 2 + 1]?.content || ""
        }));

      const res = await axios.post(`${API}/query`, {
        question,
        session_id: sessionId,
        chat_history: history
      });
      const botMsg: Message = {
        role: "assistant",
        content: res.data.answer,
        sources: res.data.sources,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">RAG Document Q&A</h1>
      <p className="text-gray-400 mb-8">Upload a PDF and ask questions about it</p>

      {/* Upload Panel */}
      <div className="w-full max-w-2xl bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-3">Upload PDF</h2>
        <div
          className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-gray-400">Click to upload a PDF</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
        {uploadStatus && (
          <p className="mt-3 text-sm text-green-400">{uploadStatus}</p>
        )}
        {uploading && (
          <p className="mt-2 text-sm text-yellow-400">Processing chunks...</p>
        )}
      </div>

      {sessionId && stats && (
        <div className="w-full max-w-2xl bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Pipeline Metrics</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400">Chunks Indexed</p>
              <p className="text-2xl font-bold text-blue-400">{stats.chunks}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400">Retrieval Mode</p>
              <p className="text-sm font-medium text-green-400">Hybrid BM25 + Semantic</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400">Re-ranking</p>
              <p className="text-sm font-medium text-purple-400">Cross-Encoder Active</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400">LLM</p>
              <p className="text-sm font-medium text-yellow-400">{stats.llm}</p>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-400 mb-3">RAGAS Baseline Scores</h3>
          <div className="space-y-2">
            {[
              { label: "Faithfulness", value: stats.ragas_baseline.faithfulness },
              { label: "Answer Relevancy", value: stats.ragas_baseline.answer_relevancy },
              { label: "Context Precision", value: stats.ragas_baseline.context_precision },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-white">{(value * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Window */}
      <div className="w-full max-w-2xl bg-gray-900 rounded-xl border border-gray-800 flex flex-col" style={{ minHeight: "400px" }}>
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-96">
          {messages.length === 0 && (
            <p className="text-gray-600 text-center mt-16">Ask a question about your document...</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-lg rounded-xl px-4 py-3 text-sm ${msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-100"
                }`}>
                <p>{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400">Sources:</p>
                    {[...new Set(msg.sources.map((s) => s.page))].map((page) => (
                      <span key={page} className="text-xs bg-gray-700 rounded px-2 py-0.5 mr-1">
                        Page {page}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-400">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 flex gap-3">
          <input
            className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Ask
          </button>
        </div>
      </div>
    </main>
  );
}