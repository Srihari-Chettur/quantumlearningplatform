"use client";

import { Suspense, useState, useId, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { runSimulation, SimulationApiError } from "@/lib/api/simulation";
import {
  CircuitSchema,
  GateSchema,
  GateType,
  GATE_DEFINITIONS,
  SimulationResultSchema,
} from "@/lib/types/quantum";
import { BlochSphere, BlochState, BLOCH_PRESETS } from "@/components/visualization/BlochSphere";
import { AITutorPanel } from "@/components/AITutorPanel";
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
  Code2,
  LayoutGrid,
  CheckCircle2,
  Compass,
  Target,
  Terminal,
  Sparkles,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type GroverTarget = "00" | "01" | "10" | "11";

interface StepGate extends GateSchema {
  step: number;
}

function buildGroverPresetGates(
  target: GroverTarget,
  idPrefix: string = "g"
): { gates: StepGate[]; numSteps: number } {
  const gates: StepGate[] = [];
  let step = 0;
  let idx = 0;

  // 1. Initial Superposition
  gates.push({ id: `${idPrefix}_h0_${idx++}`, type: "H", qubits: [0], step });
  gates.push({ id: `${idPrefix}_h1_${idx++}`, type: "H", qubits: [1], step });
  step++;

  // 2. Oracle Stage: inverts relative phase of target state |w>
  // Target bit ordering: target[0] corresponds to q1, target[1] corresponds to q0
  const q1_val = Number(target[0]);
  const q0_val = Number(target[1]);
  const needsX = q0_val === 0 || q1_val === 0;

  if (needsX) {
    // Pre-X bit flips for 0-bits
    if (q0_val === 0) gates.push({ id: `${idPrefix}_o_pre_x0_${idx++}`, type: "X", qubits: [0], step });
    if (q1_val === 0) gates.push({ id: `${idPrefix}_o_pre_x1_${idx++}`, type: "X", qubits: [1], step });
    step++;

    // Native Controlled-Z gate (symmetric phase flip)
    gates.push({ id: `${idPrefix}_o_cz_${idx++}`, type: "CZ", qubits: [0, 1], step });
    step++;

    // Post-X uncompute bit flips
    if (q0_val === 0) gates.push({ id: `${idPrefix}_o_post_x0_${idx++}`, type: "X", qubits: [0], step });
    if (q1_val === 0) gates.push({ id: `${idPrefix}_o_post_x1_${idx++}`, type: "X", qubits: [1], step });
    step++;
  } else {
    // For |11>, both bits are 1: direct CZ(0, 1)
    gates.push({ id: `${idPrefix}_o_cz_${idx++}`, type: "CZ", qubits: [0, 1], step });
    step++;
  }

  // 3. Grover Diffusion Operator (Inversion about mean: H -> X -> CZ -> X -> H)
  gates.push({ id: `${idPrefix}_d_h0_${idx++}`, type: "H", qubits: [0], step });
  gates.push({ id: `${idPrefix}_d_h1_${idx++}`, type: "H", qubits: [1], step });
  step++;

  gates.push({ id: `${idPrefix}_d_x0_${idx++}`, type: "X", qubits: [0], step });
  gates.push({ id: `${idPrefix}_d_x1_${idx++}`, type: "X", qubits: [1], step });
  step++;

  gates.push({ id: `${idPrefix}_d_cz_${idx++}`, type: "CZ", qubits: [0, 1], step });
  step++;

  gates.push({ id: `${idPrefix}_d_x0_post_${idx++}`, type: "X", qubits: [0], step });
  gates.push({ id: `${idPrefix}_d_x1_post_${idx++}`, type: "X", qubits: [1], step });
  step++;

  gates.push({ id: `${idPrefix}_d_h0_post_${idx++}`, type: "H", qubits: [0], step });
  gates.push({ id: `${idPrefix}_d_h1_post_${idx++}`, type: "H", qubits: [1], step });
  step++;

  // 4. Measurement
  gates.push({ id: `${idPrefix}_m0_${idx++}`, type: "MEASURE", qubits: [0], classical_bits: [0], step });
  gates.push({ id: `${idPrefix}_m1_${idx++}`, type: "MEASURE", qubits: [1], classical_bits: [1], step });
  step++;

  return { gates, numSteps: Math.max(step, 8) };
}

function CircuitLabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");

  const triggerAI = (promptText: string) => {
    setAiPrompt(promptText);
    setAiPanelOpen(true);
  };
  const initialPreset = searchParams.get("preset");
  const initialTargetParam = searchParams.get("target") as GroverTarget | null;
  const initialTarget: GroverTarget =
    initialTargetParam === "00" ||
    initialTargetParam === "01" ||
    initialTargetParam === "10" ||
    initialTargetParam === "11"
      ? initialTargetParam
      : "11";

  const uniquePrefix = useId().replace(/:/g, "_");
  const gateCounterRef = useRef<number>(1);

  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [activePreset, setActivePreset] = useState<"empty" | "h" | "bell" | "grover" | "custom">(() => {
    if (initialPreset === "grover") return "grover";
    if (initialPreset === "h") return "h";
    if (initialPreset === "empty") return "empty";
    return "bell";
  });
  const [groverTarget, setGroverTarget] = useState<GroverTarget>(initialTarget);

  const [numQubits, setNumQubits] = useState<number>(() => {
    if (initialPreset === "h") return 1;
    return 2;
  });
  const [numSteps, setNumSteps] = useState<number>(() => {
    if (initialPreset === "grover") {
      return initialTarget === "11" ? 8 : 10;
    }
    return 6;
  });
  const [shots, setShots] = useState<number>(1024);

  // Gates stored with an explicit step column index
  const [gates, setGates] = useState<StepGate[]>(() => {
    if (initialPreset === "h") {
      return [
        { id: "h0", type: "H", qubits: [0], step: 0 },
        { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0], step: 1 },
      ];
    }
    if (initialPreset === "grover") {
      const res = buildGroverPresetGates(initialTarget, "init");
      return res.gates;
    }
    // Default Bell State
    return [
      { id: "h0", type: "H", qubits: [0], step: 0 },
      { id: "cx0", type: "CNOT", qubits: [0, 1], step: 1 },
      { id: "m0", type: "MEASURE", qubits: [0], classical_bits: [0], step: 2 },
      { id: "m1", type: "MEASURE", qubits: [1], classical_bits: [1], step: 2 },
    ];
  });

  const [selectedPaletteGate, setSelectedPaletteGate] = useState<GateType>("H");
  const [cnotControlQubit, setCnotControlQubit] = useState<number>(0);

  // JSON Input tab state
  const [jsonText, setJsonText] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<boolean>(false);

  // Simulation state
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResultSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Single-Qubit Bloch Sphere toggle
  const [showBlochViewer, setShowBlochViewer] = useState<boolean>(true);

  // Grover Oracle Target Card toggle for 2 qubits
  const [showGroverOracleCard, setShowGroverOracleCard] = useState<boolean>(true);

  // Synchronize JSON view when switching tabs
  const handleSwitchTab = (tab: "visual" | "json") => {
    if (tab === "json") {
      const cleanCircuit: CircuitSchema = {
        num_qubits: numQubits,
        num_classical_bits: numQubits,
        gates: gates.map(({ id, type, qubits, classical_bits }) => ({
          id,
          type,
          qubits,
          ...(classical_bits ? { classical_bits } : {}),
        })),
        shots,
      };
      setJsonText(JSON.stringify(cleanCircuit, null, 2));
      setJsonError(null);
      setJsonSuccess(false);
    }
    setActiveTab(tab);
  };

  // Validate and Apply JSON
  const handleApplyJson = () => {
    setJsonError(null);
    setJsonSuccess(false);
    setError(null);

    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("JSON root must be an object.");
      }

      if (typeof parsed.num_qubits !== "number" || parsed.num_qubits < 1 || parsed.num_qubits > 5) {
        throw new Error("Field 'num_qubits' must be an integer between 1 and 5.");
      }

      if (!Array.isArray(parsed.gates)) {
        throw new Error("Field 'gates' must be an array of gate objects.");
      }

      const validGateTypes: GateType[] = ["H", "X", "Y", "Z", "S", "T", "CNOT", "CZ", "MEASURE"];
      const seenIds = new Set<string>();
      const newGates: StepGate[] = [];

      for (let i = 0; i < parsed.gates.length; i++) {
        const g = parsed.gates[i];
        if (!g.id || typeof g.id !== "string") {
          throw new Error(`Gate at index ${i} must have a non-empty string 'id'.`);
        }
        if (seenIds.has(g.id)) {
          throw new Error(`Duplicate gate ID '${g.id}' found. Every gate must have a unique ID.`);
        }
        seenIds.add(g.id);

        if (!validGateTypes.includes(g.type)) {
          throw new Error(`Gate '${g.id}' has invalid type '${g.type}'. Must be one of: ${validGateTypes.join(", ")}`);
        }

        if (!Array.isArray(g.qubits) || g.qubits.length === 0) {
          throw new Error(`Gate '${g.id}' must specify a non-empty 'qubits' array.`);
        }

        for (const q of g.qubits) {
          if (typeof q !== "number" || q < 0 || q >= parsed.num_qubits) {
            throw new Error(`Gate '${g.id}' references qubit ${q}, which exceeds circuit bounds (0 to ${parsed.num_qubits - 1}).`);
          }
        }

        if ((g.type === "CNOT" || g.type === "CZ") && g.qubits.length !== 2) {
          throw new Error(`${g.type} gate '${g.id}' must specify exactly 2 qubits: [control, target].`);
        }

        if ((g.type === "CNOT" || g.type === "CZ") && g.qubits[0] === g.qubits[1]) {
          throw new Error(`${g.type} gate '${g.id}' cannot have identical control and target qubit (${g.qubits[0]}).`);
        }

        // Assign step column automatically if not given
        const step = typeof g.step === "number" ? g.step : i % 8;
        newGates.push({
          id: g.id,
          type: g.type,
          qubits: g.qubits,
          classical_bits: g.classical_bits,
          step,
        });
      }

      // Max step calculation
      const maxStepInJson = newGates.reduce((max, g) => Math.max(max, g.step), 0);
      setNumSteps(Math.max(6, maxStepInJson + 2));
      setNumQubits(parsed.num_qubits);
      if (typeof parsed.shots === "number") setShots(parsed.shots);
      setGates(newGates);
      setJsonSuccess(true);
      setTimeout(() => setJsonSuccess(false), 3500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setJsonError(err.message);
      } else {
        setJsonError("Malformed JSON. Please verify syntax.");
      }
    }
  };

  // Preset definitions
  const loadPreset = (name: "empty" | "h" | "bell" | "grover", target: GroverTarget = groverTarget) => {
    setError(null);
    setResult(null);
    setActivePreset(name);

    if (name === "empty") {
      setGates([]);
      return;
    }

    if (name === "h") {
      setNumQubits(1);
      setNumSteps(6);
      setGates([
        { id: `h0_${gateCounterRef.current++}`, type: "H", qubits: [0], step: 0 },
        { id: `m0_${gateCounterRef.current++}`, type: "MEASURE", qubits: [0], classical_bits: [0], step: 1 },
      ]);
      return;
    }

    if (name === "bell") {
      setNumQubits(2);
      setNumSteps(6);
      setGates([
        { id: `h0_${gateCounterRef.current++}`, type: "H", qubits: [0], step: 0 },
        { id: `cx0_${gateCounterRef.current++}`, type: "CNOT", qubits: [0, 1], step: 1 },
        { id: `m0_${gateCounterRef.current++}`, type: "MEASURE", qubits: [0], classical_bits: [0], step: 2 },
        { id: `m1_${gateCounterRef.current++}`, type: "MEASURE", qubits: [1], classical_bits: [1], step: 2 },
      ]);
      return;
    }

    if (name === "grover") {
      setGroverTarget(target);
      setNumQubits(2);
      const res = buildGroverPresetGates(target, `p_${gateCounterRef.current++}`);
      setNumSteps(res.numSteps);
      setGates(res.gates);
    }
  };

  // Insert ONLY the Oracle stage for the chosen target at the next available step
  const handleInsertOracleOnly = (target: GroverTarget = groverTarget) => {
    if (numQubits < 2) {
      setError("Grover Oracle requires at least 2 qubits (q0 and q1).");
      return;
    }
    const maxStep = gates.reduce((max, g) => Math.max(max, g.step), -1);
    let step = maxStep + 1;

    const q1_val = Number(target[0]);
    const q0_val = Number(target[1]);
    const needsX = q0_val === 0 || q1_val === 0;
    const oracleGates: StepGate[] = [];

    if (needsX) {
      if (q0_val === 0) oracleGates.push({ id: `o_pre_x0_${gateCounterRef.current++}`, type: "X", qubits: [0], step });
      if (q1_val === 0) oracleGates.push({ id: `o_pre_x1_${gateCounterRef.current++}`, type: "X", qubits: [1], step });
      step++;

      oracleGates.push({ id: `o_cz_${gateCounterRef.current++}`, type: "CZ", qubits: [0, 1], step });
      step++;

      if (q0_val === 0) oracleGates.push({ id: `o_post_x0_${gateCounterRef.current++}`, type: "X", qubits: [0], step });
      if (q1_val === 0) oracleGates.push({ id: `o_post_x1_${gateCounterRef.current++}`, type: "X", qubits: [1], step });
      step++;
    } else {
      oracleGates.push({ id: `o_cz_${gateCounterRef.current++}`, type: "CZ", qubits: [0, 1], step });
      step++;
    }

    if (step >= numSteps) {
      setNumSteps(step + 2);
    }
    setGates([...gates, ...oracleGates]);
    setActivePreset("custom");
  };

  // Grid Cell Click: Place or Replace Gate in (targetQubit, step)
  const handleCellClick = (targetQubit: number, step: number) => {
    const existingIndex = gates.findIndex(
      (g) => g.step === step && g.qubits.includes(targetQubit)
    );

    // If there's already a gate on this exact cell, remove it
    if (existingIndex !== -1) {
      const updated = [...gates];
      updated.splice(existingIndex, 1);
      setGates(updated);
      return;
    }

    // Otherwise, place selected palette gate
    const id = `g_${selectedPaletteGate.toLowerCase()}_s${step}_q${targetQubit}_${gateCounterRef.current++}`;

    if (selectedPaletteGate === "CNOT" || selectedPaletteGate === "CZ") {
      const controlQubit = cnotControlQubit === targetQubit
        ? (targetQubit === 0 ? 1 : 0)
        : cnotControlQubit;

      if (controlQubit >= numQubits || targetQubit >= numQubits) {
        setError("Both control and target qubits must be within circuit bounds.");
        return;
      }

      // Check if control qubit is already busy in this step
      const controlBusy = gates.some((g) => g.step === step && g.qubits.includes(controlQubit));
      if (controlBusy) {
        setError(`Qubit q${controlQubit} is already occupied in Step ${step}.`);
        return;
      }

      setGates([
        ...gates,
        {
          id,
          type: selectedPaletteGate,
          qubits: [controlQubit, targetQubit],
          step,
        },
      ]);
      return;
    }

    if (selectedPaletteGate === "MEASURE") {
      // Find unused classical bit
      const usedClbits = new Set(
        gates
          .filter((g) => g.type === "MEASURE" && g.classical_bits)
          .flatMap((g) => g.classical_bits || [])
      );
      let targetClbit = targetQubit;
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
          qubits: [targetQubit],
          classical_bits: [targetClbit],
          step,
        },
      ]);
      return;
    }

    // Single qubit gate
    setGates([
      ...gates,
      {
        id,
        type: selectedPaletteGate,
        qubits: [targetQubit],
        step,
      },
    ]);
  };

  const handleRemoveGate = (gateId: string) => {
    setGates(gates.filter((g) => g.id !== gateId));
  };

  const handleAddMeasurementAll = () => {
    // Find next available step
    const maxStep = gates.reduce((max, g) => Math.max(max, g.step), -1);
    const measureStep = maxStep + 1;
    if (measureStep >= numSteps) {
      setNumSteps(measureStep + 2);
    }

    const nonMeasureGates = gates.filter((g) => g.type !== "MEASURE");
    const newMeasurements: StepGate[] = [];
    for (let q = 0; q < numQubits; q++) {
      newMeasurements.push({
        id: `m_${q}_${gateCounterRef.current++}`,
        type: "MEASURE",
        qubits: [q],
        classical_bits: [q],
        step: measureStep,
      });
    }
    setGates([...nonMeasureGates, ...newMeasurements]);
  };

  const getCircuitPayload = (): CircuitSchema => {
    const sortedGates = [...gates].sort((a, b) => a.step - b.step);
    return {
      num_qubits: numQubits,
      num_classical_bits: numQubits,
      gates: sortedGates.map(({ id, type, qubits, classical_bits }) => ({
        id,
        type,
        qubits,
        ...(classical_bits ? { classical_bits } : {}),
      })),
      shots,
    };
  };

  const handleOpenInCodeLab = () => {
    const payload = getCircuitPayload();
    const encoded = encodeURIComponent(JSON.stringify(payload));
    router.push(`/code-lab?circuit=${encoded}`);
  };

  // Run Simulation on Qiskit Aer
  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);

    const hasMeasure = gates.some((g) => g.type === "MEASURE");
    if (!hasMeasure) {
      setError("Circuit must contain at least one MEASURE gate before running. Click '+ Measure All' to attach measurement gates.");
      setLoading(false);
      return;
    }

    // Sort gates in time order by step
    const sortedGates = [...gates].sort((a, b) => a.step - b.step);

    const payload: CircuitSchema = {
      num_qubits: numQubits,
      num_classical_bits: numQubits,
      gates: sortedGates.map(({ id, type, qubits, classical_bits }) => ({
        id,
        type,
        qubits,
        ...(classical_bits ? { classical_bits } : {}),
      })),
      shots,
    };

    try {
      const res = await runSimulation(payload);
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof SimulationApiError) {
        setError(err.message);
      } else {
        setError("Error running simulation on FastAPI Aer backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate Single Qubit Bloch Sphere State Trajectory (when numQubits === 1)
  const computeSingleQubitBlochState = (): BlochState => {
    let current = BLOCH_PRESETS["|0⟩"];
    const q0Gates = [...gates]
      .filter((g) => g.qubits.includes(0) && g.type !== "MEASURE")
      .sort((a, b) => a.step - b.step);

    for (const g of q0Gates) {
      const theta = current.theta;
      const phi = current.phi;

      if (g.type === "H") {
        if (Math.abs(theta) < 0.1) current = BLOCH_PRESETS["|+⟩"];
        else if (Math.abs(theta - Math.PI) < 0.1) current = BLOCH_PRESETS["|-⟩"];
        else if (Math.abs(theta - Math.PI / 2) < 0.1 && Math.abs(phi) < 0.1) current = BLOCH_PRESETS["|0⟩"];
        else if (Math.abs(theta - Math.PI / 2) < 0.1 && Math.abs(phi - Math.PI) < 0.1) current = BLOCH_PRESETS["|1⟩"];
      } else if (g.type === "X") {
        current = { theta: Math.PI - theta, phi: (2 * Math.PI - phi) % (2 * Math.PI), name: "X-Rotated" };
      } else if (g.type === "Z") {
        current = { theta, phi: (phi + Math.PI) % (2 * Math.PI), name: "Z-Rotated" };
      } else if (g.type === "S") {
        current = { theta, phi: (phi + Math.PI / 2) % (2 * Math.PI), name: "S-Rotated" };
      } else if (g.type === "T") {
        current = { theta, phi: (phi + Math.PI / 4) % (2 * Math.PI), name: "T-Rotated" };
      }
    }
    return current;
  };

  const chartData = result
    ? Object.entries(result.probabilities).map(([state, prob]) => ({
        state: `|${state}⟩`,
        probability: Number((prob * 100).toFixed(2)),
        count: result.counts[state] || 0,
      }))
    : [];

  const paletteList: GateType[] = ["H", "X", "Y", "Z", "S", "T", "CNOT", "CZ", "MEASURE"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-emerald-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2 shadow-xs">
            Interactive Quantum Laboratory
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Circuit Lab</h1>
          <p className="text-sm text-slate-600 mt-1">
            Construct multi-qubit step-based circuits, edit machine-readable JSON, and simulate on Qiskit Aer.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Presets:</span>
          <button
            onClick={() => loadPreset("empty")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors shadow-xs cursor-pointer ${
              activePreset === "empty"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Empty
          </button>
          <button
            onClick={() => loadPreset("h")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors shadow-xs cursor-pointer ${
              activePreset === "h"
                ? "bg-emerald-700 text-white border-emerald-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            H Gate
          </button>
          <button
            onClick={() => loadPreset("bell")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors shadow-xs cursor-pointer ${
              activePreset === "bell"
                ? "bg-emerald-700 text-white border-emerald-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            Bell State
          </button>

          {/* Grover Preset with Target Selector */}
          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-teal-50 border border-teal-200 shadow-xs">
            <button
              onClick={() => loadPreset("grover", groverTarget)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePreset === "grover"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-teal-800 hover:bg-teal-100"
              }`}
            >
              Grover&apos;s Search
            </button>
            <div className="h-4 w-px bg-teal-200 mx-0.5" />
            <span className="text-[10px] font-bold uppercase text-teal-700 px-1 hidden sm:inline">
              Target:
            </span>
            {(["00", "01", "10", "11"] as GroverTarget[]).map((tgt) => (
              <button
                key={tgt}
                onClick={() => loadPreset("grover", tgt)}
                className={`px-2 py-1 rounded-md font-mono text-xs font-bold transition-all cursor-pointer ${
                  activePreset === "grover" && groverTarget === tgt
                    ? "bg-white text-teal-900 shadow-xs ring-1 ring-teal-400 font-black"
                    : "text-teal-700 hover:bg-teal-100/70"
                }`}
                title={`Configure Grover Oracle targeting |${tgt}⟩`}
              >
                |{tgt}⟩
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-white border border-emerald-100 rounded-xl shadow-xs">
          <button
            onClick={() => handleSwitchTab("visual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "visual"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Visual Grid Builder
          </button>
          <button
            onClick={() => handleSwitchTab("json")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "json"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Circuit JSON (Editable)
          </button>
        </div>

        {/* Single Qubit Bloch Sphere preview toggle */}
        {numQubits === 1 && activeTab === "visual" && (
          <button
            onClick={() => setShowBlochViewer(!showBlochViewer)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              showBlochViewer
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Compass className="h-3.5 w-3.5 text-emerald-600" />
            {showBlochViewer ? "Hide Bloch Sphere" : "Visualize Qubit on Bloch Sphere"}
          </button>
        )}

        {/* 2-Qubit Grover Oracle Card toggle */}
        {numQubits === 2 && activeTab === "visual" && (
          <button
            onClick={() => setShowGroverOracleCard(!showGroverOracleCard)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              showGroverOracleCard
                ? "bg-teal-50 border-teal-200 text-teal-800 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Target className="h-3.5 w-3.5 text-teal-600" />
            {showGroverOracleCard ? "Hide Oracle Target Selector" : "Grover Oracle Target Selector"}
          </button>
        )}
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Circuit Builder Canvas OR JSON Editor */}
        <div className="lg:col-span-8 space-y-6">
          {activeTab === "visual" ? (
            <>
              {/* Grover Oracle Target Selector Card */}
              {numQubits === 2 && showGroverOracleCard && (
                <div className="p-5 rounded-2xl bg-teal-50/90 border border-teal-200/90 shadow-sm space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-100">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-mono font-black text-xs shadow-xs shrink-0">
                        O<sub>w</sub>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-extrabold text-teal-950 uppercase tracking-wider">
                            Grover Oracle Target Selector
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                            Marked State: |{groverTarget}⟩
                          </span>
                        </div>
                        <p className="text-xs text-teal-800/80 mt-0.5">
                          Choose which computational basis state the quantum Oracle marks with a -1 relative phase.
                        </p>
                      </div>
                    </div>

                    {/* Target Selector Pills */}
                    <div className="flex items-center gap-1.5 p-1 bg-white/90 border border-teal-200 rounded-xl shadow-xs self-start sm:self-auto">
                      {(["00", "01", "10", "11"] as GroverTarget[]).map((tgt) => (
                        <button
                          key={tgt}
                          onClick={() => loadPreset("grover", tgt)}
                          className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-black transition-all cursor-pointer ${
                            groverTarget === tgt
                              ? "bg-teal-700 text-white shadow-xs scale-105 ring-1 ring-teal-700"
                              : "text-teal-800 hover:bg-teal-100/60"
                          }`}
                        >
                          |{tgt}⟩
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Oracle Gate Breakdown & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-teal-900">Synthesized Oracle:</span>
                        <span className="font-mono text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 font-bold">
                          {groverTarget === "11"
                            ? "CZ(0, 1)"
                            : groverTarget === "10"
                            ? "X(0) → CZ(0, 1) → X(0)"
                            : groverTarget === "01"
                            ? "X(1) → CZ(0, 1) → X(1)"
                            : "X(0,1) → CZ(0, 1) → X(0,1)"}
                        </span>
                      </div>
                      <p className="text-[11px] text-teal-700">
                        {groverTarget === "11"
                          ? "Both qubits are 1: Native CZ(0, 1) directly inverts the relative phase."
                          : groverTarget === "10"
                          ? "q0 is 0: X on q0 flips it to 1 before CZ, then uncomputes after."
                          : groverTarget === "01"
                          ? "q1 is 0: X on q1 flips it to 1 before CZ, then uncomputes after."
                          : "Both are 0: X on q0 and q1 flips both to 1 before CZ, then uncomputes after."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleInsertOracleOnly(groverTarget)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-teal-300 text-teal-900 hover:bg-teal-50 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        title="Append only this Oracle block to the end of the circuit"
                      >
                        + Insert Oracle Block Only
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Palette & Controls Toolbar */}
              <div className="p-5 rounded-2xl bg-white border border-emerald-100/90 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-emerald-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold text-slate-500">Select Gate:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {paletteList.map((gType) => {
                        const def = GATE_DEFINITIONS[gType];
                        const isSelected = selectedPaletteGate === gType;
                        return (
                          <button
                            key={gType}
                            onClick={() => setSelectedPaletteGate(gType)}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-emerald-600 text-white shadow-sm scale-105"
                                : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                            }`}
                          >
                            {def.symbol}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Qubit & Step Count Controls */}
                  <div className="flex items-center gap-4">
                    {/* Qubits */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">Qubits:</span>
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => {
                            if (numQubits > 1) {
                              setNumQubits(numQubits - 1);
                              setGates(gates.filter((g) => !g.qubits.some((q) => q >= numQubits - 1)));
                            }
                          }}
                          disabled={numQubits <= 1}
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          title="Decrease Qubits"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-mono text-xs font-bold text-emerald-800 px-1.5">{numQubits}</span>
                        <button
                          onClick={() => {
                            if (numQubits < 5) setNumQubits(numQubits + 1);
                          }}
                          disabled={numQubits >= 5}
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          title="Increase Qubits"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">Steps:</span>
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => {
                            if (numSteps > 4) {
                              setNumSteps(numSteps - 1);
                              setGates(gates.filter((g) => g.step < numSteps - 1));
                            }
                          }}
                          disabled={numSteps <= 4}
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          title="Decrease Steps"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-mono text-xs font-bold text-emerald-800 px-1.5">{numSteps}</span>
                        <button
                          onClick={() => {
                            if (numSteps < 12) setNumSteps(numSteps + 1);
                          }}
                          disabled={numSteps >= 12}
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          title="Increase Steps"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two-Qubit (CNOT / CZ) Configuration Toolbar */}
                {(selectedPaletteGate === "CNOT" || selectedPaletteGate === "CZ") && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-4 shadow-xs ${
                      selectedPaletteGate === "CZ"
                        ? "bg-teal-50 border-teal-200 text-teal-950"
                        : "bg-rose-50 border-rose-200 text-rose-950"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Info
                        className={`h-4 w-4 shrink-0 ${
                          selectedPaletteGate === "CZ" ? "text-teal-600" : "text-rose-600"
                        }`}
                      />
                      <span>
                        {selectedPaletteGate === "CZ" ? "Controlled-Z (CZ)" : "CNOT"} Mode: Select the{" "}
                        <strong>Control Qubit</strong>, then click the <strong>Target Qubit</strong> cell in the grid below.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor={`${uniquePrefix}_controlQubitSelect`} className="font-bold text-[11px] text-slate-600">
                        Control Qubit:
                      </label>
                      <select
                        id={`${uniquePrefix}_controlQubitSelect`}
                        value={cnotControlQubit}
                        onChange={(e) => setCnotControlQubit(Number(e.target.value))}
                        className={`bg-white border text-xs rounded-lg px-2.5 py-1 font-mono font-bold shadow-xs cursor-pointer ${
                          selectedPaletteGate === "CZ"
                            ? "border-teal-300 text-teal-900"
                            : "border-rose-300 text-rose-900"
                        }`}
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

                {/* Helper Placement Hint */}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <p>
                    Selected: <strong className="text-emerald-700">{GATE_DEFINITIONS[selectedPaletteGate].name}</strong> — Click any cell in the grid to place or remove.
                  </p>
                  <button
                    onClick={handleAddMeasurementAll}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline underline-offset-2 cursor-pointer"
                  >
                    + Measure All Qubits
                  </button>
                </div>
              </div>

              {/* Quantum Circuit Step Grid */}
              <div className="p-6 rounded-2xl bg-white border border-emerald-100/90 shadow-sm space-y-4 overflow-x-auto">
                {/* Step Columns Header */}
                <div className="flex items-center gap-3 min-w-[620px] pb-2 border-b border-slate-100">
                  <div className="w-16 shrink-0 text-[11px] uppercase font-bold text-slate-400">
                    Qubit
                  </div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${numSteps}, minmax(0, 1fr))` }}>
                    {Array.from({ length: numSteps }).map((_, stepIdx) => (
                      <div key={stepIdx} className="text-center font-mono text-[11px] font-bold text-slate-500">
                        Step {stepIdx}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Qubit Wires */}
                {Array.from({ length: numQubits }).map((_, qIdx) => (
                  <div key={qIdx} className="flex items-center gap-3 min-w-[620px] relative">
                    {/* Qubit Label */}
                    <div className="w-16 shrink-0 flex items-center gap-1 font-mono text-xs font-bold text-slate-700">
                      <span className="text-emerald-700">q{qIdx}:</span>
                      <span className="text-slate-400 text-[11px]">|0⟩</span>
                    </div>

                    {/* Step Grid Cells for this Wire */}
                    <div
                      className="flex-1 relative grid items-center min-h-12 py-1"
                      style={{ gridTemplateColumns: `repeat(${numSteps}, minmax(0, 1fr))` }}
                    >
                      {/* Background Wire Line */}
                      <div className="absolute inset-x-0 h-0.5 bg-slate-200 pointer-events-none z-0" />

                      {Array.from({ length: numSteps }).map((_, stepIdx) => {
                        // Find gate on this exact (qIdx, stepIdx) cell
                        const gate = gates.find(
                          (g) => g.step === stepIdx && g.qubits.includes(qIdx)
                        );

                        // Two-qubit connector logic (CNOT or CZ)
                        const twoQubitGateInStep = gates.find(
                          (g) => g.step === stepIdx && (g.type === "CNOT" || g.type === "CZ")
                        );
                        const isCNOT = gate?.type === "CNOT";
                        const isCZ = gate?.type === "CZ";
                        const isControl = (isCNOT || isCZ) && gate?.qubits[0] === qIdx;

                        return (
                          <div
                            key={stepIdx}
                            className="relative z-10 flex items-center justify-center p-1"
                          >
                            {/* Vertical connector line if CNOT/CZ passes through this step */}
                            {twoQubitGateInStep &&
                              qIdx >= Math.min(twoQubitGateInStep.qubits[0], twoQubitGateInStep.qubits[1]) &&
                              qIdx <= Math.max(twoQubitGateInStep.qubits[0], twoQubitGateInStep.qubits[1]) && (
                                <div
                                  className={`absolute w-0.5 z-0 pointer-events-none ${
                                    twoQubitGateInStep.type === "CZ" ? "bg-teal-500" : "bg-rose-400"
                                  }`}
                                  style={{
                                    top: qIdx === Math.min(twoQubitGateInStep.qubits[0], twoQubitGateInStep.qubits[1]) ? "50%" : 0,
                                    bottom: qIdx === Math.max(twoQubitGateInStep.qubits[0], twoQubitGateInStep.qubits[1]) ? "50%" : 0,
                                  }}
                                />
                              )}

                            {gate ? (
                              <div className="group relative">
                                <div
                                  onClick={() => handleRemoveGate(gate.id)}
                                  className={`h-9 min-w-9 px-2.5 rounded-xl flex items-center justify-center font-mono font-bold text-xs shadow-xs border cursor-pointer transition-transform group-hover:scale-105 ${
                                    isCNOT
                                      ? isControl
                                        ? "bg-rose-100 border-rose-400 text-rose-900"
                                        : "bg-rose-600 text-white border-rose-700"
                                      : isCZ
                                      ? isControl
                                        ? "bg-teal-100 border-teal-400 text-teal-900"
                                        : "bg-teal-600 text-white border-teal-700"
                                      : gate.type === "MEASURE"
                                      ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                                      : "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                                  }`}
                                  title={`Click to remove ${gate.type}`}
                                >
                                  {isCNOT ? (
                                    isControl ? "●" : "⊕"
                                  ) : isCZ ? (
                                    isControl ? "●" : "Z"
                                  ) : gate.type === "MEASURE" ? (
                                    `M[c${gate.classical_bits?.[0] ?? qIdx}]`
                                  ) : (
                                    gate.type
                                  )}
                                </div>

                                {/* Delete 'x' hover chip */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveGate(gate.id);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer"
                                  title="Delete Gate"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              // Empty Clickable Cell Slot
                              <button
                                onClick={() => handleCellClick(qIdx, stepIdx)}
                                className="h-8 w-8 rounded-lg border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/70 text-slate-400 hover:text-emerald-700 flex items-center justify-center text-xs transition-colors cursor-pointer bg-white"
                                title={`Place ${selectedPaletteGate} at q${qIdx}, Step ${stepIdx}`}
                              >
                                +
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* JSON Mode Input Panel */
            <div className="p-6 rounded-2xl bg-white border border-emerald-100/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Standardized Circuit JSON</h3>
                  <p className="text-xs text-slate-500">
                    Directly view and edit the machine-readable circuit schema consumed by Qiskit Aer.
                  </p>
                </div>
                <button
                  onClick={handleApplyJson}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Validate & Apply JSON
                </button>
              </div>

              {jsonError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Schema Validation Error:</strong>
                    {jsonError}
                  </div>
                </div>
              )}

              {jsonSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <strong className="font-bold">Circuit JSON validated and synchronized successfully!</strong>
                </div>
              )}

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={16}
                className="w-full font-mono text-xs p-4 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800 focus:outline-emerald-500/50 shadow-inner resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {/* Execution Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-emerald-100/90 shadow-sm">
            <div className="flex items-center gap-4 text-xs font-mono text-slate-700">
              <div>
                Qubits: <strong className="text-emerald-700 font-bold">{numQubits}</strong>
              </div>
              <div>
                Gates: <strong className="text-emerald-700 font-bold">{gates.length}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Shots:</span>
                <select
                  value={shots}
                  onChange={(e) => setShots(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
              <button
                onClick={() => loadPreset("bell")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Bell
              </button>

              <button
                onClick={handleOpenInCodeLab}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-700 hover:text-emerald-800 text-xs font-bold transition-all cursor-pointer"
                title="Convert circuit to Python Qiskit code"
              >
                <Terminal className="h-3.5 w-3.5 text-emerald-600" /> Open in Code Lab
              </button>

              <button
                onClick={() => {
                  const prompt =
                    gates.length > 0
                      ? "Explain this quantum circuit step by step and analyze its behavior."
                      : "Help me design a quantum circuit in Circuit Lab.";
                  triggerAI(prompt);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Analyze circuit with AI Quantum Tutor"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Ask AI Tutor
              </button>

              <button
                onClick={handleRunSimulation}
                disabled={loading || gates.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin" /> Simulating on Aer...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-white" /> Run Simulation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Single Qubit Bloch Sphere Drawer (When numQubits === 1) */}
          {numQubits === 1 && showBlochViewer && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <BlochSphere
                  state={computeSingleQubitBlochState()}
                  title="Single-Qubit State Trace"
                  size={260}
                  showPresets={false}
                  className="shrink-0"
                />
                <div className="flex-1 space-y-2 text-xs text-slate-600">
                  <span className="text-[11px] uppercase font-bold text-emerald-800 tracking-wider">
                    Qubit State Evolution
                  </span>
                  <p className="leading-relaxed">
                    This Bloch sphere demonstrates how your gate sequence transforms the state vector starting from ground state <strong className="font-mono text-slate-900">|0⟩</strong>.
                  </p>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 font-mono text-emerald-900 text-xs">
                    Sequence: |0⟩ {gates.filter(g => g.type !== "MEASURE").map(g => `→ [${g.type}]`).join(" ")}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Measurement collapses this 3D state vector onto the longitudinal Z-axis (|0⟩ or |1⟩) according to Born&apos;s rule: $P(0) = \cos^2(\theta/2)$.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Qubit Educational Note */}
          {numQubits > 1 && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-600 leading-relaxed flex items-start gap-2 shadow-xs">
              <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-900 block font-bold">Multi-Qubit State Space:</strong>
                Circuits with {numQubits} qubits live in a {Math.pow(2, numQubits)}-dimensional Hilbert space (2^{numQubits} = {Math.pow(2, numQubits)} basis states).
                Due to quantum entanglement, multi-qubit systems cannot be mapped onto individual Bloch spheres. Review the Basis State Probability Spectrum on the right.
              </div>
            </div>
          )}
        </div>

        {/* Right: Simulation Telemetry & Result Panel */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex-1 p-6 rounded-2xl bg-white border border-emerald-100/90 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Results & Probability</h3>
                <p className="text-xs text-slate-500">Measurement Spectrum from Qiskit Aer</p>
              </div>
              {result && (
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {result.execution_time_ms} ms
                </span>
              )}
            </div>

            {error && (
              <div className="my-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Simulation Error:</strong>
                  {error}
                </div>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Cpu className="h-10 w-10 text-emerald-600/40 mb-3" />
                <p className="text-sm font-bold text-slate-700">Ready for Simulation</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Construct your circuit on the left and click <strong className="text-emerald-700">&quot;Run Simulation&quot;</strong>.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-900">Transpiling & Simulating...</p>
                <p className="text-xs text-slate-500 mt-1">Executing on Qiskit Aer backend</p>
              </div>
            )}

            {result && !loading && (
              <div className="flex-1 flex flex-col justify-between pt-4 space-y-6">
                {/* Bar Chart */}
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
                            fill={entry.probability > 0 ? "#059669" : "#cbd5e1"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Counts vs Probabilities Table */}
                <div className="rounded-xl border border-emerald-100 overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-emerald-50/80 px-4 py-2 font-bold text-emerald-900 border-b border-emerald-100">
                    <div>Basis State</div>
                    <div className="text-center">Count</div>
                    <div className="text-right">Probability</div>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 font-mono">
                    {chartData.map((d) => (
                      <div
                        key={d.state}
                        className="grid grid-cols-3 px-4 py-2 text-slate-800 hover:bg-slate-50"
                      >
                        <div className="font-bold text-emerald-700">{d.state}</div>
                        <div className="text-center text-slate-500">{d.count}</div>
                        <div className="text-right font-bold text-slate-900">{d.probability}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Execution Telemetry Summary */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Simulation Engine:</span>
                    <strong className="text-slate-900 font-mono font-bold">Qiskit Aer</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Circuit Depth:</span>
                    <strong className="text-slate-900 font-mono font-bold">{result.circuit_metadata.depth}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Gates:</span>
                    <strong className="text-slate-900 font-mono font-bold">{result.circuit_metadata.gate_count}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Measurement Shots:</span>
                    <strong className="text-slate-900 font-mono font-bold">{result.shots}</strong>
                  </div>
                </div>

                <button
                  onClick={() =>
                    triggerAI(
                      `Explain these simulation measurement probabilities for my circuit: ${JSON.stringify(
                        result.probabilities
                      )}`
                    )
                  }
                  className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  Ask AI Tutor to explain results
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating AI Tutor Panel */}
      <AITutorPanel
        circuit={getCircuitPayload()}
        counts={result?.counts}
        probabilities={result?.probabilities}
        lessonTitle={activePreset === "grover" ? "Grover's Algorithm" : "Circuit Lab"}
        initialPrompt={aiPrompt}
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
      />
    </div>
  );
}

export default function CircuitLabPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading Circuit Lab...</div>}>
      <CircuitLabContent />
    </Suspense>
  );
}
