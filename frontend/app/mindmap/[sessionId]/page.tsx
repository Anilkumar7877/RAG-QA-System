"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import MindMap from "../../components/MindMap";

const API = "http://localhost:8000";

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
    <main className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header Navigation */}
      <header className="px-6 py-4 bg-gray-900/50 backdrop-blur border-b border-gray-800 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            href={`/?session_id=${sessionId}`}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition group"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform duration-200">
              ←
            </span>
            Back to Chat
          </Link>
          <span className="h-4 w-[1px] bg-gray-800" />
          <h1 className="text-md font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Interactive Concept Map
          </h1>
        </div>

        {mindmap && (
          <div className="text-xs text-gray-400">
            Session: <code className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">{sessionId}</code>
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
              <h2 className="text-lg font-medium text-gray-200">Generating Knowledge Graph</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Gemini is parsing the key concepts and relationships from your document chunks...
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-red-950/20 border border-red-500/30 rounded-xl p-6 text-center shadow-xl">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-xl font-bold">
                ⚠
              </div>
              <h3 className="text-md font-semibold text-red-200">Generation Error</h3>
              <p className="text-sm text-red-400/80 mt-2">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={fetchMindMap}
                  className="bg-gray-800 hover:bg-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Retry Request
                </button>
                <Link
                  href={`/?session_id=${sessionId}`}
                  className="bg-red-600 hover:bg-red-500 text-xs font-semibold px-4 py-2 rounded-lg transition"
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
