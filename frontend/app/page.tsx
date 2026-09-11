import Link from "next/link";
import { ArrowRight, BookOpen, Cpu, Sparkles, Zap, Layers, Binary } from "lucide-react";

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
      <section className="relative overflow-hidden py-16 lg:py-24 border-b border-white/5 bg-gradient-to-b from-cyan-950/20 via-transparent to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.12),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(99,102,241,0.12),transparent_50%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Zap className="h-3.5 w-3.5" /> SIH 2026 Interactive Quantum Learning Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Learn Quantum Computing <br />
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                by Building It
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed">
              Step through quantum logic gates, assemble quantum circuits on visual wires, and execute real simulations on{" "}
              <span className="text-cyan-300 font-semibold">Qiskit Aer</span>. Discover superposition, entanglement, and Grover&apos;s search speedup through interactive experimentation.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/lessons/gates"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all"
              >
                <BookOpen className="h-4 w-4" />
                Start Learning
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/circuit-lab"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-sm shadow-sm hover:scale-[1.02] transition-all"
              >
                <Cpu className="h-4 w-4 text-cyan-400" />
                Open Circuit Lab
              </Link>

              <Link
                href="/lessons/grover"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 font-medium text-sm transition-colors"
              >
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Flagship: Grover&apos;s Algorithm
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Path Progression */}
      <section className="py-16 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Structured Curriculum</h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2">The Interactive Learning Journey</h3>
            <p className="text-sm text-slate-400 mt-2">
              Follow this step-by-step path from fundamental quantum logic gates to full algorithmic amplitude amplification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex flex-col relative group">
                <Link
                  href={step.href}
                  className="flex-1 flex flex-col p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/90 transition-all shadow-md group-hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {step.num}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {step.status}
                    </span>
                  </div>

                  <h4 className="font-semibold text-white text-base group-hover:text-cyan-300 transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed flex-1">
                    {step.desc}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center text-xs font-medium text-cyan-400 group-hover:translate-x-1 transition-transform">
                    Explore Step <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                </Link>

                {/* Progress arrow for desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 items-center justify-center text-slate-600">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                <Binary className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Live Quantum Physics</h4>
              <p className="text-sm text-slate-400 mt-2">
                Simulations are never mocked or randomized with client timers. All shots run on high-performance Qiskit Aer backend instances.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Visual Circuit Lab</h4>
              <p className="text-sm text-slate-400 mt-2">
                Place gates on multi-qubit wires, configure measurements, adjust shot counts, and inspect full $2^N$ basis state probability charts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Grover&apos;s Search Demo</h4>
              <p className="text-sm text-slate-400 mt-2">
                Understand how quantum interference amplifies marked states, and experiment with built-in error diagnostics to see why circuits fail.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
