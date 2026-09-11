"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAssessmentQuestions,
  submitAssessment,
  AssessmentQuestion,
  AssessmentResult,
} from "@/lib/api/education";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Trophy,
  Filter,
  Loader2,
  AlertCircle
} from "lucide-react";
import { MarkdownLatexRenderer } from "@/components/MarkdownLatexRenderer";

const TOPICS = [
  { id: "all", label: "All Topics" },
  { id: "qubits", label: "Qubits" },
  { id: "superposition", label: "Superposition" },
  { id: "gates", label: "Pauli & Phase Gates" },
  { id: "measurement", label: "Measurement" },
  { id: "entanglement", label: "Entanglement & Bell" },
  { id: "grover", label: "Grover's Algorithm" },
];

export default function AssessmentsPage() {
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, AssessmentResult>>({});

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchAssessmentQuestions(selectedTopic === "all" ? undefined : selectedTopic);
        if (!ignore) setQuestions(data);
      } catch {
        if (!ignore) setQuestions([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [selectedTopic]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (results[questionId]) return; // locked after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: String(optionIndex),
    }));
  };

  const handleSubmitQuestion = async (questionId: string) => {
    const answer = selectedAnswers[questionId];
    if (answer === undefined) return;

    setSubmitting((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await submitAssessment(questionId, answer);
      setResults((prev) => ({ ...prev, [questionId]: res }));
    } catch {
      alert("Failed to submit assessment answer.");
    } finally {
      setSubmitting((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // Score statistics
  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter((r) => r.is_correct).length;
  const scorePct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-20">
      {/* Top Header */}
      <div className="border-b border-emerald-100 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                Assessment Testing Center
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Quantum Knowledge Quizzes
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl mt-1">
                Verify your grasp of superposition, Pauli transformations, measurement collapse, Bell states, and Grover search with instant diagnostic feedback.
              </p>
            </div>

            {/* Live Score Tracker Badge */}
            <div className="flex items-center gap-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl px-5 py-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                  Session Score
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">{scorePct}%</span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({correctCount}/{answeredCount} correct)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Topic Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          {TOPICS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTopic === t.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Questions Stream */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Loading assessment questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8">
            <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-800">No questions found for this topic.</p>
            <p className="text-xs text-slate-500 mt-1">Try selecting &ldquo;All Topics&rdquo; above.</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {questions.map((q, idx) => {
              const res = results[q.id];
              const userSelection = selectedAnswers[q.id];
              const isSubmitting = submitting[q.id];

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border p-6 shadow-xs transition-all ${
                    res
                      ? res.is_correct
                        ? "border-emerald-300 ring-1 ring-emerald-200"
                        : "border-rose-300 ring-1 ring-rose-200"
                      : "border-emerald-100 hover:border-emerald-200"
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {q.topic} • {q.type.replace("_", " ")}
                      </span>
                    </div>

                    {res && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          res.is_correct
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {res.is_correct ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Correct
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-600" />
                            Incorrect
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Question Title */}
                  <h3 className="text-base font-bold text-slate-900 mb-4 leading-snug">
                    {q.question}
                  </h3>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = userSelection === String(optIdx);
                      const isCorrectAnswer = res && String(optIdx) === res.correct_answer;
                      const isUserIncorrect = res && !res.is_correct && isSelected;

                      let optionStyle =
                        "border-slate-200 bg-slate-50/50 hover:bg-emerald-50/40 hover:border-emerald-200 text-slate-800";

                      if (isSelected && !res) {
                        optionStyle = "border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold";
                      } else if (isCorrectAnswer) {
                        optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                      } else if (isUserIncorrect) {
                        optionStyle = "border-rose-400 bg-rose-50 text-rose-900 font-medium";
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={!!res || isSubmitting}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-all ${optionStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isSelected || isCorrectAnswer
                                  ? "bg-emerald-600 text-white"
                                  : isUserIncorrect
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>

                          {isCorrectAnswer && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                          {isUserIncorrect && (
                            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit Button (if not yet answered) */}
                  {!res && (
                    <div className="mt-4 flex items-center justify-end">
                      <button
                        onClick={() => handleSubmitQuestion(q.id)}
                        disabled={userSelection === undefined || isSubmitting}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Submit Answer
                      </button>
                    </div>
                  )}

                  {/* Explanation & Misconception Breakdown */}
                  {res && (
                    <div
                      className={`mt-4 p-4 rounded-xl border text-xs leading-relaxed ${
                        res.is_correct
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          : "bg-rose-50/70 border-rose-200 text-rose-900"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <HelpCircle className="h-4 w-4" />
                        Explanation:
                      </div>
                      <MarkdownLatexRenderer content={res.explanation} />

                      {res.lesson_review_url && !res.is_correct && (
                        <div className="mt-3 pt-2.5 border-t border-rose-200/60 flex items-center justify-between">
                          <span className="text-[11px] text-rose-700 font-medium">
                            Need a refresher on this concept?
                          </span>
                          <Link
                            href={res.lesson_review_url}
                            className="inline-flex items-center gap-1 font-bold text-rose-800 hover:text-rose-950 underline text-xs"
                          >
                            <span>Review Lesson</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
