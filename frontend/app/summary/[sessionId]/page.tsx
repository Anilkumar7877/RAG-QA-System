"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";

const API = "http://localhost:8000";

interface TopicSummary {
  topic: string;
  summary: string;
  key_points: string[];
  page_references: (number | string)[];
}

interface SummaryData {
  title: string;
  topics: TopicSummary[];
}

export default function SummaryPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    axios
      .get(`${API}/summary/${sessionId}`)
      .then((res) => {
        setSummaryData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch summary cards", err);
        setError(
          "Failed to generate summary cards. The LLM response could be malformed, or the session might have expired."
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSummary();
  }, [sessionId]);

  // A helper function to assign a unique border/text gradient to each card index
  const getCardTheme = (index: number) => {
    const themes = [
      { border: "border-t-blue-500", text: "text-blue-400", bg: "from-blue-500/5 to-transparent" },
      { border: "border-t-purple-500", text: "text-purple-400", bg: "from-purple-500/5 to-transparent" },
      { border: "border-t-emerald-500", text: "text-emerald-400", bg: "from-emerald-500/5 to-transparent" },
      { border: "border-t-amber-500", text: "text-amber-400", bg: "from-amber-500/5 to-transparent" },
      { border: "border-t-rose-500", text: "text-rose-400", bg: "from-rose-500/5 to-transparent" },
    ];
    return themes[index % themes.length];
  };

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
            Document Summary Cards
          </h1>
        </div>

        {summaryData && (
          <div className="flex items-center gap-4">
            <Link
              href={`/mindmap/${sessionId}`}
              className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all"
            >
              View Concept Map ➔
            </Link>
          </div>
        )}
      </header>

      {/* Main Content Scroll Area */}
      <div className="flex-1 w-full overflow-y-auto relative min-h-0">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            {/* Custom Spinner */}
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-200 font-sans">Synthesizing Document Summary</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm font-sans leading-relaxed">
                Gemini is extracting major themes and key points to structure your topic cards...
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-xl">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-xl font-bold">
                ⚠
              </div>
              <h3 className="text-md font-semibold text-slate-200">Extraction Error</h3>
              <p className="text-sm text-slate-400 mt-2">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={fetchSummary}
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

        {summaryData && !loading && !error && (
          <div className="max-w-6xl mx-auto w-full p-8 flex flex-col gap-6 animate-fade-in">
            {/* Title Banner */}
            <div className="bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl p-6 mb-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                Document Title
              </span>
              <h2 className="text-2xl font-bold text-white mt-3 font-sans leading-tight">
                {summaryData.title}
              </h2>
              <p className="text-xs text-slate-450 mt-1 font-sans">
                A structured breakdown of {summaryData.topics.length} core topics extracted from your document chunks.
              </p>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {summaryData.topics.map((t, idx) => {
                const theme = getCardTheme(idx);
                return (
                  <div
                    key={idx}
                    className={`bg-slate-900/40 backdrop-blur border border-slate-800/80 border-t-4 ${theme.border} rounded-2xl p-6 hover:border-slate-700 hover:scale-[1.01] transition-all duration-300 shadow-xl shadow-black/25 flex flex-col`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-md font-bold text-white leading-snug font-sans">
                        {t.topic}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-850 border border-slate-800 ${theme.text}`}>
                        0{idx + 1}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-slate-300 leading-relaxed mt-3 flex-1 font-sans">
                      {t.summary}
                    </p>

                    <div className="h-[1px] bg-slate-800/60 my-4 shrink-0" />

                    {/* Key Points */}
                    <div className="mb-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-sans">
                        Key Takeaways
                      </h4>
                      <ul className="space-y-2">
                        {t.key_points.map((point, kIdx) => (
                          <li key={kIdx} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                            <span className="text-indigo-400 mt-1 select-none">•</span>
                            <span className="font-sans">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Page references */}
                    {t.page_references && t.page_references.length > 0 && (
                      <div className="mt-auto pt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-medium text-slate-500 mr-1 select-none">
                          Sources:
                        </span>
                        {t.page_references.map((ref, rIdx) => (
                          <span
                            key={rIdx}
                            className="bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold px-2 py-0.5 rounded font-mono"
                          >
                            Pg. {ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
