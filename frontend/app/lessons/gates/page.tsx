"use client";

import { useState } from "react";
import { runSimulation, SimulationApiError } from "@/lib/api/simulation";
import { CircuitSchema, GATE_DEFINITIONS, GateType, SimulationResultSchema } from "@/lib/types/quantum";
import { BlochSphere, BlochState, BLOCH_PRESETS } from "@/components/visualization/BlochSphere";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Play, Sparkles, AlertCircle, Info, RefreshCw, ArrowRight, ArrowRightLeft, Layers } from "lucide-react";
import Link from "next/link";

type InitialStateKey = "|0⟩" | "|1⟩" | "|+⟩" | "|-⟩";

// Transformation dictionary mapping (Gate + InitialState) -> Output Bloch State
const GATE_TRANSFORMATIONS: Record<
  GateType,
  Record<InitialStateKey, { state: BlochState; phaseNote?: string }>
> = {
  H: {
    "|0⟩": { state: BLOCH_PRESETS["|+⟩"], phaseNote: "Rotates state vector 90° from +Z to +X (Superposition)" },
    "|1⟩": { state: BLOCH_PRESETS["|-⟩"], phaseNote: "Rotates state vector from -Z to -X (Superposition with -1 phase)" },
    "|+⟩": { state: BLOCH_PRESETS["|0⟩"], phaseNote: "Superposition interferes constructively back into ground state |0⟩" },
    "|-⟩": { state: BLOCH_PRESETS["|1⟩"], phaseNote: "Interferes constructively into excited state |1⟩" },
  },
  X: {
    "|0⟩": { state: BLOCH_PRESETS["|1⟩"], phaseNote: "180° rotation around X-axis: bit-flip from +Z to -Z" },
    "|1⟩": { state: BLOCH_PRESETS["|0⟩"], phaseNote: "180° rotation around X-axis: bit-flip from -Z to +Z" },
    "|+⟩": { state: BLOCH_PRESETS["|+⟩"], phaseNote: "|+⟩ is an eigenstate of X with eigenvalue +1 (unchanged)" },
    "|-⟩": { state: BLOCH_PRESETS["|-⟩"], phaseNote: "X|-⟩ = -|-⟩, state vector on Bloch sphere remains on -X" },
  },
  Y: {
    "|0⟩": { state: BLOCH_PRESETS["|1⟩"], phaseNote: "180° rotation around Y-axis: bit and phase flip to -Z" },
    "|1⟩": { state: BLOCH_PRESETS["|0⟩"], phaseNote: "180° rotation around Y-axis: bit and phase flip to +Z" },
    "|+⟩": { state: BLOCH_PRESETS["|-i⟩"], phaseNote: "Rotates equatorial state to circular basis (-Y)" },
    "|-⟩": { state: BLOCH_PRESETS["|+i⟩"], phaseNote: "Rotates equatorial state to circular basis (+Y)" },
  },
  Z: {
    "|0⟩": { state: BLOCH_PRESETS["|0⟩"], phaseNote: "Z|0⟩ = |0⟩: Eigenstate with eigenvalue +1. Measurement probabilities unchanged!" },
    "|1⟩": { state: BLOCH_PRESETS["|1⟩"], phaseNote: "Z|1⟩ = -|1⟩: Adds -1 global phase; vector remains at -Z." },
    "|+⟩": { state: BLOCH_PRESETS["|-⟩"], phaseNote: "CRITICAL: Rotates 180° around Z-axis in equatorial plane: |+⟩ becomes |-⟩!" },
    "|-⟩": { state: BLOCH_PRESETS["|+⟩"], phaseNote: "Rotates 180° around Z-axis in equatorial plane: |-⟩ becomes |+⟩!" },
  },
  S: {
    "|0⟩": { state: BLOCH_PRESETS["|0⟩"], phaseNote: "S|0⟩ = |0⟩: No effect on ground state" },
    "|1⟩": { state: BLOCH_PRESETS["|1⟩"], phaseNote: "S|1⟩ = i|1⟩: Quarter-turn phase rotation (+90°)" },
    "|+⟩": { state: BLOCH_PRESETS["|+i⟩"], phaseNote: "Quarter-turn (90°) rotation around Z-axis: points along +Y" },
    "|-⟩": { state: BLOCH_PRESETS["|-i⟩"], phaseNote: "Quarter-turn (90°) rotation around Z-axis: points along -Y" },
  },
  T: {
    "|0⟩": { state: BLOCH_PRESETS["|0⟩"], phaseNote: "T|0⟩ = |0⟩: No effect on ground state" },
    "|1⟩": { state: BLOCH_PRESETS["|1⟩"], phaseNote: "T|1⟩ = e^(iπ/4)|1⟩: π/4 phase rotation (45°)" },
    "|+⟩": { state: { name: "T|+⟩ (π/4)", theta: Math.PI / 2, phi: Math.PI / 4 }, phaseNote: "Eighth-turn (45°) rotation around Z-axis in equatorial plane" },
    "|-⟩": { state: { name: "T|-⟩ (5π/4)", theta: Math.PI / 2, phi: (5 * Math.PI) / 4 }, phaseNote: "Eighth-turn (45°) rotation around Z-axis" },
  },
  CNOT: {
    "|0⟩": { state: BLOCH_PRESETS["|0⟩"] },
    "|1⟩": { state: BLOCH_PRESETS["|1⟩"] },
    "|+⟩": { state: BLOCH_PRESETS["|+⟩"] },
    "|-⟩": { state: BLOCH_PRESETS["|-⟩"] },
  },
  CZ: {
    "|0⟩": { state: BLOCH_PRESETS["|0⟩"] },
    "|1⟩": { state: BLOCH_PRESETS["|1⟩"] },
    "|+⟩": { state: BLOCH_PRESETS["|+⟩"] },
    "|-⟩": { state: BLOCH_PRESETS["|-⟩"] },
  },
  MEASURE: {
    "|0⟩": { state: BLOCH_PRESETS["|0⟩"] },
    "|1⟩": { state: BLOCH_PRESETS["|1⟩"] },
    "|+⟩": { state: BLOCH_PRESETS["|+⟩"] },
    "|-⟩": { state: BLOCH_PRESETS["|-⟩"] },
  },
};

export default function GatesLessonPage() {
  const [selectedGate, setSelectedGate] = useState<GateType>("H");
  const [initialStateKey, setInitialStateKey] = useState<InitialStateKey>("|0⟩");
  const [blochViewMode, setBlochViewMode] = useState<"after" | "before" | "both">("both");

  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResultSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prepares circuit for live Qiskit Aer simulation
  const buildGateCircuit = (gateType: GateType, initKey: InitialStateKey): CircuitSchema => {
    if (gateType === "CNOT") {
      // 2-qubit Bell pair demo
      return {
        num_qubits: 2,
        num_classical_bits: 2,
        gates: [
          { id: "init_h", type: "H", qubits: [0] },
          { id: "cx_gate", type: "CNOT", qubits: [0, 1] },
          { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0] },
          { id: "m1", type: "MEASURE", qubits: [1], classical_bits: [1] },
        ],
        shots: 1024,
      };
    }

    if (gateType === "CZ") {
      // 2-qubit Controlled-Z demo: |+> on both qubits, then CZ(0, 1) phase inversion
      return {
        num_qubits: 2,
        num_classical_bits: 2,
        gates: [
          { id: "init_h0", type: "H", qubits: [0] },
          { id: "init_h1", type: "H", qubits: [1] },
          { id: "cz_gate", type: "CZ", qubits: [0, 1] },
          { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0] },
          { id: "m1", type: "MEASURE", qubits: [1], classical_bits: [1] },
        ],
        shots: 1024,
      };
    }

    // Single qubit state preparation
    const gates = [];
    let gid = 0;

    if (initKey === "|1⟩") {
      gates.push({ id: `prep_x_${gid++}`, type: "X" as GateType, qubits: [0] });
    } else if (initKey === "|+⟩") {
      gates.push({ id: `prep_h_${gid++}`, type: "H" as GateType, qubits: [0] });
    } else if (initKey === "|-⟩") {
      // |0> -> X -> |1> -> H -> |->
      gates.push({ id: `prep_x_${gid++}`, type: "X" as GateType, qubits: [0] });
      gates.push({ id: `prep_h_${gid++}`, type: "H" as GateType, qubits: [0] });
    }

    // Apply target gate
    gates.push({ id: `target_${gateType.toLowerCase()}_${gid++}`, type: gateType, qubits: [0] });

    // Measurement
    gates.push({ id: `m0_${gid++}`, type: "MEASURE" as GateType, qubits: [0], classical_bits: [0] });

    return {
      num_qubits: 1,
      num_classical_bits: 1,
      gates,
      shots: 1024,
    };
  };

  const handleRunGate = async () => {
    setLoading(true);
    setError(null);
    try {
      const circuit = buildGateCircuit(selectedGate, initialStateKey);
      const res = await runSimulation(circuit);
      setSimulationResult(res);
    } catch (err: unknown) {
      if (err instanceof SimulationApiError) {
        setError(err.message);
      } else {
        setError("Failed to run simulation. Please ensure FastAPI backend is running at http://localhost:8000.");
      }
    } finally {
      setLoading(false);
    }
  };

  const gateInfo = GATE_DEFINITIONS[selectedGate];
  const beforeState = BLOCH_PRESETS[initialStateKey];
  const transformation = GATE_TRANSFORMATIONS[selectedGate]?.[initialStateKey];
  const afterState = transformation?.state || beforeState;

  // Prepare chart data from probabilities
  const chartData = simulationResult
    ? Object.entries(simulationResult.probabilities).map(([state, prob]) => ({
        state: `|${state}⟩`,
        probability: Number((prob * 100).toFixed(1)),
        count: simulationResult.counts[state] || 0,
      }))
    : [];

  const gateList: GateType[] = ["H", "X", "Y", "Z", "S", "T", "CNOT", "CZ"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 shadow-xs">
          Step 02 • Core Quantum Logic & Bloch Sphere
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Interactive Quantum Gate & Bloch Sphere Explorer
        </h1>
        <p className="mt-2 text-slate-600 text-base max-w-3xl leading-relaxed">
          Quantum gates are unitary operators that rotate state vectors on the <strong>Bloch Sphere</strong>.
          Choose an initial state, observe the 3D state rotation, and run live simulations on <strong>Qiskit Aer</strong> to test whether measurement probabilities change.
        </p>
      </div>

      {/* Gate Selection Pills */}
      <div className="flex flex-wrap gap-2 p-2 bg-white rounded-2xl border border-emerald-100 shadow-xs">
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-sm font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-102"
                  : "text-slate-700 hover:text-emerald-900 hover:bg-emerald-50/60"
              }`}
            >
              <span>{def.symbol}</span>
              <span className="font-sans font-medium text-xs opacity-90 hidden sm:inline">
                {def.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Gate Study Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Gate Specs & Bloch Sphere 3D Visualization */}
        <div className="lg:col-span-7 space-y-6">
          {/* Gate Detail Card */}
          <div className="p-6 rounded-2xl bg-white border border-emerald-100/90 shadow-sm space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">
                  Gate Specification
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <span>{gateInfo.name} Gate</span>
                  <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {gateInfo.symbol}
                  </span>
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Target</span>
                <div className="text-xs font-mono text-slate-700 font-bold">
                  {gateInfo.qubitCount} {gateInfo.qubitCount === 1 ? "Qubit" : "Qubits"}
                </div>
              </div>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed">
              {gateInfo.description}
            </p>

            {/* Initial State Selector (For single-qubit gates) */}
            {selectedGate !== "CNOT" && selectedGate !== "CZ" && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Choose Initial State:
                  </span>
                  <span className="text-xs font-mono text-emerald-700 font-bold">
                    Input: {initialStateKey}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(["|0⟩", "|1⟩", "|+⟩", "|-⟩"] as InitialStateKey[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setInitialStateKey(st);
                        setSimulationResult(null);
                      }}
                      className={`py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                        initialStateKey === st
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Crucial Concept Callouts */}
            {selectedGate === "Z" && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1.5 shadow-xs">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Info className="h-4 w-4 text-amber-600" /> Crucial Quantum Concept: Phase vs Probability
                </div>
                <p>
                  Notice that <strong className="font-mono">Z|0⟩ = |0⟩</strong> and <strong className="font-mono">Z|1⟩ = -|1⟩</strong>.
                  Measuring in the computational basis ($Z$-basis) yields 100% $|0⟩$ or 100% $|1⟩$ — the probabilities do not change!
                </p>
                <p>
                  However, when applied to a superposition state like <strong className="font-mono">|+⟩</strong>,
                  the Z gate performs a <strong>180° equatorial rotation to |-⟩</strong>.
                  This relative phase is what causes constructive or destructive interference in Grover&apos;s Algorithm!
                </p>
              </div>
            )}

            {selectedGate === "H" && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs leading-relaxed space-y-1 shadow-xs">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Sparkles className="h-4 w-4 text-emerald-600" /> Superposition Transformation
                </div>
                <p>
                  The Hadamard gate maps the longitudinal computational basis ($+Z \leftrightarrow -Z$) to the transversal equatorial basis ($+X \leftrightarrow -X$).
                  It creates equal amplitude superposition: <span className="font-mono">H|0⟩ = (|0⟩ + |1⟩) / √2 = |+⟩</span>.
                </p>
              </div>
            )}

            {selectedGate === "CNOT" && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs leading-relaxed space-y-1 shadow-xs">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <Layers className="h-4 w-4 text-rose-600" /> Entanglement & Why Bloch Spheres Don&apos;t Apply Here
                </div>
                <p>
                  The Bloch sphere is strictly defined for a <strong>single isolated qubit</strong>.
                  When CNOT is applied to (|0⟩ + |1⟩)/√2 ⊗ |0⟩, it generates the maximally entangled Bell state:
                  <br />
                  <span className="font-mono font-bold text-rose-900 mt-1 block">|Φ⁺⟩ = (|00⟩ + |11⟩) / √2</span>
                  Entangled states cannot be factored into independent single-qubit states |ψ₁⟩ ⊗ |ψ₂⟩, meaning individual qubits have mixed reduced density matrices and cannot be represented as pure vectors on a single Bloch sphere!
                </p>
              </div>
            )}

            {selectedGate === "CZ" && (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 text-xs leading-relaxed space-y-1 shadow-xs">
                <div className="font-bold flex items-center gap-1.5 text-teal-800">
                  <Layers className="h-4 w-4 text-teal-600" /> Controlled-Z (CZ) & Grover Phase Inversion
                </div>
                <p>
                  The Controlled-Z gate is symmetric between both qubits:
                  <br />
                  <span className="font-mono font-bold text-teal-900 mt-1 block">CZ|11⟩ = -|11⟩, while CZ|00⟩, CZ|01⟩, CZ|10⟩ are unchanged.</span>
                  Because it acts directly on two qubits without basis-change overhead, CZ is the fundamental engine for the Grover Oracle and Diffusion operator!
                </p>
              </div>
            )}

            {/* Circuit wiring summary & Run Button */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Circuit Wire Preview</span>
                <div className="font-mono text-xs text-emerald-800 bg-emerald-50/60 px-3 py-2 rounded-lg border border-emerald-100 mt-1">
                  {selectedGate === "CNOT" ? (
                    <div>
                      <div>q0: |0⟩ ─── H ───●─── M(0)</div>
                      <div className="text-slate-400 pl-14">│</div>
                      <div>q1: |0⟩ ────────X─── M(1)</div>
                    </div>
                  ) : selectedGate === "CZ" ? (
                    <div>
                      <div>q0: |0⟩ ─── H ───●─── M(0)</div>
                      <div className="text-teal-400 pl-14">│</div>
                      <div>q1: |0⟩ ─── H ───Z─── M(1)</div>
                    </div>
                  ) : (
                    <div>
                      q0: {initialStateKey} ─── [ {selectedGate} ] ─── M(0)
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleRunGate}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
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

          {/* Bloch Sphere Transformation Section (Single-qubit gates) */}
          {selectedGate !== "CNOT" && selectedGate !== "CZ" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
                  Bloch Sphere Transformation: {initialStateKey} → {selectedGate}({initialStateKey})
                </h3>

                {/* View toggle */}
                <div className="flex items-center gap-1 bg-white border border-emerald-100 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setBlochViewMode("before")}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      blochViewMode === "before"
                        ? "bg-emerald-100 text-emerald-900"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Before
                  </button>
                  <button
                    onClick={() => setBlochViewMode("after")}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      blochViewMode === "after"
                        ? "bg-emerald-100 text-emerald-900"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    After Gate
                  </button>
                  <button
                    onClick={() => setBlochViewMode("both")}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      blochViewMode === "both"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Side by Side
                  </button>
                </div>
              </div>

              {/* Bloch Spheres Grid */}
              <div
                className={`grid gap-4 ${
                  blochViewMode === "both" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                }`}
              >
                {(blochViewMode === "before" || blochViewMode === "both") && (
                  <BlochSphere
                    state={beforeState}
                    title={`Before: ${initialStateKey}`}
                    size={280}
                    showPresets={false}
                    className="w-full"
                  />
                )}
                {(blochViewMode === "after" || blochViewMode === "both") && (
                  <BlochSphere
                    state={afterState}
                    title={`After ${selectedGate}: ${afterState.name?.split(" ")[0] || "|ψ⟩"}`}
                    size={280}
                    showPresets={false}
                    className="w-full border-emerald-300 ring-2 ring-emerald-500/20"
                  />
                )}
              </div>

              {transformation?.phaseNote && (
                <div className="p-3.5 rounded-xl bg-white border border-emerald-100 text-xs text-slate-700 flex items-start gap-2 shadow-xs">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-900 block font-bold">Transformation Insight:</strong>
                    {transformation.phaseNote}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Aer Simulation Results */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 p-6 rounded-2xl bg-white border border-emerald-100/90 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Simulation Output</h3>
                <p className="text-xs text-slate-500">Live 1,024 Shots from Qiskit Aer</p>
              </div>
              {simulationResult && (
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {simulationResult.execution_time_ms} ms
                </span>
              )}
            </div>

            {error && (
              <div className="my-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Simulator Communication Error</strong>
                  {error}
                </div>
              </div>
            )}

            {!simulationResult && !loading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Play className="h-10 w-10 text-emerald-600/40 mb-3" />
                <p className="text-sm font-bold text-slate-700">No simulation results yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Click <strong className="text-emerald-700">&quot;Run Gate on Aer&quot;</strong> to simulate the circuit and observe measured computational basis probabilities.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-900">Executing Qiskit Aer Simulator...</p>
                <p className="text-xs text-slate-500 mt-1">Generating 1,024 quantum measurement shots</p>
              </div>
            )}

            {simulationResult && !loading && (
              <div className="flex-1 flex flex-col justify-between pt-4 space-y-6">
                {/* Recharts Bar Chart */}
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="state" stroke="#64748b" fontSize={12} tickLine={false} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        domain={[0, 100]}
                        tickFormatter={(val: number) => `${val}%`}
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
                            fill={entry.probability > 0 ? "#059669" : "#cbd5e1"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table Breakdown */}
                <div className="rounded-xl border border-emerald-100 overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-emerald-50/80 px-4 py-2 font-bold text-emerald-900 border-b border-emerald-100">
                    <div>State</div>
                    <div className="text-center">Count</div>
                    <div className="text-right">Probability</div>
                  </div>
                  {chartData.map((d) => (
                    <div
                      key={d.state}
                      className="grid grid-cols-3 px-4 py-2 text-slate-800 border-b border-slate-100 last:border-0 hover:bg-slate-50 font-mono"
                    >
                      <div className="font-bold text-emerald-700">{d.state}</div>
                      <div className="text-center text-slate-500">{d.count} / 1024</div>
                      <div className="text-right font-bold text-slate-900">{d.probability}%</div>
                    </div>
                  ))}
                </div>

                {/* Telemetry info */}
                <div className="text-[11px] text-slate-500 flex justify-between items-center border-t border-slate-100 pt-3">
                  <span>Backend: <strong className="text-emerald-800 font-mono">Qiskit Aer</strong></span>
                  <span>Depth: <strong className="text-slate-800 font-mono">{simulationResult.circuit_metadata.depth}</strong></span>
                  <span>Shots: <strong className="text-slate-800 font-mono">{simulationResult.shots}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Next Step Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Ready to build multi-qubit algorithms?</h3>
          <p className="text-xs text-slate-600 mt-1">
            Open the Circuit Lab to assemble step-based multi-qubit circuits and inspect full probability distributions.
          </p>
        </div>
        <Link
          href="/circuit-lab"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          Open Circuit Lab <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
