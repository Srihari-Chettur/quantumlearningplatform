"use client";

import { useState } from "react";
import { runSimulation, SimulationApiError } from "@/lib/api/simulation";
import { CircuitSchema, GateSchema, SimulationResultSchema } from "@/lib/types/quantum";
import {
  Sparkles,
  Play,
  Bug,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  RotateCcw,
  Check,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { GroverGeometricRotation } from "@/components/visualization/GroverGeometricRotation";

type GroverTarget = "00" | "01" | "10" | "11";

export default function GroverLessonPage() {
  const [targetState, setTargetState] = useState<GroverTarget>("11");
  const [errorMode, setErrorMode] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResultSchema | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Synthesizes the exact 2-qubit Grover circuit for Qiskit Aer
  const buildGroverCircuit = (target: GroverTarget, withError: boolean): CircuitSchema => {
    const gates: GateSchema[] = [
      // 1. Initial Superposition
      { id: "h0_init", type: "H", qubits: [0] },
      { id: "h1_init", type: "H", qubits: [1] },
    ];

    let gid = 0;

    // 2. Oracle (marks target with -1 phase)
    // Target bitstring ordering: target[0] = q1, target[1] = q0
    const q1_val = Number(target[0]);
    const q0_val = Number(target[1]);

    // Flip 0-bits before controlled-Z
    if (q0_val === 0) gates.push({ id: `o_pre_x0_${gid++}`, type: "X", qubits: [0] });
    if (q1_val === 0) gates.push({ id: `o_pre_x1_${gid++}`, type: "X", qubits: [1] });

    // Native Controlled-Z gate (inverts relative phase of |11>)
    gates.push({ id: `o_cz_${gid++}`, type: "CZ", qubits: [0, 1] });

    // Uncompute X gates
    if (q1_val === 0) gates.push({ id: `o_post_x1_${gid++}`, type: "X", qubits: [1] });
    if (q0_val === 0) gates.push({ id: `o_post_x0_${gid++}`, type: "X", qubits: [0] });

    if (!withError) {
      // 3. Diffusion Operator (Inversion about the mean)
      gates.push({ id: `d_h0_${gid++}`, type: "H", qubits: [0] });
      gates.push({ id: `d_h1_${gid++}`, type: "H", qubits: [1] });
      gates.push({ id: `d_x0_${gid++}`, type: "X", qubits: [0] });
      gates.push({ id: `d_x1_${gid++}`, type: "X", qubits: [1] });

      // Native Controlled-Z gate inside diffusion operator
      gates.push({ id: `d_cz_${gid++}`, type: "CZ", qubits: [0, 1] });

      gates.push({ id: `d_x0_end_${gid++}`, type: "X", qubits: [0] });
      gates.push({ id: `d_x1_end_${gid++}`, type: "X", qubits: [1] });
      gates.push({ id: `d_h0_end_${gid++}`, type: "H", qubits: [0] });
      gates.push({ id: `d_h1_end_${gid++}`, type: "H", qubits: [1] });
    }
    // If withError is true: Diffusion operator is omitted!

    // 4. Measurements
    gates.push({ id: `m0_${gid++}`, type: "MEASURE", qubits: [0], classical_bits: [0] });
    gates.push({ id: `m1_${gid++}`, type: "MEASURE", qubits: [1], classical_bits: [1] });

    return {
      num_qubits: 2,
      num_classical_bits: 2,
      gates,
      shots: 1024,
    };
  };

  const handleRunSimulation = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const circuit = buildGroverCircuit(targetState, errorMode);
      const res = await runSimulation(circuit);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof SimulationApiError) {
        setApiError(err.message);
      } else {
        setApiError("Failed to simulate circuit on Qiskit Aer backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? Object.entries(result.probabilities).map(([state, prob]) => ({
        state: `|${state}⟩`,
        rawState: state,
        probability: Number((prob * 100).toFixed(1)),
        count: result.counts[state] || 0,
        isTarget: state === targetState,
      }))
    : [];

  const highestProbState = result
    ? Object.entries(result.probabilities).reduce((max, curr) => (curr[1] > max[1] ? curr : max))[0]
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Flagship Header */}
      <div className="border-b border-emerald-100 pb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 shadow-xs">
          Flagship Algorithm • SIH 2026
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Grover&apos;s Search Algorithm
        </h1>
        <p className="mt-3 text-slate-600 text-base sm:text-lg max-w-3xl leading-relaxed">
          Search an unsorted database quadratically faster than any classical computer (O(√N) queries vs classical O(N)). Discover how quantum phase inversion and diffusion amplify the measurement probability of the marked state to ~100%.
        </p>
      </div>

      {/* Step-by-Step Progressive Curriculum */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            Algorithm Walkthrough
          </h2>
          <span className="text-xs font-bold text-slate-500">Step {activeStep} of 5</span>
        </div>

        {/* Step navigation tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { num: 1, label: "The Search Problem" },
            { num: 2, label: "Superposition" },
            { num: 3, label: "The Oracle" },
            { num: 4, label: "Diffusion Operator" },
            { num: 5, label: "Full Circuit & Result" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                activeStep === s.num
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs ring-2 ring-emerald-500/20"
                  : "bg-white border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="text-[10px] font-mono uppercase font-bold text-emerald-700">Step 0{s.num}</div>
              <div className="text-xs font-bold mt-1 truncate">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Step Content Card */}
        <div className="p-6 rounded-2xl bg-white border border-emerald-100/90 shadow-sm text-sm leading-relaxed space-y-4">
          {activeStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">1. The Unstructured Search Problem</h3>
              <p className="text-slate-600">
                Imagine an unsorted phonebook or database with <strong className="text-slate-900">N</strong> entries. If you want to find a specific marked person, a classical computer must inspect each item one by one. In the worst case, this requires <strong className="text-rose-600 font-bold">O(N)</strong> checks.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold">Classical Search</span>
                  <div className="text-xl font-mono font-bold text-rose-600 mt-1">O(N) queries</div>
                  <p className="text-xs text-slate-500 mt-1">Checking 1,000,000 items requires ~500,000 to 1,000,000 evaluations.</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold">Grover&apos;s Algorithm</span>
                  <div className="text-xl font-mono font-bold text-emerald-600 mt-1">O(√N) queries</div>
                  <p className="text-xs text-slate-500 mt-1">Checking 1,000,000 items takes only ~1,000 quantum evaluations!</p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">2. Preparing Equal Superposition</h3>
              <p className="text-slate-600">
                Before searching, the algorithm initializes all qubits in the ground state |00⟩ and applies a Hadamard gate H to each qubit.
              </p>
              <div className="font-mono text-xs bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 text-emerald-900 font-bold">
                |ψ₀⟩ = H⊗H |00⟩ = 1/2 (|00⟩ + |01⟩ + |10⟩ + |11⟩)
              </div>
              <p className="text-xs text-slate-500">
                Every one of the 2² = 4 possibilities now has an equal probability of 1/4 = 25%.
              </p>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">3. The Quantum Oracle (Ow)</h3>
              <p className="text-slate-600">
                The oracle is a black-box quantum circuit that identifies the correct item |w⟩. Instead of measuring it, the oracle flips the <em>relative phase</em> of the marked state from +1 to -1:
              </p>
              <div className="font-mono text-xs bg-teal-50/70 p-4 rounded-xl border border-teal-100 text-teal-900 font-bold">
                Ow |x⟩ = -|x⟩ if x = target, else |x⟩
              </div>
              <p className="text-xs text-slate-500">
                Notice: The amplitude of the target state is now -1/2, while non-target amplitudes remain +1/2. Measurement alone cannot see this negative sign because |-1/2|² = 1/4 = 25%. That&apos;s why the Diffusion Operator is required!
              </p>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">4. Diffusion Operator (Inversion About the Mean)</h3>
              <p className="text-slate-600">
                The diffusion operator calculates the average amplitude across all states and inverts every state&apos;s amplitude about this average.
              </p>
              <div className="font-mono text-xs bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 text-emerald-900 font-bold">
                D = 2|ψ₀⟩⟨ψ₀| - I = H⊗² (2|00⟩⟨00| - I) H⊗²
              </div>
              <p className="text-xs text-slate-500">
                Because the marked state had a negative amplitude (-0.5 vs average ~0.25), inverting about the average reflects it upward to +1.0, while non-marked states drop to 0!
              </p>
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">5. Full 2-Qubit Grover Execution</h3>
              <p className="text-slate-600">
                For a 2-qubit system (N=4), exactly <strong className="text-emerald-700">1 single Grover iteration</strong> (Oracle followed by Diffusion) achieves <strong className="text-emerald-700">100% theoretical probability</strong> of measuring the marked state!
              </p>
              <p className="text-xs text-slate-500">
                Test it below: pick any target state, run it on Qiskit Aer, or introduce the intentional error to observe quantum debugging in action.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Geometric 2D Rotation Simulation Section */}
      <section>
        <GroverGeometricRotation />
      </section>

      {/* Interactive Grover Simulation Lab */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-600" />
              Interactive Grover Laboratory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a target database item, view synthesized circuit stages, and simulate on Qiskit Aer.
            </p>
          </div>

          {/* Circuit Mode Toggle: Correct vs Broken */}
          <div className="flex items-center gap-1.5 bg-white border border-emerald-100 p-1 rounded-2xl shadow-xs">
            <button
              onClick={() => {
                setErrorMode(false);
                setResult(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !errorMode
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              CORRECT CIRCUIT
            </button>
            <button
              onClick={() => {
                setErrorMode(true);
                setResult(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                errorMode
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              <Bug className="h-3.5 w-3.5" />
              BROKEN CIRCUIT (Error Mode)
            </button>
          </div>
        </div>

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Target Selector & Visual Stage Circuit */}
          <div className="lg:col-span-7 space-y-6">
            {/* Target Selector */}
            <div className="p-6 rounded-2xl bg-white border border-emerald-100/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                  Target State to Search:
                </span>
                <span className="text-xs font-mono text-emerald-700 font-bold">
                  Searching for |{targetState}⟩
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {(["00", "01", "10", "11"] as GroverTarget[]).map((state) => (
                  <button
                    key={state}
                    onClick={() => {
                      setTargetState(state);
                      setResult(null);
                    }}
                    className={`py-3 rounded-xl font-mono text-base font-bold transition-all border cursor-pointer ${
                      targetState === state
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20 scale-105"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                    }`}
                  >
                    |{state}⟩
                  </button>
                ))}
              </div>

              {/* Error Explanation Banner when in Error Mode */}
              {errorMode && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5 shadow-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-bold text-amber-950">
                      Intentional Fault Injected: Diffusion Operator Removed
                    </strong>
                    <p>
                      The Oracle still marks state <strong className="font-mono">|{targetState}⟩</strong> with a -1 phase, but without the Diffusion Operator to invert about the mean, phase marking cannot be converted into measurable probability differences.
                    </p>
                    <button
                      onClick={() => {
                        setErrorMode(false);
                        setResult(null);
                      }}
                      className="inline-flex items-center gap-1 mt-1 text-emerald-800 font-bold underline underline-offset-2 hover:text-emerald-950 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" /> Restore Correct Circuit
                    </button>
                  </div>
                </div>
              )}

              {/* Visual Stages Circuit Preview with Gate Highlighting */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Synthesized Circuit Stages
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Click step tabs 1-5 above to highlight active stage)
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Stage 1: Superposition */}
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                      activeStep === 2
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Stage 1: Superposition</span>
                      <span className="text-[10px] uppercase font-sans font-semibold text-emerald-700">q0, q1</span>
                    </div>
                    <div className="mt-1 text-[11px]">H(0), H(1) → Equal distribution 25% each</div>
                  </div>

                  {/* Stage 2: Oracle */}
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                      activeStep === 3
                        ? "bg-teal-50 border-teal-400 text-teal-950 shadow-xs ring-2 ring-teal-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Stage 2: Oracle (Ow) for |{targetState}⟩</span>
                      <span className="text-[10px] uppercase font-sans font-semibold text-teal-700">Phase Inversion</span>
                    </div>
                    <div className="mt-1 text-[11px]">
                      {targetState === "11"
                        ? "Native CZ(0, 1) phase inversion"
                        : "X pre-gates + CZ(0, 1) + X post-gates"}
                    </div>
                  </div>

                  {/* Stage 3: Diffusion */}
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                      errorMode
                        ? "bg-amber-50/60 border-dashed border-amber-300 text-amber-800 line-through opacity-75"
                        : activeStep === 4
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Stage 3: Diffusion Operator {errorMode ? "(OMITTED IN BROKEN CIRCUIT)" : ""}</span>
                      <span className="text-[10px] uppercase font-sans font-semibold text-emerald-700">Inversion about mean</span>
                    </div>
                    <div className="mt-1 text-[11px]">
                      H(0,1) + X(0,1) + CZ(0,1) + X(0,1) + H(0,1)
                    </div>
                  </div>

                  {/* Stage 4: Measurement */}
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                      activeStep === 5
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Stage 4: Measurement</span>
                      <span className="text-[10px] uppercase font-sans font-semibold text-emerald-700">Collapse</span>
                    </div>
                    <div className="mt-1 text-[11px]">
                      M(0) → c0, M(1) → c1
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation Run Button */}
              <button
                onClick={handleRunSimulation}
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  errorMode
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                }`}
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" /> Simulating on Qiskit Aer...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    {errorMode ? "Run Broken Circuit on Aer" : "Run Grover Simulation on Aer"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Search Spectrum Results & What Happened Narrative */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 p-6 rounded-2xl bg-white border border-emerald-100/90 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Search Spectrum</h3>
                  <p className="text-xs text-slate-500">Sampled Basis Distribution from Qiskit Aer</p>
                </div>
                {result && (
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {result.execution_time_ms} ms
                  </span>
                )}
              </div>

              {apiError && (
                <div className="my-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {apiError}
                </div>
              )}

              {!result && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <Sparkles className="h-10 w-10 text-emerald-600/40 mb-3" />
                  <p className="text-sm font-bold text-slate-700">No Simulation Executed</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Choose target <strong className="text-emerald-700">|{targetState}⟩</strong> and click <strong className="text-emerald-700">&quot;Run Grover Simulation&quot;</strong>.
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-900">Quantum Aer Simulating...</p>
                  <p className="text-xs text-slate-500 mt-1">Measuring quantum interference patterns</p>
                </div>
              )}

              {result && !loading && (
                <div className="flex-1 flex flex-col justify-between pt-4 space-y-6">
                  {/* Recharts Bar Chart */}
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="state" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          domain={[0, 100]}
                          tickFormatter={(v: number) => `${v}%`}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#a7f3d0",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#0f172a",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.isTarget
                                  ? errorMode
                                    ? "#d97706"
                                    : "#059669"
                                  : entry.probability > 0
                                  ? "#94a3b8"
                                  : "#cbd5e1"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* "What Happened?" Diagnostic Narrative */}
                  {!errorMode && highestProbState === targetState ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2 shadow-xs">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> What Happened: Amplitude Amplification!
                      </div>
                      <p>
                        Target state <strong className="font-mono text-emerald-950">|{targetState}⟩</strong> was amplified to <strong>{(result.probabilities[targetState] * 100).toFixed(1)}% probability</strong>!
                      </p>
                      <div className="pt-2 border-t border-emerald-200/80 text-[11px] text-emerald-900 space-y-1">
                        <div>1. <strong>Superposition</strong> initialized all states to equal 25% probability.</div>
                        <div>2. <strong>Oracle</strong> flipped the relative phase of |{targetState}⟩ to negative amplitude.</div>
                        <div>3. <strong>Diffusion</strong> inverted amplitudes about the average, reflecting |{targetState}⟩ to ~1.0!</div>
                        <div>4. <strong>Measurement</strong> collapsed onto |{targetState}⟩ with high certainty.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2 shadow-xs">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" /> What Happened: Circuit Diagnostic Alert
                      </div>
                      <p>
                        Expected target was <strong className="font-mono">|{targetState}⟩</strong>, but observed probabilities remain uniformly ~25% across all states!
                      </p>
                      <p className="text-[11px] text-amber-900 pt-1">
                        <strong>Why did this happen?</strong> Because the Diffusion operator was omitted! The Oracle changed the quantum phase (-1), but phase differences are completely invisible to computational basis measurement without quantum interference.
                      </p>
                      <button
                        onClick={() => {
                          setErrorMode(false);
                          setResult(null);
                        }}
                        className="inline-flex items-center gap-1 text-emerald-800 font-bold underline underline-offset-2 hover:text-emerald-950 cursor-pointer text-[11px]"
                      >
                        <RotateCcw className="h-3 w-3" /> Restore Correct Circuit & Re-run
                      </button>
                    </div>
                  )}

                  {/* Telemetry info */}
                  <div className="text-[11px] text-slate-500 flex justify-between items-center border-t border-slate-100 pt-3">
                    <span>Target: <strong className="text-emerald-800 font-mono font-bold">|{targetState}⟩</strong></span>
                    <span>Backend: <strong className="text-slate-700 font-mono font-bold">Qiskit Aer</strong></span>
                    <span>Shots: <strong className="text-slate-700 font-mono font-bold">{result.shots}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Next Step Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs mt-8">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Ready to code Grover yourself?</h3>
          <p className="text-xs text-slate-600 mt-1">
            Test your knowledge by tackling the Grover coding challenge or write custom oracles in Code Lab.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/challenges?id=chall_grover_full"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            Grover Challenge <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/code-lab"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-bold transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            Code Lab
          </Link>
          <Link
            href="/assessments"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            Grover Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
