"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchChallenges,
  submitChallenge,
  CodingChallenge,
  ChallengeResult,
} from "@/lib/api/education";
import { AITutorPanel } from "@/components/AITutorPanel";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Lightbulb,
  Loader2,
  Code2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function ChallengesContent() {
  const searchParams = useSearchParams();

  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [currentChallenge, setCurrentChallenge] = useState<CodingChallenge | null>(null);
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");

  const selectChallenge = (ch: CodingChallenge) => {
    setSelectedId(ch.id);
    setCurrentChallenge(ch);
    setCode(ch.starter_code);
    setResult(null);
    setRevealedHints(0);
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const list = await fetchChallenges();
        if (!ignore) {
          setChallenges(list);
          const queryId = searchParams.get("id");
          const initial = list.find((c) => c.id === queryId) || list[0];
          if (initial) {
            setSelectedId(initial.id);
            setCurrentChallenge(initial);
            setCode(initial.starter_code);
          }
        }
      } catch {
        if (!ignore) setChallenges([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [searchParams]);


  const handleSubmit = async () => {
    if (!currentChallenge || evaluating) return;
    setEvaluating(true);
    setResult(null);
    try {
      const res = await submitChallenge(currentChallenge.id, code);
      setResult(res);
      if (res.passed) {
        // Update local status
        setChallenges((prev) =>
          prev.map((c) => (c.id === currentChallenge.id ? { ...c, passed: true, high_score: 100 } : c))
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to evaluate challenge.";
      setResult({
        challenge_id: currentChallenge.id,
        passed: false,
        score: 0,
        feedback: msg,
        probabilities: {},
        counts: {},
        error: msg,
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleRevealNextHint = () => {
    if (!currentChallenge) return;
    if (revealedHints < currentChallenge.hints.length) {
      setRevealedHints((prev) => prev + 1);
    }
  };

  const triggerAI = (promptText: string) => {
    setAiPrompt(promptText);
    setAiPanelOpen(true);
  };

  const chartData = result?.probabilities
    ? Object.entries(result.probabilities).map(([state, prob]) => ({
        state: `|${state}⟩`,
        probability: Math.round(prob * 1000) / 10,
        count: result.counts[state] || 0,
      }))
    : [];

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-20">
      {/* Header Banner */}
      <div className="border-b border-emerald-100 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                Quantum Coding Arena
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Interactive Coding Challenges
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl mt-1">
                Construct quantum circuits to solve algorithmic problems. Submissions are verified against live Qiskit Aer Monte Carlo simulation distributions.
              </p>
            </div>

            {/* Quick stats badge */}
            <div className="flex items-center gap-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Completed:</span>
              <span className="text-xl font-extrabold text-slate-900">
                {challenges.filter((c) => c.passed).length} / {challenges.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Loading quantum challenges...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar: Challenges List */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
                Available Challenges ({challenges.length})
              </div>
              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {challenges.map((ch, idx) => {
                  const isSelected = ch.id === selectedId;
                  const diffColor =
                    ch.difficulty === "Beginner"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : ch.difficulty === "Intermediate"
                      ? "text-amber-700 bg-amber-50 border-amber-200"
                      : "text-purple-700 bg-purple-50 border-purple-200";

                  return (
                    <button
                      key={ch.id}
                      onClick={() => selectChallenge(ch)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-white border-emerald-500 shadow-md ring-1 ring-emerald-400"
                          : "bg-white/80 border-slate-200 hover:border-emerald-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffColor}`}>
                            {ch.difficulty}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                          {ch.title}
                        </h4>
                      </div>

                      {ch.passed && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Challenge Details & Code Editor */}
            {currentChallenge && (
              <div className="lg:col-span-8 space-y-6">
                {/* Challenge Description Card */}
                <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {currentChallenge.title}
                    </h2>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        currentChallenge.difficulty === "Beginner"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : currentChallenge.difficulty === "Intermediate"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-purple-50 text-purple-800 border-purple-200"
                      }`}
                    >
                      {currentChallenge.difficulty}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {currentChallenge.description}
                  </p>

                  {/* Objective */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs">
                    <span className="font-bold text-emerald-900 block mb-0.5">🎯 Challenge Objective:</span>
                    <span className="text-emerald-800">{currentChallenge.objective}</span>
                  </div>

                  {/* Progressive Hints Section */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Progressive Hints ({revealedHints}/{currentChallenge.hints.length})
                      </div>

                      {revealedHints < currentChallenge.hints.length ? (
                        <button
                          onClick={handleRevealNextHint}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          Reveal Hint Level {revealedHints + 1}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">All hints revealed</span>
                      )}
                    </div>

                    {revealedHints > 0 && (
                      <div className="mt-3 space-y-2">
                        {currentChallenge.hints.slice(0, revealedHints).map((hint, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900"
                          >
                            <span className="font-bold">Level {i + 1}:</span> {hint}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Code Editor & Verification Card */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-emerald-400" />
                      <span className="font-mono text-slate-200">solution.py</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => triggerAI(`Give me guidance for the challenge: ${currentChallenge.title}`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                      >
                        <Sparkles className="h-3 w-3 text-emerald-400" />
                        AI Hint
                      </button>

                      <button
                        onClick={() => setCode(currentChallenge.starter_code)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                        title="Reset code"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="p-4 bg-transparent font-mono text-xs sm:text-sm">
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      spellCheck={false}
                      rows={10}
                      className="w-full bg-transparent text-emerald-200 focus:outline-hidden resize-none leading-6 font-mono"
                    />
                  </div>

                  {/* Submission Row */}
                  <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Tested via Qiskit Aer Simulator</span>
                    <button
                      onClick={handleSubmit}
                      disabled={evaluating}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-98"
                    >
                      {evaluating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Simulating & Scoring...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-white" />
                          <span>Run & Submit Tests</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Evaluation Results Card */}
                {result && (
                  <div
                    className={`p-6 rounded-2xl border shadow-md transition-all ${
                      result.passed
                        ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                        : "bg-rose-50/80 border-rose-300 text-rose-950"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <XCircle className="h-6 w-6 text-rose-600" />
                        )}
                        <h3 className="text-base font-bold">
                          {result.passed ? "Challenge Completed!" : "Test Evaluation Failed"}
                        </h3>
                      </div>

                      <span className="text-sm font-extrabold px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
                        Score: {result.score}/100
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap mb-4">
                      {result.feedback}
                    </div>

                    {/* Chart if available */}
                    {chartData.length > 0 && (
                      <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 block mb-2">
                          Measured State Distribution
                        </span>
                        <div className="h-36 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                              <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                              <YAxis unit="%" tick={{ fontSize: 10 }} domain={[0, 100]} />
                              <Tooltip />
                              <Bar dataKey="probability" fill={result.passed ? "#059669" : "#e11d48"} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating AI Tutor Panel */}
      <AITutorPanel
        code={code}
        challengeId={currentChallenge?.id}
        initialPrompt={aiPrompt}
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
      />
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Loading Quantum Challenges...</p>
          </div>
        </div>
      }
    >
      <ChallengesContent />
    </Suspense>
  );
}
