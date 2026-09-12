import ast
import logging
from typing import List, Optional, Tuple, Dict, Any
from app.schemas.circuit import CircuitSchema, GateSchema, GateType

logger = logging.getLogger(__name__)


def circuit_to_code(circuit: CircuitSchema, language: str = "qiskit") -> str:
    """Exports canonical Circuit JSON into readable, idiomatic quantum code.
    
    Supports 'qiskit', 'pennylane', and 'cirq'.
    """
    lang = language.lower().strip()
    num_qubits = circuit.num_qubits
    num_clbits = circuit.num_classical_bits or num_qubits

    if lang == "cirq":
        lines = [
            "import cirq",
            "",
            f"# Define {num_qubits} qubits",
            f"qubits = [cirq.LineQubit(i) for i in range({num_qubits})]",
            "circuit = cirq.Circuit()",
            "",
            "# Add gates",
        ]
        for g in circuit.gates:
            if g.type == GateType.H:
                lines.append(f"circuit.append(cirq.H(qubits[{g.qubits[0]}]))")
            elif g.type == GateType.X:
                lines.append(f"circuit.append(cirq.X(qubits[{g.qubits[0]}]))")
            elif g.type == GateType.Y:
                lines.append(f"circuit.append(cirq.Y(qubits[{g.qubits[0]}]))")
            elif g.type == GateType.Z:
                lines.append(f"circuit.append(cirq.Z(qubits[{g.qubits[0]}]))")
            elif g.type == GateType.S:
                lines.append(f"circuit.append(cirq.S(qubits[{g.qubits[0]}]))")
            elif g.type == GateType.T:
                lines.append(f"circuit.append(cirq.T(qubits[{g.qubits[0]}]))")
            elif g.type == GateType.CNOT:
                lines.append(f"circuit.append(cirq.CNOT(qubits[{g.qubits[0]}], qubits[{g.qubits[1]}]))")
            elif g.type == GateType.CZ:
                lines.append(f"circuit.append(cirq.CZ(qubits[{g.qubits[0]}], qubits[{g.qubits[1]}]))")
            elif g.type == GateType.MEASURE:
                lines.append(f"circuit.append(cirq.measure(qubits[{g.qubits[0]}], key='m{g.qubits[0]}'))")
        lines.append("")
        lines.append("print('Cirq Circuit:')")
        lines.append("print(circuit)")
        return "\n".join(lines)

    elif lang == "pennylane":
        lines = [
            "import pennylane as qml",
            "",
            f"# Setup PennyLane device with {num_qubits} wires",
            f"dev = qml.device('default.qubit', wires={num_qubits}, shots={circuit.shots})",
            "",
            "@qml.qnode(dev)",
            "def quantum_circuit():",
        ]
        for g in circuit.gates:
            if g.type == GateType.H:
                lines.append(f"    qml.Hadamard(wires={g.qubits[0]})")
            elif g.type == GateType.X:
                lines.append(f"    qml.PauliX(wires={g.qubits[0]})")
            elif g.type == GateType.Y:
                lines.append(f"    qml.PauliY(wires={g.qubits[0]})")
            elif g.type == GateType.Z:
                lines.append(f"    qml.PauliZ(wires={g.qubits[0]})")
            elif g.type == GateType.S:
                lines.append(f"    qml.S(wires={g.qubits[0]})")
            elif g.type == GateType.T:
                lines.append(f"    qml.T(wires={g.qubits[0]})")
            elif g.type == GateType.CNOT:
                lines.append(f"    qml.CNOT(wires=[{g.qubits[0]}, {g.qubits[1]}])")
            elif g.type == GateType.CZ:
                lines.append(f"    qml.CZ(wires=[{g.qubits[0]}, {g.qubits[1]}])")
        lines.append(f"    return qml.counts(wires=range({num_qubits}))")
        lines.append("")
        lines.append("print(quantum_circuit())")
        return "\n".join(lines)

    # Default: Qiskit
    lines = [
        "from qiskit import QuantumCircuit",
        "",
        f"# Initialize {num_qubits}-qubit quantum circuit with {num_clbits} classical bits",
        f"qc = QuantumCircuit({num_qubits}, {num_clbits})",
        "",
        "# Apply quantum gates",
    ]

    for g in circuit.gates:
        if g.type == GateType.H:
            lines.append(f"qc.h({g.qubits[0]})")
        elif g.type == GateType.X:
            lines.append(f"qc.x({g.qubits[0]})")
        elif g.type == GateType.Y:
            lines.append(f"qc.y({g.qubits[0]})")
        elif g.type == GateType.Z:
            lines.append(f"qc.z({g.qubits[0]})")
        elif g.type == GateType.S:
            lines.append(f"qc.s({g.qubits[0]})")
        elif g.type == GateType.T:
            lines.append(f"qc.t({g.qubits[0]})")
        elif g.type == GateType.CNOT:
            lines.append(f"qc.cx({g.qubits[0]}, {g.qubits[1]})")
        elif g.type == GateType.CZ:
            lines.append(f"qc.cz({g.qubits[0]}, {g.qubits[1]})")
        elif g.type == GateType.MEASURE:
            c = g.classical_bits[0] if g.classical_bits else g.qubits[0]
            lines.append(f"qc.measure({g.qubits[0]}, {c})")

    lines.append("")
    lines.append("# Render ASCII circuit diagram")
    lines.append("print(qc)")
    return "\n".join(lines)


class SafeASTVisitor(ast.NodeVisitor):
    """Parses safe Python AST to extract quantum circuit instructions."""

    def __init__(self) -> None:
        self.num_qubits: Optional[int] = None
        self.num_classical_bits: Optional[int] = None
        self.circuit_var_name: str = "qc"
        self.gates: List[GateSchema] = []
        self.gate_counter: int = 0
        self.symbols: Dict[str, Any] = {}

    def _eval_int(self, node: ast.AST) -> Optional[int]:
        if isinstance(node, ast.Constant) and isinstance(node.value, int):
            return node.value
        elif isinstance(node, ast.Name) and node.id in self.symbols:
            val = self.symbols[node.id]
            if isinstance(val, int):
                return val
        return None

    def visit_Assign(self, node: ast.Assign) -> None:
        # Check variable assignment for simple integers or QuantumCircuit initialization
        if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            var_name = node.targets[0].id
            if isinstance(node.value, ast.Constant):
                self.symbols[var_name] = node.value.value
            elif isinstance(node.value, ast.Call):
                func = node.value.func
                func_name = getattr(func, "id", None) or getattr(func, "attr", None)
                if func_name == "QuantumCircuit":
                    self.circuit_var_name = var_name
                    if len(node.value.args) >= 1:
                        self.num_qubits = self._eval_int(node.value.args[0])
                    if len(node.value.args) >= 2:
                        self.num_classical_bits = self._eval_int(node.value.args[1])
                    else:
                        self.num_classical_bits = self.num_qubits
        self.generic_visit(node)

    def visit_Expr(self, node: ast.Expr) -> None:
        if isinstance(node.value, ast.Call):
            self._process_call(node.value)
        self.generic_visit(node)

    def visit_For(self, node: ast.For) -> None:
        # Handle simple range loops like: for i in range(2): qc.h(i)
        iter_node = node.iter
        if isinstance(iter_node, ast.Call):
            func_name = getattr(iter_node.func, "id", None)
            if func_name == "range" and isinstance(node.target, ast.Name):
                loop_var = node.target.id
                args = [self._eval_int(a) for a in iter_node.args]
                if len(args) == 1 and args[0] is not None:
                    loop_range = range(args[0])
                elif len(args) == 2 and args[0] is not None and args[1] is not None:
                    loop_range = range(args[0], args[1])
                else:
                    loop_range = []

                for val in loop_range:
                    self.symbols[loop_var] = val
                    for body_item in node.body:
                        if isinstance(body_item, ast.Expr) and isinstance(body_item.value, ast.Call):
                            self._process_call(body_item.value)
                return
        self.generic_visit(node)

    def _process_call(self, call: ast.Call) -> None:
        if not isinstance(call.func, ast.Attribute):
            return
        method_name = call.func.attr.lower()

        # Extract evaluated integer arguments
        args = []
        for a in call.args:
            val = self._eval_int(a)
            if val is not None:
                args.append(val)

        gid = f"g{self.gate_counter}"

        # Single qubit gates
        single_qubit_map = {
            "h": GateType.H,
            "x": GateType.X,
            "y": GateType.Y,
            "z": GateType.Z,
            "s": GateType.S,
            "t": GateType.T,
        }

        if method_name in single_qubit_map:
            if len(args) >= 1:
                q = args[0]
                self.gates.append(GateSchema(id=gid, type=single_qubit_map[method_name], qubits=[q]))
                self.gate_counter += 1

        elif method_name in {"cx", "cnot"}:
            if len(args) >= 2:
                c, t = args[0], args[1]
                self.gates.append(GateSchema(id=gid, type=GateType.CNOT, qubits=[c, t]))
                self.gate_counter += 1

        elif method_name == "cz":
            if len(args) >= 2:
                q0, q1 = args[0], args[1]
                self.gates.append(GateSchema(id=gid, type=GateType.CZ, qubits=[q0, q1]))
                self.gate_counter += 1

        elif method_name == "measure":
            if len(args) >= 2:
                q, c = args[0], args[1]
                self.gates.append(GateSchema(id=gid, type=GateType.MEASURE, qubits=[q], classical_bits=[c]))
                self.gate_counter += 1
            elif len(args) == 1:
                q = args[0]
                self.gates.append(GateSchema(id=gid, type=GateType.MEASURE, qubits=[q], classical_bits=[q]))
                self.gate_counter += 1

        elif method_name == "measure_all":
            num_q = self.num_qubits or 1
            for q in range(num_q):
                mgid = f"g{self.gate_counter}"
                self.gates.append(GateSchema(id=mgid, type=GateType.MEASURE, qubits=[q], classical_bits=[q]))
                self.gate_counter += 1


def code_to_circuit(code: str, language: str = "qiskit") -> CircuitSchema:
    """Parses supported quantum code into canonical CircuitSchema using safe AST inspection."""
    if language.lower().strip() != "qiskit":
        raise ValueError(f"Code conversion is currently supported for Qiskit code. Language '{language}' cannot be parsed.")

    try:
        tree = ast.parse(code)
    except SyntaxError as se:
        raise ValueError(f"Syntax error in code: {se.msg} (line {se.lineno})")

    visitor = SafeASTVisitor()
    visitor.visit(tree)

    if visitor.num_qubits is None:
        # Deduce from gate qubits if not explicitly declared in QuantumCircuit(...)
        max_q = -1
        for g in visitor.gates:
            for q in g.qubits:
                if q > max_q:
                    max_q = q
        visitor.num_qubits = max_q + 1 if max_q >= 0 else 1

    if visitor.num_classical_bits is None:
        visitor.num_classical_bits = visitor.num_qubits

    if not visitor.gates:
        raise ValueError("No valid quantum gates (H, X, Y, Z, S, T, CX, CZ, MEASURE) detected in the provided code.")

    # Check if measurement exists; if not, automatically append measure_all for convenience in simulation
    has_measure = any(g.type == GateType.MEASURE for g in visitor.gates)
    if not has_measure:
        for q in range(visitor.num_qubits):
            visitor.gates.append(
                GateSchema(
                    id=f"auto_m_{q}",
                    type=GateType.MEASURE,
                    qubits=[q],
                    classical_bits=[q]
                )
            )

    return CircuitSchema(
        num_qubits=visitor.num_qubits,
        num_classical_bits=visitor.num_classical_bits,
        gates=visitor.gates,
        shots=1024
    )
