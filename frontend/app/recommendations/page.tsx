"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchRecommendations, Recommendation } from "@/lib/api/education";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Filter
} from "lucide-react";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchRecommendations();
        if (!ignore) setRecommendations(data);
      } catch {
        if (!ignore) setRecommendations([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const categories = ["All", ...Array.from(new Set(recommendations.map((r) => r.category)))];

  const filtered =
    selectedCategory === "All"
      ? recommendations
      : recommendations.filter((r) => r.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-20">
      {/* Top Banner */}
      <div className="border-b border-emerald-100 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Personalized Learning Engine
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Adaptive Recommendations
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl mt-1">
              Data-grounded learning trajectories customized to your assessment scores, challenge submissions, and simulation activity.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Category filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Calculating recommendations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-800">All current milestones complete!</p>
            <p className="text-xs text-slate-500 mt-1">Check back after exploring new circuits or taking quizzes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-emerald-100 hover:border-emerald-300 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      {rec.category}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        rec.priority === "High"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2 mb-2">
                    {rec.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {rec.reason}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link
                    href={rec.action_url}
                    className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <span>{rec.action_label}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
