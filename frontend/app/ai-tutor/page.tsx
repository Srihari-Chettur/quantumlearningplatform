"use client";

import { useState } from "react";
import { AITutorPanel } from "@/components/AITutorPanel";
import {
  Bot,
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Cpu,
  Layers,
  Terminal,
  Compass
} from "lucide-react";
import Link from "next/link";

const TOPIC_SUGGESTIONS = [
  {
    topic: "Grover's Search",
    icon: Sparkles,
    prompt: "Explain how Grover's algorithm achieves quadratic speedup and why the diffuser is necessary.",
  },
  {
    topic: "Bell State & Entanglement",
    icon: Cpu,
    prompt: "How does combining a Hadamard gate and a CNOT gate generate a maximally entangled Bell pair?",
  },
  {
    topic: "Controlled-Z (CZ) Gate",
    icon: Layers,
    prompt: "Why is the Controlled-Z gate symmetric between control and target qubits?",
  },
  {
    topic: "Quantum Measurement",
    icon: Compass,
    prompt: "Explain Born's rule and why measurement collapses a coherent superposition into a classical bit.",
  },
  {
    topic: "Phase Kickback",
    icon: Lightbulb,
    prompt: "What is phase kickback in quantum computing and how do phase oracles use it?",
  },
  {
    topic: "Bloch Sphere Geometry",
    icon: BookOpen,
    prompt: "How does the Pauli-X gate rotate a statevector on the Bloch Sphere compared to the Pauli-Z gate?",
  },
];

export default function AITutorPage() {
  const [selectedPrompt, setSelectedPrompt] = useState<string>(
    "Explain how Grover's algorithm achieves quadratic speedup and why the diffuser is necessary."
  );

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-20">
      {/* Top Banner */}
      <div className="border-b border-emerald-100 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <Bot className="h-3.5 w-3.5 text-emerald-600" />
                SIH 2026 AI Assistant
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                AI Quantum Tutor
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl mt-1">
                Your dedicated quantum co-pilot. Grounded in real simulation results, quantum state mathematics, and interactive circuit debugging.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/circuit-lab"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/30 transition-all shadow-xs"
              >
                <Cpu className="h-3.5 w-3.5 text-emerald-600" />
                Circuit Lab
              </Link>
              <Link
                href="/code-lab"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
              >
                <Terminal className="h-3.5 w-3.5 text-white" />
                Code Lab
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Topic Suggestions & Concepts */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-emerald-600" />
                Explore Recommended Questions
              </h3>
              <div className="space-y-2.5">
                {TOPIC_SUGGESTIONS.map((s, idx) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedPrompt(s.prompt)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all text-xs group flex items-start gap-2.5"
                    >
                      <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-800">{s.topic}</div>
                        <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{s.prompt}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Capabilities Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md shadow-emerald-500/15">
              <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5 text-emerald-200" />
              </div>
              <h4 className="text-base font-bold mb-1">Grounded AI Guarantee</h4>
              <p className="text-xs text-emerald-100 leading-relaxed">
                Unlike generic chatbots, this AI Tutor does not hallucinate fictional quantum hardware or fabricate probabilities. It directly inspects your Circuit JSON, verifies unitaries, and evaluates real Qiskit Aer simulation telemetry.
              </p>
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-[11px] text-emerald-200">
                <span>Dual Engine Architecture</span>
                <span className="font-semibold text-white">LLM + Quantum Diagnostic</span>
              </div>
            </div>
          </div>

          {/* Right Column: Full Integrated AI Tutor Panel */}
          <div className="lg:col-span-8">
            <AITutorPanel
              initialPrompt={selectedPrompt}
              inline={true}
              isOpen={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
