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
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type GroverTarget = "00" | "01" | "10" | "11";

export default function GroverLessonPage() {
  const [targetState, setTargetState] = useState<GroverTarget>("11");
  const [errorMode, setErrorMode] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResultSchema | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Builds the 2-qubit Grover circuit dynamically based on target and error mode
  const buildGroverCircuit = (target: GroverTarget, withError: boolean): CircuitSchema => {
    const gates: GateSchema[] = [
      // 1. Initial Superposition
      { id: "h0_init", type: "H", qubits: [0] },
      { id: "h1_init", type: "H", qubits: [1] },
    ];

    let gid = 0;

    // 2. Oracle (marks target with -1 phase)
    // In our bitstring ordering:
    // target[0] is qubit 1, target[1] is qubit 0
    const q1_val = Number(target[0]);
    const q0_val = Number(target[1]);

    if (!withError) {
      // Normal Oracle: flip qubits that are 0 to 1 before CZ
      if (q0_val === 0) {
        gates.push({ id: `o_pre_x0_${gid++}`, type: "X", qubits: [0] });
      }
      if (q1_val === 0) {
        gates.push({ id: `o_pre_x1_${gid++}`, type: "X", qubits: [1] });
      }

      // CZ(0, 1) = H(1) + CNOT(0, 1) + H(1)
      gates.push({ id: `o_cz_h1_${gid++}`, type: "H", qubits: [1] });
      gates.push({ id: `o_cz_cx_${gid++}`, type: "CNOT", qubits: [0, 1] });
      gates.push({ id: `o_cz_h2_${gid++}`, type: "H", qubits: [1] });

      // Uncompute X gates
      if (q1_val === 0) {
        gates.push({ id: `o_post_x1_${gid++}`, type: "X", qubits: [1] });
      }
      if (q0_val === 0) {
        gates.push({ id: `o_post_x0_${gid++}`, type: "X", qubits: [0] });
      }

      // 3. Diffusion Operator (Inversion about the mean)
      gates.push({ id: `d_h0_${gid++}`, type: "H", qubits: [0] });
      gates.push({ id: `d_h1_${gid++}`, type: "H", qubits: [1] });
      gates.push({ id: `d_x0_${gid++}`, type: "X", qubits: [0] });
      gates.push({ id: `d_x1_${gid++}`, type: "X", qubits: [1] });

      // CZ inside diffusion
      gates.push({ id: `d_cz_h1_${gid++}`, type: "H", qubits: [1] });
      gates.push({ id: `d_cz_cx_${gid++}`, type: "CNOT", qubits: [0, 1] });
      gates.push({ id: `d_cz_h2_${gid++}`, type: "H", qubits: [1] });

      gates.push({ id: `d_x0_end_${gid++}`, type: "X", qubits: [0] });
      gates.push({ id: `d_x1_end_${gid++}`, type: "X", qubits: [1] });
      gates.push({ id: `d_h0_end_${gid++}`, type: "H", qubits: [0] });
      gates.push({ id: `d_h1_end_${gid++}`, type: "H", qubits: [1] });
    } else {
      // Intentional Error: The Oracle is applied, but the Diffusion operator is missing!
      // This demonstrates that phase marking alone does not amplify measurement probabilities!
      if (q0_val === 0) {
        gates.push({ id: `o_pre_x0_${gid++}`, type: "X", qubits: [0] });
      }
      if (q1_val === 0) {
        gates.push({ id: `o_pre_x1_${gid++}`, type: "X", qubits: [1] });
      }

      gates.push({ id: `o_cz_h1_${gid++}`, type: "H", qubits: [1] });
      gates.push({ id: `o_cz_cx_${gid++}`, type: "CNOT", qubits: [0, 1] });
      gates.push({ id: `o_cz_h2_${gid++}`, type: "H", qubits: [1] });

      if (q1_val === 0) {
        gates.push({ id: `o_post_x1_${gid++}`, type: "X", qubits: [1] });
      }
      if (q0_val === 0) {
        gates.push({ id: `o_post_x0_${gid++}`, type: "X", qubits: [0] });
      }
      // Diffusion step omitted!
    }

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

  // Prepare chart data
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
      <div className="border-b border-white/10 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Flagship Algorithm • SIH 2026
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Grover&apos;s Search Algorithm
        </h1>
        <p className="mt-3 text-slate-300 text-base sm:text-lg max-w-3xl leading-relaxed">
          Search an unsorted database quadratically faster than any classical computer. Discover how quantum phase inversion and diffusion amplify the probability of marked items.
        </p>
      </div>

      {/* Step-by-Step Progressive Curriculum */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            Algorithm Walkthrough
          </h2>
          <span className="text-xs text-slate-400">Step {activeStep} of 5</span>
        </div>

        {/* Step navigation tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
              className={`p-3 rounded-xl text-left border transition-all ${
                activeStep === s.num
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <div className="text-[10px] font-mono uppercase font-bold opacity-75">Step 0{s.num}</div>
              <div className="text-xs font-semibold mt-1 truncate">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Step Content Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm leading-relaxed space-y-4">
          {activeStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">1. The Unstructured Search Problem</h3>
              <p className="text-slate-300">
                Imagine an unsorted phonebook or database with <strong className="text-white">N</strong> entries. If you want to find a specific marked person, a classical computer must inspect each item one by one. In the worst case, this requires <strong className="text-rose-400">O(N)</strong> checks.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold">Classical Search</span>
                  <div className="text-xl font-mono font-bold text-rose-400 mt-1">O(N) queries</div>
                  <p className="text-xs text-slate-400 mt-1">Checking 1,000,000 items requires ~500,000 to 1,000,000 evaluations.</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold">Grover&apos;s Algorithm</span>
                  <div className="text-xl font-mono font-bold text-emerald-400 mt-1">O(√N) queries</div>
                  <p className="text-xs text-slate-400 mt-1">Checking 1,000,000 items takes only ~1,000 quantum evaluations!</p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">2. Preparing Equal Superposition</h3>
              <p className="text-slate-300">
                Before searching, the algorithm initializes all qubits in the ground state |00⟩ and applies a Hadamard gate H to each qubit.
              </p>
              <div className="font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 text-cyan-300">
                |ψ₀⟩ = H⊗H |00⟩ = 1/2 (|00⟩ + |01⟩ + |10⟩ + |11⟩)
              </div>
              <p className="text-xs text-slate-400">
                Every one of the 2² = 4 possibilities now has an equal probability of 1/4 = 25%.
              </p>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">3. The Quantum Oracle (Ow)</h3>
              <p className="text-slate-300">
                The oracle is a black-box quantum circuit that identifies the correct item |w⟩. Instead of measuring it, the oracle flips the <em>phase</em> of the marked state from +1 to -1:
              </p>
              <div className="font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 text-indigo-300">
                Ow |x⟩ = -|x⟩ if x = target, else |x⟩
              </div>
              <p className="text-xs text-slate-400">
                Notice: The amplitude of the target state is now negative, while non-target amplitudes remain positive. Measurement alone cannot see this negative sign because |-1/2|² = 1/4 = 25%. That&apos;s why we need the Diffusion Operator!
              </p>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">4. Diffusion Operator (Inversion About the Mean)</h3>
              <p className="text-slate-300">
                The diffusion operator calculates the average amplitude across all states and inverts every state&apos;s amplitude about this average.
              </p>
              <div className="font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-300">
                D = 2|ψ₀⟩⟨ψ₀| - I = H⊗² (2|00⟩⟨00| - I) H⊗²
              </div>
              <p className="text-xs text-slate-400">
                Because the marked state had a negative amplitude, inverting about the average boosts its amplitude tremendously while suppressing all non-marked states!
              </p>
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">5. Full 2-Qubit Grover Execution</h3>
              <p className="text-slate-300">
                For a 2-qubit system (N=4), exactly <strong className="text-cyan-400">1 single Grover iteration</strong> (Ow followed by D) achieves <strong className="text-emerald-400">100% theoretical probability</strong> of measuring the marked state!
              </p>
              <p className="text-xs text-slate-400">
                Try it below in the interactive demo: pick any target state, run it on Qiskit Aer, or introduce an intentional error to see quantum debugging in action.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Grover Simulation Lab */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-400" />
              Interactive Grover Laboratory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a target item in the database, view the synthesized circuit, and simulate on Qiskit Aer.
            </p>
          </div>

          {/* Error mode toggle */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
            <button
              onClick={() => {
                setErrorMode(false);
                setResult(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !errorMode ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Standard Circuit
            </button>
            <button
              onClick={() => {
                setErrorMode(true);
                setResult(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                errorMode ? "bg-amber-500 text-slate-950 shadow-sm" : "text-amber-400 hover:text-amber-300"
              }`}
            >
              <Bug className="h-3.5 w-3.5" /> Introduce Example Error
            </button>
          </div>
        </div>

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Target State Selector & Circuit Preview */}
          <div className="lg:col-span-7 space-y-6">
            {/* Target Selector */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Target State to Search:
                </span>
                <span className="text-xs font-mono text-cyan-300 font-semibold">
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
                    className={`py-3 rounded-xl font-mono text-base font-bold transition-all border ${
                      targetState === state
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    |{state}⟩
                  </button>
                ))}
              </div>

              {/* Error explanation if error mode is enabled */}
              {errorMode && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-amber-300 mb-1">
                      Intentional Circuit Fault Injected:
                    </strong>
                    The Oracle marks state <strong className="text-white font-mono">|{targetState}⟩</strong> with a negative phase, but the <strong className="text-amber-100">Diffusion Operator has been removed</strong>.
                    Run the simulation to see why quantum phase flips are invisible to measurement without interference!
                  </div>
                </div>
              )}

              {/* Circuit Gates Preview */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  Synthesized Circuit Summary
                </span>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
                  <div className="text-cyan-400">1. Superposition: H(0), H(1)</div>
                  <div className="text-indigo-300">
                    2. Oracle for |{targetState}⟩: {targetState === "11" ? "CZ(0,1)" : "X pre-gates + CZ(0,1) + X uncompute"}
                  </div>
                  <div className={errorMode ? "text-amber-400 line-through opacity-60" : "text-emerald-400"}>
                    3. Diffusion: H(0,1) + X(0,1) + CZ(0,1) + X(0,1) + H(0,1) {errorMode ? "(OMITTED)" : ""}
                  </div>
                  <div className="text-violet-300">4. Measurement: M(0)→c0, M(1)→c1</div>
                </div>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" /> Simulating on Qiskit Aer...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" /> Run Grover Simulation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Simulation Telemetry & Diagnosis Panel */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-white text-base">Search Spectrum</h3>
                  <p className="text-xs text-slate-400">Sampled Basis Distribution</p>
                </div>
                {result && (
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {result.execution_time_ms} ms
                  </span>
                )}
              </div>

              {apiError && (
                <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {apiError}
                </div>
              )}

              {!result && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                  <Sparkles className="h-10 w-10 text-slate-700 mb-3" />
                  <p className="text-sm font-medium text-slate-400">No Simulation Executed</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Choose target <strong className="text-cyan-400">|{targetState}⟩</strong> and click <strong className="text-cyan-400">&quot;Run Grover Simulation&quot;</strong>.
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
                  <p className="text-sm font-semibold text-white">Quantum Aer Simulating...</p>
                  <p className="text-xs text-slate-400 mt-1">Measuring quantum interference patterns</p>
                </div>
              )}

              {result && !loading && (
                <div className="flex-1 flex flex-col justify-between pt-4 space-y-6">
                  {/* Recharts Bar Chart */}
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="state" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          domain={[0, 100]}
                          tickFormatter={(v: number) => `${v}%`}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#334155",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#f8fafc",
                          }}
                        />
                        <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.isTarget
                                  ? errorMode
                                    ? "#f59e0b"
                                    : "#10b981"
                                  : entry.probability > 0
                                  ? "#64748b"
                                  : "#1e293b"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Diagnostic Feedback Callout */}
                  {!errorMode && highestProbState === targetState ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" /> Successful Search Amplification!
                      </div>
                      <p>
                        Target state <strong className="text-white font-mono">|{targetState}⟩</strong> was amplified to ~{result.probabilities[targetState] * 100}% probability!
                      </p>
                      <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-300/80 space-y-1">
                        <div>1. H created equal superposition across all 4 states (25% each).</div>
                        <div>2. Oracle flipped the relative phase of |{targetState}⟩.</div>
                        <div>3. Diffusion inverted amplitudes around the mean, boosting |{targetState}⟩.</div>
                        <div>4. Measurement reliably outputs the target state in 1 shot!</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-amber-300">
                        <AlertTriangle className="h-4 w-4" /> Circuit Diagnostic Alert
                      </div>
                      <p>
                        Expected target was <strong className="text-white font-mono">|{targetState}⟩</strong>, but observed probabilities remain evenly distributed across all states (~25% each).
                      </p>
                      <p className="text-[11px] text-amber-300/90 pt-1">
                        <strong>Why did this happen?</strong> Because the Diffusion operator was omitted! The Oracle changed the quantum phase, but phase differences are physically unobservable in computational basis measurement without interference.
                      </p>
                    </div>
                  )}

                  {/* Telemetry info */}
                  <div className="text-[11px] text-slate-500 flex justify-between items-center border-t border-white/5 pt-3">
                    <span>Target: <strong className="text-cyan-400 font-mono">|{targetState}⟩</strong></span>
                    <span>Backend: <strong className="text-slate-400 font-mono">Qiskit Aer</strong></span>
                    <span>Shots: <strong className="text-slate-400 font-mono">{result.shots}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
