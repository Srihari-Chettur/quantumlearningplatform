"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { runCode, convertCodeToCircuit, CodeExecutionResponse } from "@/lib/api/education";
import { CircuitSchema } from "@/lib/types/quantum";
import { AITutorPanel } from "@/components/AITutorPanel";
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Code2,
  Terminal,
  Sparkles,
  Bug,
  Layers,
  ChevronRight,
  AlertCircle,
  FileCode2,
  Sliders,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

type Language = "qiskit" | "pennylane" | "cirq";

interface Template {
  id: string;
  name: string;
  description: string;
  code: string;
}

const TEMPLATES: Record<string, Template> = {
  bell_state: {
    id: "bell_state",
    name: "Bell State |Φ+⟩",
    description: "Creates maximal two-qubit entanglement: (|00⟩ + |11⟩)/√2",
    code: `from qiskit import QuantumCircuit

# Initialize 2-qubit circuit with 2 classical bits
qc = QuantumCircuit(2, 2)

# Step 1: Put qubit 0 into superposition
qc.h(0)

# Step 2: Entangle qubit 0 and 1
qc.cx(0, 1)

# Step 3: Measure both qubits
qc.measure(0, 0)
qc.measure(1, 1)

print(qc)
`,
  },
  hadamard: {
    id: "hadamard",
    name: "Hadamard Superposition",
    description: "Transforms |0⟩ into equal superposition state |+⟩",
    code: `from qiskit import QuantumCircuit

# Initialize 1-qubit circuit with 1 classical bit
qc = QuantumCircuit(1, 1)

# Apply Hadamard gate
qc.h(0)

# Measure to observe 50/50 probability
qc.measure(0, 0)

print(qc)
`,
  },
  pauli_x: {
    id: "pauli_x",
    name: "Pauli-X (Bit Flip)",
    description: "Flips computational basis state |0⟩ to |1⟩",
    code: `from qiskit import QuantumCircuit

qc = QuantumCircuit(1, 1)

# Flip |0> to |1>
qc.x(0)

qc.measure(0, 0)
print(qc)
`,
  },
  grover_2q: {
    id: "grover_2q",
    name: "Grover's Search (Target |11⟩)",
    description: "2-qubit search: Superposition -> Oracle -> Diffuser -> 100% |11⟩",
    code: `from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# 1. Uniform Superposition
qc.h(0)
qc.h(1)

# 2. Phase Oracle for target |11>
qc.cz(0, 1)

# 3. Diffuser (Reflection about average)
qc.h(0)
qc.h(1)
qc.x(0)
qc.x(1)
qc.cz(0, 1)
qc.x(0)
qc.x(1)
qc.h(0)
qc.h(1)

# 4. Measurement
qc.measure(0, 0)
qc.measure(1, 1)

print(qc)
`,
  },
  hello_qubit: {
    id: "hello_qubit",
    name: "Hello Qubit",
    description: "Ground state preparation and direct measurement",
    code: `from qiskit import QuantumCircuit

# Single qubit in ground state |0>
qc = QuantumCircuit(1, 1)

qc.measure(0, 0)
print(qc)
`,
  },
  custom: {
    id: "custom",
    name: "Custom Circuit Template",
    description: "Freeform quantum playground",
    code: `from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# Write your quantum operations below:
qc.h(0)
qc.cz(0, 1)

qc.measure(0, 0)
qc.measure(1, 1)
print(qc)
`,
  },
};

function CodeLabContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedLanguage, setSelectedLanguage] = useState<Language>("qiskit");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("bell_state");
  const [code, setCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("quantum_codelab_active_code");
      if (saved) return saved;
    }
    return TEMPLATES.bell_state.code;
  });
  const [shots, setShots] = useState<number>(1024);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [result, setResult] = useState<CodeExecutionResponse | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");

  // Check if loaded with code or circuit from query
  useEffect(() => {
    const rawCircuit = searchParams.get("circuit");
    if (rawCircuit) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawCircuit)) as CircuitSchema;
        fetch("http://localhost:8000/api/code/to-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ circuit: parsed, language: "qiskit" }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.code) setCode(data.code);
          })
          .catch(() => {});
      } catch {}
    }
  }, [searchParams]);

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplate(tmplId);
    if (TEMPLATES[tmplId]) {
      setCode(TEMPLATES[tmplId].code);
      localStorage.setItem("quantum_codelab_active_code", TEMPLATES[tmplId].code);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    localStorage.setItem("quantum_codelab_active_code", newCode);
  };

  const handleRun = async () => {
    if (selectedLanguage !== "qiskit") {
      alert(
        `${selectedLanguage.toUpperCase()} simulation preview: Qiskit Aer is our active hardware-accurate backend engine. Switch to Qiskit to run full simulation.`
      );
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await runCode(code, selectedLanguage, shots);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution failed.";
      setResult({
        success: false,
        stdout: "",
        error: msg,
        counts: {},
        probabilities: {},
        execution_time_ms: 0,
        backend: "qiskit-aer",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInCircuitLab = async () => {
    try {
      const parsed = await convertCodeToCircuit(code, selectedLanguage);
      if (parsed.success && parsed.circuit) {
        localStorage.setItem("active_circuit_json", JSON.stringify(parsed.circuit));
        router.push("/circuit-lab?source=code-lab");
      } else {
        alert(parsed.error || "Could not convert this code into a visual circuit.");
      }
    } catch {
      alert("Failed to parse circuit from code.");
    }
  };

  const triggerAI = (promptText: string) => {
    setAiPrompt(promptText);
    setAiPanelOpen(true);
  };

  // Prepare chart data from probabilities
  const chartData = result?.probabilities
    ? Object.entries(result.probabilities).map(([state, prob]) => ({
        state: `|${state}⟩`,
        probability: Math.round(prob * 1000) / 10,
        count: result.counts[state] || 0,
      }))
    : [];

  const lineCount = code.split("\n").length;

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-20">
      {/* Top Banner */}
      <div className="border-b border-emerald-100 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Terminal className="h-3.5 w-3.5 text-emerald-600" />
                  Code Lab P1
                </span>
                <span className="text-xs text-slate-500 font-mono">Qiskit Aer Backend</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Quantum Code Studio
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl mt-1">
                Write real Python quantum code, simulate against Qiskit Aer, inspect ASCII circuit diagrams, and leverage AI diagnostic reasoning.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenInCircuitLab}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/30 transition-all shadow-xs"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                Open in Circuit Lab
              </button>

              <button
                onClick={() => triggerAI("Explain this quantum code and what the circuit does")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-all shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Ask AI Tutor
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Controls Toolbar */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Framework Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Framework:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setSelectedLanguage("qiskit")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedLanguage === "qiskit"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Python + Qiskit
              </button>
              <button
                onClick={() => setSelectedLanguage("pennylane")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedLanguage === "pennylane"
                    ? "bg-white text-indigo-700 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                PennyLane (Preview)
              </button>
              <button
                onClick={() => setSelectedLanguage("cirq")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedLanguage === "cirq"
                    ? "bg-white text-teal-700 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Cirq (Preview)
              </button>
            </div>
          </div>

          {/* Template Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Template:</span>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(TEMPLATES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shots selector */}
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Shots:</span>
              <select
                value={shots}
                onChange={(e) => setShots(Number(e.target.value))}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value={512}>512</option>
                <option value={1024}>1024</option>
                <option value={4096}>4096</option>
                <option value={8192}>8192</option>
              </select>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRun}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-white" />
              {loading ? "Simulating..." : "Run Code"}
            </button>
          </div>
        </div>

        {/* Main Grid: Editor & Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Code Editor */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[580px]">
              {/* Editor Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="font-mono text-slate-300 ml-2">circuit.py</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px]"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>

                  <button
                    onClick={() => handleTemplateChange(selectedTemplate)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px]"
                    title="Reset template code"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Editor Body */}
              <div className="flex-1 flex overflow-hidden font-mono text-xs sm:text-sm">
                {/* Line Numbers */}
                <div className="py-4 px-3 bg-slate-950/40 text-slate-600 select-none text-right font-mono border-r border-slate-800/60">
                  {Array.from({ length: Math.max(lineCount, 15) }).map((_, i) => (
                    <div key={i} className="leading-6">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Code Textarea */}
                <textarea
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  spellCheck={false}
                  className="flex-1 p-4 bg-transparent text-emerald-200 focus:outline-hidden resize-none leading-6 font-mono selection:bg-emerald-900 selection:text-white overflow-y-auto"
                />
              </div>

              {/* Editor Footer */}
              <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Safe Sandbox Mode Active (AST Evaluated)</span>
                <span>{lineCount} lines</span>
              </div>
            </div>

            {/* Quick Helper Explanations */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => triggerAI(`Explain this code line by line:\n\n${code}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 text-xs font-semibold shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Explain My Code
              </button>

              <button
                onClick={() => triggerAI(`Inspect this code for potential circuit bugs:\n\n${code}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-amber-300 hover:text-amber-700 text-xs font-semibold shadow-xs"
              >
                <Bug className="h-3.5 w-3.5 text-amber-500" />
                Debug Code with AI
              </button>
            </div>
          </div>

          {/* Right Column: Execution Output & Telemetry */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Terminal Output / Results Card */}
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-xl p-4 flex flex-col min-h-[580px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Execution & Output</h3>
                </div>

                {result && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      result.success
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {result.success ? "Simulated in " + result.execution_time_ms + "ms" : "Error"}
                  </span>
                )}
              </div>

              {/* State 1: Running */}
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-800">Simulating Circuit...</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Executing Qiskit Aer Monte Carlo shot sampling ({shots} shots)
                  </p>
                </div>
              )}

              {/* State 2: Error */}
              {!loading && result && !result.success && (
                <div className="flex-1 flex flex-col justify-start">
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      Execution or Validation Error
                    </div>
                    <p className="whitespace-pre-wrap">{result.error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => triggerAI(`Fix this error in my code: ${result.error}\n\nCode:\n${code}`)}
                      className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Ask AI Tutor to resolve this error
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Empty state */}
              {!loading && !result && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Code2 className="h-12 w-12 text-slate-300 stroke-1 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No Execution Yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Click &ldquo;Run Code&rdquo; above to execute simulation on Qiskit Aer and observe measurement distributions.
                  </p>
                </div>
              )}

              {/* State 4: Success Results */}
              {!loading && result && result.success && (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                  {/* ASCII Diagram Card */}
                  {result.circuit_ascii && (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
                      <div className="text-[10px] uppercase font-mono text-slate-400 mb-1.5 font-bold">
                        ASCII Circuit Visualization
                      </div>
                      <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre">
                        {result.circuit_ascii}
                      </pre>
                    </div>
                  )}

                  {/* Histogram */}
                  {chartData.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Measurement Probabilities</span>
                        <span className="text-[11px] text-slate-500">{shots} shots</span>
                      </div>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="state" tick={{ fontSize: 11, fill: "#475569" }} />
                            <YAxis unit="%" tick={{ fontSize: 10, fill: "#64748b" }} domain={[0, 100]} />
                            <Tooltip
                              formatter={(val: unknown) => [`${val}%`, "Probability"]}
                              labelFormatter={(label: unknown) => `Basis State ${label}`}
                            />
                            <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.probability > 70 ? "#059669" : "#0d9488"}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Counts breakdown */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 block mb-1.5">Observed Shot Counts</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(result.counts).map(([state, count]) => (
                        <div key={state} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-center">
                          <span className="font-mono font-bold text-slate-800 text-xs">|{state}⟩</span>
                          <span className="block text-[11px] text-emerald-700 font-semibold">{count} shots</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={() =>
                        triggerAI(
                          `Explain why the measurement probabilities for this circuit are: ${JSON.stringify(
                            result.probabilities
                          )}`
                        )
                      }
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Explain Result with AI
                    </button>

                    <button
                      onClick={handleOpenInCircuitLab}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <span>Visual Editor</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating or Docked AI Tutor Panel */}
      <AITutorPanel
        circuit={result?.circuit}
        code={code}
        counts={result?.counts}
        probabilities={result?.probabilities}
        lessonTitle={TEMPLATES[selectedTemplate]?.name}
        initialPrompt={aiPrompt}
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
      />
    </div>
  );
}

export default function CodeLabPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Loading Quantum Code Studio...</p>
          </div>
        </div>
      }
    >
      <CodeLabContent />
    </Suspense>
  );
}
