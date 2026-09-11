"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchDashboardData,
  fetchRecommendations,
  resetStudentProgress,
  DashboardSummary,
  Recommendation,
} from "@/lib/api/education";
import {
  LayoutDashboard,
  Trophy,
  BookOpen,
  Cpu,
  Terminal,
  Sparkles,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resetting, setResetting] = useState<boolean>(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dash, recs] = await Promise.all([
        fetchDashboardData(),
        fetchRecommendations(),
      ]);
      setData(dash);
      setRecommendations(recs);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [dash, recs] = await Promise.all([
          fetchDashboardData(),
          fetchRecommendations(),
        ]);
        if (!ignore) {
          setData(dash);
          setRecommendations(recs);
        }
      } catch {
        // Failed to load
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleReset = async () => {
    if (!confirm("Reset demo student progress to default learning state?")) return;
    setResetting(true);
    try {
      await resetStudentProgress();
      await loadDashboard();
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 border-4 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Loading Student Dashboard...</p>
        </div>
      </div>
    );
  }

  const overallProgress = data?.overall_progress_pct || 0;

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-20">
      {/* Top Welcome Banner */}
      <div className="border-b border-emerald-100 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-600" />
                Student Learning Portal
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back, Quantum Scholar!
              </h1>
              <p className="text-sm text-slate-600 max-w-xl mt-1">
                Track your mastery of quantum foundations, review quiz results, view algorithmic challenge scores, and continue your personalized path.
              </p>
            </div>

            {/* Overall Progress Meter */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 min-w-[260px] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Learning Path</span>
                <span className="text-lg font-extrabold text-emerald-700">{overallProgress}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(5, overallProgress))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>Phase P1 Active</span>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                  title="Reset Demo Data"
                >
                  <RotateCcw className="h-3 w-3" />
                  {resetting ? "Resetting..." : "Reset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Lessons Completed</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {data?.completed_lessons || 0}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Challenges Solved</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {data?.completed_challenges || 0}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Average Quiz Score</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {data?.avg_quiz_score || 0}%
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium">Simulations Run</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {data?.simulations_run || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Skill Mastery & Recommendations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Skill Mastery Section (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Quantum Skill Mastery</h3>
              </div>
              <span className="text-xs text-slate-500">Multi-Signal Evaluation</span>
            </div>

            <div className="space-y-4">
              {data?.topics_progress.map((tp) => {
                const masteryBadge =
                  tp.mastery_level === "Mastered"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : tp.mastery_level === "Proficient"
                    ? "bg-teal-100 text-teal-800 border-teal-200"
                    : tp.mastery_level === "Practicing"
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200";

                const progressWidth =
                  tp.mastery_level === "Mastered"
                    ? 100
                    : tp.mastery_level === "Proficient"
                    ? 75
                    : tp.mastery_level === "Practicing"
                    ? 50
                    : 25;

                return (
                  <div key={tp.topic} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-800 capitalize">
                        {tp.topic}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${masteryBadge}`}>
                        {tp.mastery_level}
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Quiz Avg: {tp.quiz_avg_score}%</span>
                      <span>Challenges Passed: {tp.challenges_completed}</span>
                      <span>Simulations: {tp.simulations_run}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personalized Recommendations (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Recommended Next Steps</h3>
                </div>
                <Link
                  href="/recommendations"
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-3">
                {recommendations.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">{rec.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.priority === "High"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-slate-500 mb-3 leading-relaxed">{rec.reason}</p>
                    <Link
                      href={rec.action_url}
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      <span>{rec.action_label}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/circuit-lab"
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all text-left group"
              >
                <Cpu className="h-5 w-5 text-emerald-600 mb-2 group-hover:scale-105 transition-transform" />
                <div className="text-xs font-bold text-slate-800">Circuit Lab</div>
                <p className="text-[11px] text-slate-500">Visual drag-and-drop editor</p>
              </Link>

              <Link
                href="/code-lab"
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all text-left group"
              >
                <Terminal className="h-5 w-5 text-teal-600 mb-2 group-hover:scale-105 transition-transform" />
                <div className="text-xs font-bold text-slate-800">Code Studio</div>
                <p className="text-[11px] text-slate-500">Python Qiskit scripting</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity Log */}
        {data?.recent_activities && data.recent_activities.length > 0 && (
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Recent Learning Activity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.recent_activities.map((act, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">{act.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        act.passed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {act.passed ? "Passed" : "Attempted"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span className="capitalize">{act.type}</span>
                    <span>{new Date(act.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
