import ast
import logging
import time
from typing import Tuple, Optional
from qiskit import QuantumCircuit
from app.schemas.circuit import CircuitSchema, GateType
from app.schemas.code_lab import CodeExecutionRequest, CodeExecutionResponse, CodeValidationResponse
from app.services.code.transpiler import code_to_circuit
from app.services.quantum.simulator import QuantumSimulationService
from app.database.repositories import EducationRepository

logger = logging.getLogger(__name__)

FORBIDDEN_CALLS = {
    "eval", "exec", "open", "__import__", "compile", "globals", "locals",
    "getattr", "setattr", "delattr", "hasattr", "input", "breakpoint"
}

FORBIDDEN_MODULES = {
    "os", "sys", "subprocess", "socket", "shutil", "importlib", "requests",
    "urllib", "http", "ftplib", "builtins", "posix", "nt", "pty", "commands",
    "multiprocessing", "threading", "signal", "tempfile"
}


class CodeSafetyValidator(ast.NodeVisitor):
    """Validates AST nodes against security policies."""

    def __init__(self) -> None:
        self.errors = []

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            mod_root = alias.name.split(".")[0]
            if mod_root in FORBIDDEN_MODULES:
                self.errors.append(f"Security policy error: Import of '{alias.name}' is strictly forbidden.")
            elif mod_root not in {"qiskit", "math", "numpy"}:
                self.errors.append(f"Import of '{alias.name}' is not allowed in Code Lab sandbox. Only 'qiskit' is permitted.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.module:
            mod_root = node.module.split(".")[0]
            if mod_root in FORBIDDEN_MODULES:
                self.errors.append(f"Security policy error: Import from '{node.module}' is strictly forbidden.")
            elif mod_root not in {"qiskit", "math", "numpy"}:
                self.errors.append(f"Import from '{node.module}' is not allowed. Only 'qiskit' is permitted.")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        func_name = getattr(node.func, "id", None)
        if func_name in FORBIDDEN_CALLS:
            self.errors.append(f"Security policy error: Calling '{func_name}()' is strictly prohibited.")
        self.generic_visit(node)


def validate_code_safety(code: str) -> Tuple[bool, Optional[str]]:
    """Statically validates code syntax and safety boundaries."""
    if not code or not code.strip():
        return False, "Code cannot be empty."

    try:
        tree = ast.parse(code)
    except SyntaxError as se:
        return False, f"Syntax Error: {se.msg} (line {se.lineno})"

    validator = CodeSafetyValidator()
    validator.visit(tree)

    if validator.errors:
        return False, "; ".join(validator.errors)

    return True, None


def execute_quantum_code(request: CodeExecutionRequest) -> CodeExecutionResponse:
    """Safely parses, validates, and simulates student quantum code."""
    is_safe, safety_error = validate_code_safety(request.code)
    if not is_safe:
        return CodeExecutionResponse(
            success=False,
            stdout="",
            error=safety_error,
            backend="qiskit-aer"
        )

    try:
        start_time = time.perf_counter()
        circuit = code_to_circuit(request.code, request.language)
        circuit.shots = request.shots

        if circuit.num_qubits > 10:
            return CodeExecutionResponse(
                success=False,
                stdout="",
                error=f"Qubit limit exceeded. Maximum 10 qubits allowed in Code Lab, but requested {circuit.num_qubits}.",
                backend="qiskit-aer"
            )

        # Generate Qiskit native circuit diagram
        qc = QuantumCircuit(circuit.num_qubits, circuit.num_classical_bits or circuit.num_qubits)
        for g in circuit.gates:
            if g.type == GateType.H:
                qc.h(g.qubits[0])
            elif g.type == GateType.X:
                qc.x(g.qubits[0])
            elif g.type == GateType.Y:
                qc.y(g.qubits[0])
            elif g.type == GateType.Z:
                qc.z(g.qubits[0])
            elif g.type == GateType.S:
                qc.s(g.qubits[0])
            elif g.type == GateType.T:
                qc.t(g.qubits[0])
            elif g.type == GateType.CNOT:
                qc.cx(g.qubits[0], g.qubits[1])
            elif g.type == GateType.CZ:
                qc.cz(g.qubits[0], g.qubits[1])
            elif g.type == GateType.MEASURE:
                c = g.classical_bits[0] if g.classical_bits else g.qubits[0]
                qc.measure(g.qubits[0], c)

        circuit_ascii = str(qc.draw(output="text"))

        # Run simulation on Qiskit Aer
        sim_service = QuantumSimulationService()
        sim_result = sim_service.run_simulation(circuit)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Build clean formatted stdout
        stdout_lines = [
            f"=== Qiskit Aer Simulation Succeeded ===",
            f"Backend: {sim_result.backend}",
            f"Qubits: {circuit.num_qubits}, Classical Bits: {circuit.num_classical_bits}, Shots: {circuit.shots}",
            f"Execution Time: {elapsed_ms} ms",
            "",
            "--- Circuit Diagram ---",
            circuit_ascii,
            "",
            "--- Observed Counts ---",
            str(sim_result.counts),
        ]
        stdout = "\n".join(stdout_lines)

        # Record simulation in database
        try:
            EducationRepository.record_simulation_run(
                user_id=request.user_id,
                num_qubits=circuit.num_qubits,
                gate_count=len(circuit.gates),
                shots=circuit.shots,
                counts=sim_result.counts
            )
        except Exception as dbe:
            logger.warning(f"Failed to record simulation run: {dbe}")

        return CodeExecutionResponse(
            success=True,
            stdout=stdout,
            circuit_ascii=circuit_ascii,
            circuit=circuit,
            counts=sim_result.counts,
            probabilities=sim_result.probabilities,
            execution_time_ms=elapsed_ms,
            backend=sim_result.backend
        )

    except Exception as e:
        logger.exception(f"Code execution error: {e}")
        return CodeExecutionResponse(
            success=False,
            stdout="",
            error=str(e),
            backend="qiskit-aer"
        )
