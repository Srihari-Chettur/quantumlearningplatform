"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { runSimulation, SimulationApiError } from "@/lib/api/simulation";
import {
  CircuitSchema,
  GateSchema,
  GateType,
  GATE_DEFINITIONS,
  SimulationResultSchema,
} from "@/lib/types/quantum";
import {
  Play,
  Trash2,
  RotateCcw,
  Plus,
  Minus,
  AlertCircle,
  Clock,
  Cpu,
  Info,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function CircuitLabContent() {
  const searchParams = useSearchParams();
  const initialPreset = searchParams.get("preset");

  const [numQubits, setNumQubits] = useState<number>(() => {
    if (initialPreset === "h") return 1;
    return 2;
  });
  const [shots, setShots] = useState<number>(1024);
  const [gates, setGates] = useState<GateSchema[]>(() => {
    if (initialPreset === "h") {
      return [
        { id: "h0", type: "H", qubits: [0] },
        { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0] },
      ];
    }
    if (initialPreset === "grover") {
      return [
        { id: "h0", type: "H", qubits: [0] },
        { id: "h1", type: "H", qubits: [1] },
        { id: "o_h", type: "H", qubits: [1] },
        { id: "o_cx", type: "CNOT", qubits: [0, 1] },
        { id: "o_h2", type: "H", qubits: [1] },
        { id: "d_h0", type: "H", qubits: [0] },
        { id: "d_h1", type: "H", qubits: [1] },
        { id: "d_x0", type: "X", qubits: [0] },
        { id: "d_x1", type: "X", qubits: [1] },
        { id: "d_cz_h1", type: "H", qubits: [1] },
        { id: "d_cz_cx", type: "CNOT", qubits: [0, 1] },
        { id: "d_cz_h2", type: "H", qubits: [1] },
        { id: "d_x0_end", type: "X", qubits: [0] },
        { id: "d_x1_end", type: "X", qubits: [1] },
        { id: "d_h0_end", type: "H", qubits: [0] },
        { id: "d_h1_end", type: "H", qubits: [1] },
        { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0] },
        { id: "m1", type: "MEASURE", qubits: [1], classical_bits: [1] },
      ];
    }
    // Default to Bell State
    return [
      { id: "h1", type: "H", qubits: [0] },
      { id: "cx1", type: "CNOT", qubits: [0, 1] },
      { id: "m1", type: "MEASURE", qubits: [0], classical_bits: [0] },
      { id: "m2", type: "MEASURE", qubits: [1], classical_bits: [1] },
    ];
  });
  const [selectedPaletteGate, setSelectedPaletteGate] = useState<GateType>("H");
  const [cnotControlQubit, setCnotControlQubit] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResultSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preset definitions
  const loadPreset = (name: "empty" | "h" | "bell" | "grover") => {
    setError(null);
    setResult(null);

    if (name === "empty") {
      setGates([]);
      return;
    }

    if (name === "h") {
      setNumQubits(1);
      setGates([
        { id: "h0", type: "H", qubits: [0] },
        { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0] },
      ]);
      return;
    }

    if (name === "bell") {
      setNumQubits(2);
      setGates([
        { id: "h1", type: "H", qubits: [0] },
        { id: "cx1", type: "CNOT", qubits: [0, 1] },
        { id: "m1", type: "MEASURE", qubits: [0], classical_bits: [0] },
        { id: "m2", type: "MEASURE", qubits: [1], classical_bits: [1] },
      ]);
      return;
    }

    if (name === "grover") {
      // 2-qubit Grover searching for |11>
      setNumQubits(2);
      setGates([
        { id: "h0", type: "H", qubits: [0] },
        { id: "h1", type: "H", qubits: [1] },
        // Oracle for |11|: CZ(0, 1) implemented with H-CNOT-H
        { id: "o_h", type: "H", qubits: [1] },
        { id: "o_cx", type: "CNOT", qubits: [0, 1] },
        { id: "o_h2", type: "H", qubits: [1] },
        // Diffusion Operator
        { id: "d_h0", type: "H", qubits: [0] },
        { id: "d_h1", type: "H", qubits: [1] },
        { id: "d_x0", type: "X", qubits: [0] },
        { id: "d_x1", type: "X", qubits: [1] },
        { id: "d_cz_h1", type: "H", qubits: [1] },
        { id: "d_cz_cx", type: "CNOT", qubits: [0, 1] },
        { id: "d_cz_h2", type: "H", qubits: [1] },
        { id: "d_x0_end", type: "X", qubits: [0] },
        { id: "d_x1_end", type: "X", qubits: [1] },
        { id: "d_h0_end", type: "H", qubits: [0] },
        { id: "d_h1_end", type: "H", qubits: [1] },
        // Measurements
        { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0] },
        { id: "m1", type: "MEASURE", qubits: [1], classical_bits: [1] },
      ]);
    }
  };

  // Gate manipulation handlers
  const handleAddGateToQubit = (qubitIndex: number) => {
    const id = `g_${selectedPaletteGate.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (selectedPaletteGate === "CNOT") {
      const targetQubit = qubitIndex;
      const controlQubit = cnotControlQubit === targetQubit
        ? (targetQubit === 0 ? 1 : 0)
        : cnotControlQubit;

      if (controlQubit >= numQubits || targetQubit >= numQubits) {
        setError("Both control and target qubits must be within the circuit range.");
        return;
      }

      setGates([
        ...gates,
        {
          id,
          type: "CNOT",
          qubits: [controlQubit, targetQubit],
        },
      ]);
      return;
    }

    if (selectedPaletteGate === "MEASURE") {
      // Find lowest unused classical bit
      const usedClbits = new Set(
        gates
          .filter((g) => g.type === "MEASURE" && g.classical_bits)
          .flatMap((g) => g.classical_bits || [])
      );
      let targetClbit = qubitIndex;
      if (usedClbits.has(targetClbit)) {
        for (let i = 0; i < numQubits; i++) {
          if (!usedClbits.has(i)) {
            targetClbit = i;
            break;
          }
        }
      }

      setGates([
        ...gates,
        {
          id,
          type: "MEASURE",
          qubits: [qubitIndex],
          classical_bits: [targetClbit],
        },
      ]);
      return;
    }

    // Single-qubit gate
    setGates([
      ...gates,
      {
        id,
        type: selectedPaletteGate,
        qubits: [qubitIndex],
      },
    ]);
  };

  const handleRemoveGate = (gateId: string) => {
    setGates(gates.filter((g) => g.id !== gateId));
  };

  const handleAddMeasurementAll = () => {
    const nonMeasureGates = gates.filter((g) => g.type !== "MEASURE");
    const newMeasurements: GateSchema[] = [];
    for (let q = 0; q < numQubits; q++) {
      newMeasurements.push({
        id: `m_${q}_${Date.now()}`,
        type: "MEASURE",
        qubits: [q],
        classical_bits: [q],
      });
    }
    setGates([...nonMeasureGates, ...newMeasurements]);
  };

  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);

    // Verify measurement is present
    const hasMeasure = gates.some((g) => g.type === "MEASURE");
    if (!hasMeasure) {
      setError("Circuit must contain at least one MEASURE gate. Click 'Measure All' or add measurement gates.");
      setLoading(false);
      return;
    }

    const payload: CircuitSchema = {
      num_qubits: numQubits,
      num_classical_bits: numQubits,
      gates,
      shots,
    };

    try {
      const res = await runSimulation(payload);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof SimulationApiError) {
        setError(err.message);
      } else {
        setError("Error running simulation on backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = result
    ? Object.entries(result.probabilities).map(([state, prob]) => ({
        state: `|${state}⟩`,
        probability: Number((prob * 100).toFixed(2)),
        count: result.counts[state] || 0,
      }))
    : [];

  const paletteList: GateType[] = ["H", "X", "Y", "Z", "S", "T", "CNOT", "MEASURE"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Interactive Quantum Laboratory
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Circuit Lab</h1>
          <p className="text-sm text-slate-400 mt-1">
            Construct multi-qubit circuits, configure gates, and simulate on Qiskit Aer.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
          <button
            onClick={() => loadPreset("empty")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Empty
          </button>
          <button
            onClick={() => loadPreset("h")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            H Gate
          </button>
          <button
            onClick={() => loadPreset("bell")}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
          >
            Bell State
          </button>
          <button
            onClick={() => loadPreset("grover")}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          >
            Grover&apos;s Search
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Circuit Builder Canvas & Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Palette & Controls Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-slate-400">Select Gate:</span>
                <div className="flex flex-wrap gap-1.5">
                  {paletteList.map((gType) => {
                    const def = GATE_DEFINITIONS[gType];
                    const isSelected = selectedPaletteGate === gType;
                    return (
                      <button
                        key={gType}
                        onClick={() => setSelectedPaletteGate(gType)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-cyan-500 text-slate-950 shadow-md scale-105"
                            : "bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {def.symbol}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Qubit count controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Qubits:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => {
                      if (numQubits > 1) {
                        setNumQubits(numQubits - 1);
                        setGates(gates.filter((g) => !g.qubits.some((q) => q >= numQubits - 1)));
                      }
                    }}
                    disabled={numQubits <= 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    title="Decrease Qubits"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-xs font-bold text-cyan-300 px-2">{numQubits}</span>
                  <button
                    onClick={() => {
                      if (numQubits < 5) setNumQubits(numQubits + 1);
                    }}
                    disabled={numQubits >= 5}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    title="Increase Qubits"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* CNOT Configuration Helper if CNOT is selected */}
            {selectedPaletteGate === "CNOT" && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>
                    CNOT selected: Choose control qubit, then click the target qubit wire below.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-medium text-[11px] text-slate-400">Control Qubit:</span>
                  <select
                    value={cnotControlQubit}
                    onChange={(e) => setCnotControlQubit(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 text-cyan-300 text-xs rounded-md px-2 py-1 font-mono"
                  >
                    {Array.from({ length: numQubits }).map((_, q) => (
                      <option key={q} value={q}>
                        q{q}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Helper text */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <p>
                Selected: <strong className="text-cyan-400">{GATE_DEFINITIONS[selectedPaletteGate].name}</strong> — Click any wire&apos;s <span className="font-bold text-cyan-300">[ + ]</span> button to place.
              </p>
              <button
                onClick={handleAddMeasurementAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2"
              >
                + Measure All Qubits
              </button>
            </div>
          </div>

          {/* Quantum Circuit Wires Grid */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 overflow-x-auto">
            {Array.from({ length: numQubits }).map((_, qIdx) => {
              // Extract all operations affecting this qubit
              const qubitGates = gates.filter((g) => g.qubits.includes(qIdx));

              return (
                <div key={qIdx} className="flex items-center gap-3 min-w-[550px] relative">
                  {/* Qubit Label */}
                  <div className="w-14 shrink-0 flex items-center gap-1.5 font-mono text-sm text-slate-300 font-semibold">
                    <span className="text-cyan-400">q{qIdx}:</span>
                    <span className="text-slate-500 text-xs">|0⟩</span>
                  </div>

                  {/* Wire line & Gates Track */}
                  <div className="flex-1 relative flex items-center min-h-12 py-2">
                    {/* Background Wire line */}
                    <div className="absolute inset-x-0 h-0.5 bg-slate-700 pointer-events-none" />

                    {/* Gate slots on this wire */}
                    <div className="relative z-10 flex items-center gap-3 pl-2 flex-wrap">
                      {qubitGates.map((gate) => {
                        const def = GATE_DEFINITIONS[gate.type];
                        const isCNOT = gate.type === "CNOT";
                        const isControl = isCNOT && gate.qubits[0] === qIdx;

                        return (
                          <div
                            key={gate.id}
                            className="group relative flex items-center"
                          >
                            <div
                              className={`h-9 min-w-9 px-2 rounded-lg flex items-center justify-center font-mono font-bold text-xs shadow-md border ${
                                isCNOT
                                  ? isControl
                                    ? "bg-rose-950 border-rose-500 text-rose-300"
                                    : "bg-rose-500 text-slate-950 border-rose-400"
                                  : def.bgLight + " " + def.borderColor + " " + def.color
                              }`}
                            >
                              {isCNOT ? (
                                isControl ? "● ctrl" : "⊕ target"
                              ) : gate.type === "MEASURE" ? (
                                `M[c${gate.classical_bits?.[0] ?? qIdx}]`
                              ) : (
                                def.symbol
                              )}
                            </div>

                            {/* Delete button on hover */}
                            <button
                              onClick={() => handleRemoveGate(gate.id)}
                              className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-md cursor-pointer"
                              title="Delete Gate"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}

                      {/* Add Gate to this Qubit Button */}
                      <button
                        onClick={() => handleAddGateToQubit(qIdx)}
                        className="h-8 px-2.5 rounded-lg border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/20 text-cyan-400 font-mono text-xs flex items-center gap-1 transition-all cursor-pointer"
                        title={`Place ${selectedPaletteGate} on q${qIdx}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{GATE_DEFINITIONS[selectedPaletteGate].symbol}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Circuit Execution Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
              <div>
                Qubits: <strong className="text-cyan-400">{numQubits}</strong>
              </div>
              <div>
                Gates: <strong className="text-cyan-400">{gates.length}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Shots:</span>
                <select
                  value={shots}
                  onChange={(e) => setShots(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-cyan-300 px-2 py-1 rounded text-xs"
                >
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1024}>1024</option>
                  <option value={4096}>4096</option>
                  <option value={8192}>8192</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setGates([])}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
              <button
                onClick={() => loadPreset("bell")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Bell
              </button>

              <button
                onClick={handleRunSimulation}
                disabled={loading || gates.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin" /> Simulating...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-white" /> Run Simulation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Simulation Telemetry & Result Panel */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex-1 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-base">Results & Probability</h3>
                <p className="text-xs text-slate-400">Measurement Spectrum from Qiskit Aer</p>
              </div>
              {result && (
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {result.execution_time_ms} ms
                </span>
              )}
            </div>

            {error && (
              <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Simulation Error</strong>
                  {error}
                </div>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Cpu className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400">Ready for Simulation</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Construct your circuit on the left and click <strong className="text-cyan-400">&quot;Run Simulation&quot;</strong>.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mb-3" />
                <p className="text-sm font-semibold text-white">Transpiling & Simulating...</p>
                <p className="text-xs text-slate-400 mt-1">Executing on Qiskit Aer backend</p>
              </div>
            )}

            {result && !loading && (
              <div className="flex-1 flex flex-col justify-between pt-4 space-y-6">
                {/* Bar Chart */}
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
                            fill={entry.probability > 0 ? "#06b6d4" : "#334155"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Counts vs Probabilities Table */}
                <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-slate-950/80 px-4 py-2 font-semibold text-slate-400 border-b border-slate-800">
                    <div>Basis State</div>
                    <div className="text-center">Count</div>
                    <div className="text-right">Probability</div>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-white/5 font-mono">
                    {chartData.map((d) => (
                      <div
                        key={d.state}
                        className="grid grid-cols-3 px-4 py-2 text-slate-200 hover:bg-white/5"
                      >
                        <div className="font-bold text-cyan-300">{d.state}</div>
                        <div className="text-center text-slate-400">{d.count}</div>
                        <div className="text-right font-semibold text-slate-100">{d.probability}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Execution Telemetry Summary */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Simulation Engine:</span>
                    <strong className="text-slate-200 font-mono">Qiskit Aer</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Circuit Depth:</span>
                    <strong className="text-slate-200 font-mono">{result.circuit_metadata.depth}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Gates:</span>
                    <strong className="text-slate-200 font-mono">{result.circuit_metadata.gate_count}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Measurement Shots:</span>
                    <strong className="text-slate-200 font-mono">{result.shots}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CircuitLabPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Circuit Lab...</div>}>
      <CircuitLabContent />
    </Suspense>
  );
}
