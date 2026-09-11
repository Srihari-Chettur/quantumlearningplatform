import Link from "next/link";
import { ArrowRight, BookOpen, Cpu, Sparkles, Zap, Layers, Binary, Terminal, Trophy } from "lucide-react";

export default function HomePage() {
  const steps = [
    {
      num: "01",
      title: "Quantum Basics",
      desc: "Understand qubits, the Bloch sphere, and quantum state vectors vs classical bits.",
      status: "Foundational",
      href: "/lessons/gates",
    },
    {
      num: "02",
      title: "Quantum Gates",
      desc: "Master H, X, Y, Z, S, T, and CNOT gates with live interactive probability distributions.",
      status: "Interactive",
      href: "/lessons/gates",
    },
    {
      num: "03",
      title: "Build Circuits",
      desc: "Assemble custom multi-qubit circuits on visual wires in the live Circuit Lab.",
      status: "Hands-on",
      href: "/circuit-lab",
    },
    {
      num: "04",
      title: "Bell State",
      desc: "Entangle two qubits (H + CNOT) to witness quantum non-locality with 50/50 correlation.",
      status: "Experiment",
      href: "/circuit-lab?preset=bell",
    },
    {
      num: "05",
      title: "Grover's Algorithm",
      desc: "Observe quadratic search speedup: explore phase inversion, diffusion, and error diagnosis.",
      status: "Flagship Algorithm",
      href: "/lessons/grover",
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24 border-b border-emerald-100/80 bg-gradient-to-b from-emerald-50/60 via-white to-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(20,184,166,0.1),transparent_50%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-6 shadow-xs">
              <Zap className="h-3.5 w-3.5 text-emerald-600" /> SIH 2026 Interactive Quantum Learning Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              Learn Quantum Computing <br />
              <span className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 bg-clip-text text-transparent">
                by Building It
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              Step through quantum logic gates, assemble quantum circuits on visual wires, and execute real simulations on{" "}
              <span className="text-emerald-700 font-semibold">Qiskit Aer</span>. Discover superposition, entanglement, and Grover&apos;s search speedup through interactive experimentation.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/lessons/gates"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                Start Learning
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/circuit-lab"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-emerald-50/50 border border-emerald-200 text-slate-800 font-semibold text-sm shadow-xs hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Cpu className="h-4 w-4 text-emerald-600" />
                Circuit Lab
              </Link>

              <Link
                href="/code-lab"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm shadow-xs hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Terminal className="h-4 w-4 text-teal-600" />
                Code Lab
              </Link>

              <Link
                href="/challenges"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-teal-50 hover:bg-teal-100/70 border border-teal-200 text-teal-900 font-semibold text-sm transition-colors cursor-pointer"
              >
                <Trophy className="h-4 w-4 text-teal-600" />
                Challenges
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Path Progression */}
      <section className="py-16 bg-emerald-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Structured Curriculum</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">The Interactive Learning Journey</h3>
            <p className="text-sm text-slate-600 mt-2">
              Follow this step-by-step path from fundamental quantum logic gates to full algorithmic amplitude amplification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex flex-col relative group">
                <Link
                  href={step.href}
                  className="flex-1 flex flex-col p-5 rounded-2xl bg-white border border-emerald-100/90 hover:border-emerald-300 hover:shadow-md transition-all shadow-xs group-hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                      {step.num}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {step.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-1">
                    {step.desc}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                    Explore Step <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                </Link>

                {/* Progress arrow for desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center text-slate-300">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 border-t border-emerald-100/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50/70 border border-emerald-100/80 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-4">
                <Binary className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Live Quantum Physics</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Simulations are never mocked or randomized with client timers. All shots run on high-performance Qiskit Aer backend instances.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-emerald-100/80 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Visual Circuit Lab</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Place gates on multi-qubit wires, configure measurements, adjust shot counts, and inspect full $2^N$ basis state probability charts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/70 border border-emerald-100/80 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Grover&apos;s Search Demo</h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Understand how quantum interference amplifies marked states, and experiment with built-in error diagnostics to see why circuits fail.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
