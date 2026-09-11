"use client";

import { useState } from "react";
import { runSimulation, SimulationApiError } from "@/lib/api/simulation";
import { CircuitSchema, GATE_DEFINITIONS, GateType, SimulationResultSchema } from "@/lib/types/quantum";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Play, Sparkles, AlertCircle, Info, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function GatesLessonPage() {
  const [selectedGate, setSelectedGate] = useState<GateType>("H");
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResultSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prepares the mini-circuit for each gate
  const buildGateCircuit = (gateType: GateType): CircuitSchema => {
    if (gateType === "CNOT") {
      // 2 qubits: initialize q0 with X so control is |1>, flipping q1 from |0> to |1>!
      return {
        num_qubits: 2,
        num_classical_bits: 2,
        gates: [
          { id: "prep_x", type: "X", qubits: [0] },
          { id: "cx_gate", type: "CNOT", qubits: [0, 1] },
          { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0] },
          { id: "m1", type: "MEASURE", qubits: [1], classical_bits: [1] },
        ],
        shots: 1024,
      };
    }

    // Single qubit gates on |0>:
    return {
      num_qubits: 1,
      num_classical_bits: 1,
      gates: [
        { id: `gate_${gateType.toLowerCase()}`, type: gateType, qubits: [0] },
        { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0] },
      ],
      shots: 1024,
    };
  };

  const handleRunGate = async (gateType: GateType) => {
    setLoading(true);
    setError(null);
    try {
      const circuit = buildGateCircuit(gateType);
      const res = await runSimulation(circuit);
      setSimulationResult(res);
    } catch (err: unknown) {
      if (err instanceof SimulationApiError) {
        setError(err.message);
      } else {
        setError("Failed to run simulation. Please ensure FastAPI backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  const gateInfo = GATE_DEFINITIONS[selectedGate];

  // Prepare chart data from probabilities
  const chartData = simulationResult
    ? Object.entries(simulationResult.probabilities).map(([state, prob]) => ({
        state: `|${state}⟩`,
        probability: Number((prob * 100).toFixed(1)),
        count: simulationResult.counts[state] || 0,
      }))
    : [];

  const gateList: GateType[] = ["H", "X", "Y", "Z", "S", "T", "CNOT"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Step 02 • Core Quantum Logic
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Interactive Quantum Gate Explorer
        </h1>
        <p className="mt-2 text-slate-400 text-base max-w-3xl">
          Quantum gates are unitary operators that manipulate qubit state vectors. Test each gate interactively, observe real sampled probabilities on Qiskit Aer, and discover why some phase gates don&apos;t immediately change computational basis measurements.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Gate Selector & Explanation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Gate Selection Pills */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800">
            {gateList.map((gType) => {
              const def = GATE_DEFINITIONS[gType];
              const isSelected = selectedGate === gType;
              return (
                <button
                  key={gType}
                  onClick={() => {
                    setSelectedGate(gType);
                    setSimulationResult(null);
                    setError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-sm font-bold transition-all ${
                    isSelected
                      ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 scale-[1.02]"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{def.symbol}</span>
                  <span className="font-sans font-medium text-xs opacity-80 hidden sm:inline">
                    {def.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Gate Detail Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Gate Specification
                </span>
                <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                  <span>{gateInfo.name} Gate</span>
                  <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-white/10 text-cyan-300 border border-white/10">
                    {gateInfo.symbol}
                  </span>
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Target</span>
                <div className="text-xs font-mono text-slate-200 font-semibold">
                  {gateInfo.qubitCount} {gateInfo.qubitCount === 1 ? "Qubit" : "Qubits"}
                </div>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed">
              {gateInfo.description}
            </p>

            {/* Special Concept Callouts */}
            {selectedGate === "H" && (
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-sky-300">
                  <Sparkles className="h-4 w-4" /> The Superposition Creator
                </div>
                <p>
                  Applying H to ground state |0⟩ produces |ψ⟩ = (|0⟩ + |1⟩) / √2. Upon measurement, it collapses to 0 with 50% probability and 1 with 50% probability.
                </p>
              </div>
            )}

            {selectedGate === "X" && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> The Quantum Bit-Flip
                </div>
                <p>
                  Analogous to classical NOT, the Pauli-X gate rotates the state vector 180° around the X-axis of the Bloch sphere, turning |0⟩ into |1⟩ with 100% deterministic measurement.
                </p>
              </div>
            )}

            {selectedGate === "Z" && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <Info className="h-4 w-4" /> Crucial Quantum Concept: Phase vs Probability
                </div>
                <p>
                  Notice that Z|0⟩ = |0⟩. Because |0⟩ is an eigenstate with eigenvalue +1, measurement probabilities remain 100% |0⟩. If applied to |1⟩, it adds a -1 phase flip (Z|1⟩ = -|1⟩).
                  <br />
                  <strong className="text-amber-100 font-semibold">Takeaway:</strong> Not every quantum operation changes measurement probabilities immediately! Relative phases become observable through interference (such as in Grover&apos;s algorithm).
                </p>
              </div>
            )}

            {selectedGate === "S" && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-indigo-300">
                  <Info className="h-4 w-4" /> Quarter-Turn Phase
                </div>
                <p>
                  The S gate is the square root of the Z gate (S² = Z). It applies a phase rotation of e^(iπ/2) = i to the |1⟩ component while leaving |0⟩ untouched.
                </p>
              </div>
            )}

            {selectedGate === "T" && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-purple-300">
                  <Info className="h-4 w-4" /> The Universal Gate (π/8)
                </div>
                <p>
                  The T gate adds a phase rotation of π/4 (45°), making T² = S. Together with H and CNOT, the T gate provides a universal set of quantum gates for fault-tolerant computation.
                </p>
              </div>
            )}

            {selectedGate === "CNOT" && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                  <Info className="h-4 w-4" /> Two-Qubit Entanglement Engine
                </div>
                <p>
                  In this demo circuit, we initialize qubit 0 with an X gate to |1⟩, and feed it as control into CNOT. Because the control is |1⟩, qubit 1 flips from |0⟩ to |1⟩, yielding state |11⟩ (where rightmost bit is qubit 0, leftmost is qubit 1).
                </p>
              </div>
            )}

            {/* Circuit Wire Representation */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Circuit Wiring</span>
                <div className="font-mono text-xs text-cyan-300 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 mt-1">
                  {selectedGate === "CNOT" ? (
                    <div>
                      <div>q0: |0⟩ ─── X ───●─── M(0)</div>
                      <div className="text-slate-500 pl-14">│</div>
                      <div>q1: |0⟩ ────────X─── M(1)</div>
                    </div>
                  ) : (
                    <div>q0: |0⟩ ─── [ {selectedGate} ] ─── M(0)</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleRunGate(selectedGate)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Simulating on Aer...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    Run Gate on Aer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Simulation Results Panel */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-base">Simulation Output</h3>
                <p className="text-xs text-slate-400">Live 1,024 Shots from Qiskit Aer</p>
              </div>
              {simulationResult && (
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {simulationResult.execution_time_ms} ms
                </span>
              )}
            </div>

            {error && (
              <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Simulator Communication Error</strong>
                  {error}
                </div>
              </div>
            )}

            {!simulationResult && !loading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Play className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400">No simulation results yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Click <strong className="text-cyan-400">&quot;Run Gate on Aer&quot;</strong> to simulate the circuit and calculate basis state probabilities.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mb-3" />
                <p className="text-sm font-semibold text-white">Executing Qiskit Aer Simulator...</p>
                <p className="text-xs text-slate-400 mt-1">Generating 1,024 quantum measurement shots</p>
              </div>
            )}

            {simulationResult && !loading && (
              <div className="flex-1 flex flex-col justify-between pt-4 space-y-6">
                {/* Recharts Bar Chart */}
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="state" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        domain={[0, 100]}
                        tickFormatter={(val: number) => `${val}%`}
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
                            fill={entry.probability > 0 ? "#06b6d4" : "#334155"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table Breakdown */}
                <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-slate-950/80 px-4 py-2 font-semibold text-slate-400 border-b border-slate-800">
                    <div>State</div>
                    <div className="text-center">Count</div>
                    <div className="text-right">Probability</div>
                  </div>
                  {chartData.map((d) => (
                    <div
                      key={d.state}
                      className="grid grid-cols-3 px-4 py-2 text-slate-200 border-b border-white/5 last:border-0 hover:bg-white/5 font-mono"
                    >
                      <div className="font-bold text-cyan-300">{d.state}</div>
                      <div className="text-center text-slate-400">{d.count} / 1024</div>
                      <div className="text-right font-semibold text-slate-100">{d.probability}%</div>
                    </div>
                  ))}
                </div>

                {/* Telemetry info */}
                <div className="text-[11px] text-slate-500 flex justify-between items-center border-t border-white/5 pt-3">
                  <span>Backend: <strong className="text-slate-400 font-mono">Qiskit Aer</strong></span>
                  <span>Depth: <strong className="text-slate-400 font-mono">{simulationResult.circuit_metadata.depth}</strong></span>
                  <span>Shots: <strong className="text-slate-400 font-mono">{simulationResult.shots}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Next Step Banner */}
      <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-base">Ready to assemble multiple gates?</h3>
          <p className="text-xs text-slate-400 mt-1">
            Hop into the Circuit Lab to combine gates into multi-qubit algorithms like the Bell State and Grover&apos;s search.
          </p>
        </div>
        <Link
          href="/circuit-lab"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shrink-0"
        >
          Open Circuit Lab <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
