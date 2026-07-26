"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import Link from "next/link";

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

type BlockType = 'paragraph' | 'list' | 'header' | 'space';

interface ListItem {
  text: string;
  indent: number;
  isOrdered: boolean;
}

interface Block {
  type: BlockType;
  level?: number;
  content?: string;
  items?: ListItem[];
}

const parseMarkdown = (text: string): Block[] => {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let currentList: Block | null = null;
  
  for (let line of lines) {
    const trimmed = line.trim();
    
    // Check for empty lines
    if (trimmed === "") {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: 'space' });
      continue;
    }
    
    // Check for headers
    const headerMatch = line.match(/^(#{1,4})\s+(.*)/);
    if (headerMatch) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({
        type: 'header',
        level: headerMatch[1].length,
        content: headerMatch[2]
      });
      continue;
    }
    
    // Check for list items
    const listMatch = line.match(/^(\s*)([*+-]|\d+\.)\s+(.*)/);
    if (listMatch) {
      const leadingSpaces = listMatch[1].length;
      const marker = listMatch[2];
      const content = listMatch[3];
      
      let indent = 0;
      if (leadingSpaces >= 6) {
        indent = 2;
      } else if (leadingSpaces >= 3) {
        indent = 1;
      }
      
      const isOrdered = /^\d+\./.test(marker);
      
      const newItem: ListItem = {
        text: content,
        indent: indent,
        isOrdered: isOrdered
      };
      
      if (currentList && currentList.type === 'list') {
        currentList.items?.push(newItem);
      } else {
        if (currentList) {
          blocks.push(currentList);
        }
        currentList = {
          type: 'list',
          items: [newItem]
        };
      }
      continue;
    }
    
    // Default: paragraph
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
    blocks.push({
      type: 'paragraph',
      content: line
    });
  }
  
  if (currentList) {
    blocks.push(currentList);
  }
  
  return blocks;
};

const renderInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const codeParts = part.split(/(`.*?`)/g);
    return codeParts.map((subPart, subIndex) => {
      if (subPart.startsWith("`") && subPart.endsWith("`")) {
        return (
          <code key={`${index}-${subIndex}`} className="bg-slate-900 text-pink-400 px-1 py-0.5 rounded font-mono text-[10px] border border-slate-800">
            {subPart.slice(1, -1)}
          </code>
        );
      }
      return subPart;
    });
  });
};

const MarkdownText = ({ text }: { text: string }) => {
  const blocks = parseMarkdown(text);
  
  return (
    <div className="space-y-1.5 font-sans text-xs text-slate-200">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'space':
            return <div key={idx} className="h-0.5" />;
          case 'header':
            if (block.level === 1) {
              return <h2 key={idx} className="text-xs font-bold text-white mt-2.5 mb-0.5 uppercase tracking-wider">{renderInline(block.content || "")}</h2>;
            } else if (block.level === 2) {
              return <h3 key={idx} className="text-xs font-semibold text-slate-100 mt-2 mb-0.5">{renderInline(block.content || "")}</h3>;
            } else {
              return <h4 key={idx} className="text-[11px] font-medium text-slate-200 mt-1.5 mb-0.5">{renderInline(block.content || "")}</h4>;
            }
          case 'list':
            return (
              <ul key={idx} className="space-y-1.5 my-1.5 list-none">
                {block.items?.map((item, itemIdx) => {
                  const listStyleType = item.isOrdered 
                    ? "decimal" 
                    : item.indent === 0 
                      ? "disc" 
                      : item.indent === 1 
                        ? "circle" 
                        : "square";
                  
                  const indentClass = item.indent === 0 
                    ? "ml-4" 
                    : item.indent === 1 
                      ? "ml-8 text-slate-300" 
                      : "ml-12 text-slate-400";
                  
                  return (
                    <li 
                      key={itemIdx} 
                      style={{ listStyleType }}
                      className={`list-item ${indentClass} leading-relaxed`}
                    >
                      {renderInline(item.text)}
                    </li>
                  );
                })}
              </ul>
            );
          case 'paragraph':
            return <p key={idx} className="leading-relaxed text-slate-200">{renderInline(block.content || "")}</p>;
          default:
            return null;
        }
      })}
    </div>
  );
};

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<any>(null);
  const [filename, setFilename] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (sid) {
      setSessionId(sid);
      axios
        .get(`${API}/stats/${sid}`)
        .then((res) => {
          setStats(res.data);
          if (res.data.filename) {
            setFilename(res.data.filename);
          }
        })
        .catch((err) => console.error("Failed to load stats for session", err));
    }
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus("Uploading and parsing document...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/ingest`, formData);
      const newSessionId = res.data.session_id;
      setSessionId(newSessionId);
      setFilename(res.data.filename);

      // Update URL with session_id parameter
      const nextUrl = `${window.location.pathname}?session_id=${newSessionId}`;
      window.history.pushState(null, "", nextUrl);

      setUploadStatus(`✅ ${res.data.filename} ingested — ${res.data.chunks} chunks`);
      const statsRes = await axios.get(`${API}/stats/${newSessionId}`);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
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

  if (sessionId) {
    return (
      <main className="h-screen w-screen bg-[#070b13] text-white flex overflow-hidden font-sans">
        {/* Left Side: Document Viewer */}
        <div className="w-1/2 h-full border-r border-slate-800/80 relative bg-slate-950 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-800 bg-[#0f172a]/40 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-300 truncate max-w-xs">{filename || "Document Viewer"}</span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">PDF SOURCE</span>
          </div>
          <div className="flex-1 min-h-0 w-full relative">
            {filename ? (
              <iframe
                src={`${API}/document/${filename}`}
                className="w-full h-full border-none block overflow-hidden"
                title="Uploaded PDF Document"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <div className="relative w-10 h-10 mb-3">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-800 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-slate-500 animate-spin" />
                </div>
                <div className="text-xs">Loading PDF document...</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: RAG Chat & Dashboard Panel */}
        <div className="w-1/2 h-full flex flex-col p-6 md:p-8 space-y-6 bg-[#070b13] overflow-y-auto minimal-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                RAG Document Q&A
              </h1>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">Active Session: {sessionId}</p>
            </div>
            {/* Quick action to upload a new document */}
            <button
              onClick={() => {
                setSessionId("");
                setStats(null);
                setFilename("");
                setMessages([]);
                window.history.pushState(null, "", window.location.pathname);
              }}
              className="text-xs bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all shadow-lg cursor-pointer"
            >
              Upload New PDF
            </button>
          </div>

          {/* Ingestion status card */}
          <div className="bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/20 shrink-0">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Ingestion Status</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-xs text-emerald-400/90 font-medium truncate">
                {uploadStatus || `Document chunks indexed and vector store ready.`}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* Mind Map Panel */}
              <Link
                href={`/mindmap/${sessionId}`}
                className="group p-4 bg-gradient-to-br from-indigo-950/20 to-slate-900/60 rounded-xl border border-indigo-500/10 hover:border-indigo-500/30 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between animate-fade-in"
              >
                <span className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">Concept Map ➔</span>
                <span className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Interactive, staggered knowledge graph</span>
              </Link>

              {/* Summary Cards Panel */}
              <Link
                href={`/summary/${sessionId}`}
                className="group p-4 bg-gradient-to-br from-purple-950/20 to-slate-900/60 rounded-xl border border-purple-500/10 hover:border-purple-500/30 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between animate-fade-in"
              >
                <span className="text-xs font-bold text-purple-300 group-hover:text-purple-200 transition-colors">Summary Cards ➔</span>
                <span className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Core takeaways & topic card breakdown</span>
              </Link>
            </div>
          </div>

          {/* Metrics */}
          {stats && (
            <div className="bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/20 shrink-0">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Pipeline Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-slate-850/40 rounded-xl p-3 border border-slate-800/40 flex flex-col justify-between">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Indexed Chunks</p>
                  <p className="text-xl font-bold text-blue-400 mt-2 font-mono">{stats.chunks}</p>
                </div>
                <div className="bg-slate-850/40 rounded-xl p-3 border border-slate-800/40 flex flex-col justify-between">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Retrieval Mode</p>
                  <p className="text-xs font-bold text-emerald-400 mt-2">Hybrid BM25</p>
                </div>
                <div className="bg-slate-850/40 rounded-xl p-3 border border-slate-800/40 flex flex-col justify-between">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Re-ranking</p>
                  <p className="text-xs font-bold text-purple-400 mt-2">Cross-Encoder</p>
                </div>
                <div className="bg-slate-850/40 rounded-xl p-3 border border-slate-800/40 flex flex-col justify-between">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Model</p>
                  <p className="text-xs font-bold text-amber-400 mt-2 truncate">Gemini 2.5</p>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">RAGAS Evaluation Scores</h3>
              <div className="space-y-3">
                {[
                  { label: "Faithfulness", value: stats.ragas_baseline.faithfulness, gradient: "from-emerald-500 to-teal-400" },
                  { label: "Answer Relevancy", value: stats.ragas_baseline.answer_relevancy, gradient: "from-blue-500 to-indigo-400" },
                  { label: "Context Precision", value: stats.ragas_baseline.context_precision, gradient: "from-purple-500 to-fuchsia-400" },
                ].map(({ label, value, gradient }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] mb-1 font-sans">
                      <span className="text-slate-400 font-medium">{label}</span>
                      <span className="text-slate-200 font-bold">{(value * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800/50 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${gradient} h-2 rounded-full`}
                        style={{ width: `${value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Window */}
          <div className="bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl flex flex-col min-h-[480px] shadow-xl overflow-hidden">
            {/* Header: Integrated Chat (Requirement 4) */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/50 shrink-0 select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-sans">
                Integrated Chat
              </h3>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 my-auto select-none">
                  <span className="text-2xl mb-2">💬</span>
                  <p className="text-slate-500 text-xs font-sans">
                    Ask questions about content, statistics, or structure of the uploaded PDF.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg ${msg.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none"
                    : "bg-slate-800/90 border border-slate-700/50 text-slate-100 rounded-tl-none"
                    }`}>
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                    ) : (
                      <MarkdownText text={msg.content} />
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sources</p>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(msg.sources.map((s) => s.page))].map((page) => (
                            <span key={page} className="text-[10px] bg-slate-750/80 border border-slate-700 text-slate-300 rounded px-2 py-0.5 font-mono">
                              Pg. {page}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-1.5 shadow-lg select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/20 flex gap-3">
              <input
                className="flex-1 bg-slate-850 border border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500 font-sans"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />
              <button
                onClick={handleAsk}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#070b13] text-white flex flex-col items-center justify-center p-6 md:p-12 font-sans relative overflow-y-auto minimal-scrollbar">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl flex flex-col items-center text-center z-10 select-none">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          RAG Document Q&A
        </h1>
        <p className="text-slate-400 text-sm md:text-base mt-3 max-w-md leading-relaxed font-sans">
          Upload any PDF report, manuscript, or textbook. Instant retrieval, structured concept mindmaps, and topic summary cards await you.
        </p>

        {/* Upload Dropzone */}
        <div className="w-full max-w-xl bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl p-8 mt-10 shadow-2xl shadow-black/45">
          <h2 className="text-md font-bold text-white mb-4 font-sans">Upload PDF Document</h2>
          <div
            className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-8 text-center cursor-pointer bg-slate-950/20 hover:bg-slate-900/20 transition-all duration-300 group"
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">📂</div>
            <p className="text-sm font-semibold text-slate-300">Click to select PDF file</p>
            <p className="text-xs text-slate-500 mt-1 font-sans">Max size 20MB. Document chunks will be parsed instantly.</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
          {uploadStatus && (
            <p className="mt-4 text-xs font-semibold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 py-2 px-3 rounded-lg animate-pulse">
              {uploadStatus}
            </p>
          )}
          {uploading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 py-2 px-3 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Processing and indexing vector embeddings...</span>
            </div>
          )}
        </div>

        {/* Feature Cards Grid (Static Highlights) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16 max-w-4xl text-left">
          <div className="p-5 bg-slate-900/20 border border-slate-800/50 rounded-2xl">
            <span className="text-xl">📊</span>
            <h3 className="text-sm font-bold text-slate-200 mt-2 font-sans">Deep Ingestion</h3>
            <p className="text-xs text-slate-500 mt-1 font-sans leading-relaxed">
              Splits PDFs into clean semantic chunks with metadata, calculating baseline RAGAS scores automatically.
            </p>
          </div>
          <div className="p-5 bg-slate-900/20 border border-slate-800/50 rounded-2xl">
            <span className="text-xl">🧬</span>
            <h3 className="text-sm font-bold text-slate-200 mt-2 font-sans">Interactive Concept Map</h3>
            <p className="text-xs text-slate-500 mt-1 font-sans leading-relaxed">
              Generates static, staggered D3 knowledge graphs mapping core topics and concepts without overlap.
            </p>
          </div>
          <div className="p-5 bg-slate-900/20 border border-slate-800/50 rounded-2xl">
            <span className="text-xl">🎴</span>
            <h3 className="text-sm font-bold text-slate-200 mt-2 font-sans">Topic Summary Cards</h3>
            <p className="text-xs text-slate-500 mt-1 font-sans leading-relaxed">
              Structures complex documents into summary theme cards containing key bullet takeaways and source page numbers.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}