export type GateType =
  | "H"
  | "X"
  | "Y"
  | "Z"
  | "S"
  | "T"
  | "CNOT"
  | "CZ"
  | "MEASURE";

export interface GateSchema {
  id: string;
  type: GateType;
  qubits: number[];
  classical_bits?: number[];
}

export interface CircuitSchema {
  num_qubits: number;
  num_classical_bits?: number;
  gates: GateSchema[];
  shots?: number;
}

export interface CircuitMetadata {
  gate_count: number;
  depth: number;
  gates_by_type: Record<string, number>;
}

export interface SimulationResultSchema {
  success: boolean;
  backend: string;
  num_qubits: number;
  num_classical_bits: number;
  shots: number;
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  execution_time_ms: number;
  circuit_metadata: CircuitMetadata;
}

export interface GateDefinition {
  type: GateType;
  name: string;
  symbol: string;
  description: string;
  category: "single" | "multi" | "measurement";
  color: string;
  bgLight: string;
  borderColor: string;
  qubitCount: number;
  matrixLatex?: string;
}

export const GATE_DEFINITIONS: Record<GateType, GateDefinition> = {
  H: {
    type: "H",
    name: "Hadamard",
    symbol: "H",
    description: "Creates an equal superposition between |0⟩ and |1⟩.",
    category: "single",
    color: "text-sky-400",
    bgLight: "bg-sky-500/15",
    borderColor: "border-sky-500/30",
    qubitCount: 1,
    matrixLatex: "1/√2 [[1, 1], [1, -1]]",
  },
  X: {
    type: "X",
    name: "Pauli-X (NOT)",
    symbol: "X",
    description: "Quantum bit flip: transforms |0⟩ ↔ |1⟩.",
    category: "single",
    color: "text-emerald-400",
    bgLight: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    qubitCount: 1,
    matrixLatex: "[[0, 1], [1, 0]]",
  },
  Y: {
    type: "Y",
    name: "Pauli-Y",
    symbol: "Y",
    description: "Combined bit and phase flip: |0⟩ → i|1⟩, |1⟩ → -i|0⟩.",
    category: "single",
    color: "text-teal-400",
    bgLight: "bg-teal-500/15",
    borderColor: "border-teal-500/30",
    qubitCount: 1,
    matrixLatex: "[[0, -i], [i, 0]]",
  },
  Z: {
    type: "Z",
    name: "Pauli-Z",
    symbol: "Z",
    description: "Phase flip: leaves |0⟩ unchanged and maps |1⟩ → -|1⟩.",
    category: "single",
    color: "text-amber-400",
    bgLight: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
    qubitCount: 1,
    matrixLatex: "[[1, 0], [0, -1]]",
  },
  S: {
    type: "S",
    name: "Phase (S)",
    symbol: "S",
    description: "Applies a π/2 (90°) phase rotation. S² = Z.",
    category: "single",
    color: "text-indigo-400",
    bgLight: "bg-indigo-500/15",
    borderColor: "border-indigo-500/30",
    qubitCount: 1,
    matrixLatex: "[[1, 0], [0, i]]",
  },
  T: {
    type: "T",
    name: "π/8 (T)",
    symbol: "T",
    description: "Applies a π/4 (45°) phase rotation. T² = S.",
    category: "single",
    color: "text-purple-400",
    bgLight: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
    qubitCount: 1,
    matrixLatex: "[[1, 0], [0, e^(iπ/4)]]",
  },
  CNOT: {
    type: "CNOT",
    name: "Controlled-NOT",
    symbol: "CX",
    description: "Flips target qubit if control qubit is |1⟩. Entangles qubits.",
    category: "multi",
    color: "text-rose-400",
    bgLight: "bg-rose-500/15",
    borderColor: "border-rose-500/30",
    qubitCount: 2,
  },
  CZ: {
    type: "CZ",
    name: "Controlled-Z",
    symbol: "CZ",
    description: "Applies a Z phase-flip if both qubits are |1⟩ (symmetric phase inversion).",
    category: "multi",
    color: "text-teal-500",
    bgLight: "bg-teal-500/15",
    borderColor: "border-teal-500/30",
    qubitCount: 2,
    matrixLatex: "[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,-1]]",
  },
  MEASURE: {
    type: "MEASURE",
    name: "Measurement",
    symbol: "M",
    description: "Collapses quantum state into a classical bit (0 or 1).",
    category: "measurement",
    color: "text-violet-400",
    bgLight: "bg-violet-500/15",
    borderColor: "border-violet-500/30",
    qubitCount: 1,
  },
};
