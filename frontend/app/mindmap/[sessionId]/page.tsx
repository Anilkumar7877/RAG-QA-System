"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import MindMap from "../../components/MindMap";

const API = "/api";

export default function MindMapPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [mindmap, setMindmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMindMap = () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    axios
      .get(`${API}/mindmap/${sessionId}`)
      .then((res) => {
        setMindmap(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch mindmap", err);
        setError(
          "Failed to generate document mind map. The LLM response could be malformed, or the session might have expired."
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMindMap();
  }, [sessionId]);

  return (
    <main className="h-screen bg-[#070b13] text-white flex flex-col overflow-hidden font-sans">
      {/* Header Navigation */}
      <header className="px-6 py-4 bg-[#0f172a]/40 backdrop-blur border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-50 select-none">
        <div className="flex items-center gap-4">
          <Link
            href={`/?session_id=${sessionId}`}
            title="Back to Chat"
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-md group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.6} stroke="currentColor" className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform duration-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <span className="h-4 w-[1px] bg-slate-800" />
          <h1 className="text-md font-semibold text-white">
            Interactive Concept Map
          </h1>
        </div>

        {mindmap && (
          <div className="flex items-center gap-4">
            <Link
              href={`/summary/${sessionId}`}
              className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all"
            >
              View Summary Cards ➔
            </Link>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col relative min-h-0">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {/* Elegant Custom Spinner */}
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-200">Generating Knowledge Graph</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Gemini is parsing the key concepts and relationships from your document chunks...
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-xl">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-xl font-bold">
                ⚠
              </div>
              <h3 className="text-md font-semibold text-slate-200">Generation Error</h3>
              <p className="text-sm text-red-400/80 mt-2">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={fetchMindMap}
                  className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Retry Request
                </button>
                <Link
                  href={`/?session_id=${sessionId}`}
                  className="bg-red-650 hover:bg-red-600 text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Return to Chat
                </Link>
              </div>
            </div>
          </div>
        )}

        {mindmap && !loading && !error && (
          <div className="flex-1 w-full min-h-0 relative animate-fade-in">
            <MindMap data={mindmap} />
          </div>
        )}
      </div>
    </main>
  );
}
