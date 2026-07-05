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
      {
        accent: "bg-gradient-to-r from-blue-500 to-cyan-400",
        glow: "hover:shadow-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/30",
        hoverBorder: "hover:border-blue-500/60",
      },
      {
        accent: "bg-gradient-to-r from-purple-500 to-pink-400",
        glow: "hover:shadow-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/30",
        hoverBorder: "hover:border-purple-500/60",
      },
      {
        accent: "bg-gradient-to-r from-emerald-500 to-teal-400",
        glow: "hover:shadow-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
        hoverBorder: "hover:border-emerald-500/60",
      },
      {
        accent: "bg-gradient-to-r from-amber-500 to-orange-450",
        glow: "hover:shadow-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/30",
        hoverBorder: "hover:border-amber-500/60",
      },
      {
        accent: "bg-gradient-to-r from-rose-500 to-pink-500",
        glow: "hover:shadow-rose-500/10",
        text: "text-rose-400",
        border: "border-rose-500/30",
        hoverBorder: "hover:border-rose-500/60",
      },
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
            SUMMARY CARDS
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
          <div className="mx-auto w-full p-8 flex flex-col gap-8 animate-fade-in pb-16">
            {/* Title Banner */}
            <div className="bg-gradient-to-r from-slate-900/80 to-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                Document Summary
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-4 font-sans leading-tight tracking-tight">
                {summaryData.title}
              </h2>
              <p className="text-sm md:text-base text-slate-450 mt-2 font-sans max-w-2xl leading-relaxed">
                A highly-curated structured analysis highlighting {summaryData.topics.length} core themes synthesized from your uploaded PDF.
              </p>
            </div>

            {/* Grid of Cards - 2 Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {summaryData.topics.map((t, idx) => {
                const theme = getCardTheme(idx);
                return (
                  <div
                    key={idx}
                    className={`bg-slate-900/60 backdrop-blur-xl border ${theme.border} ${theme.hoverBorder} ${theme.glow} rounded-3xl p-8 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 shadow-2xl shadow-black/40 flex flex-col relative overflow-hidden group`}
                  >
                    {/* Accent top gradient line */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.accent}`} />

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mt-1">
                      <h3 className="text-lg md:text-xl font-extrabold text-white leading-snug tracking-tight font-sans">
                        {t.topic}
                      </h3>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800/80 shadow-inner shrink-0 ${theme.text}`}>
                        0{idx + 1}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-sm md:text-base text-slate-300/90 leading-relaxed mt-4 flex-1 font-sans">
                      {t.summary}
                    </p>

                    <div className="h-[1px] bg-slate-850 my-6 shrink-0" />

                    {/* Key Points */}
                    <div className="mb-6">
                      <h4 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-3 font-sans">
                        Key Takeaways
                      </h4>
                      <ul className="space-y-3">
                        {t.key_points.map((point, kIdx) => (
                          <li key={kIdx} className="text-sm md:text-base text-slate-300 flex items-start gap-3 leading-relaxed">
                            <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${theme.accent}`} />
                            <span className="font-sans text-slate-350">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Page references */}
                    {t.page_references && t.page_references.length > 0 && (
                      <div className="mt-auto pt-4 border-t border-slate-850 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1 select-none">
                          References:
                        </span>
                        {t.page_references.map((ref, rIdx) => (
                          <span
                            key={rIdx}
                            className="bg-slate-950/60 border border-slate-800/80 text-slate-300 text-xs font-semibold px-3 py-1 rounded-lg font-mono shadow-sm"
                          >
                            Page {ref}
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
