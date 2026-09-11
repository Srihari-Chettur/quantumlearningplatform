import time
import logging
from typing import Dict
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

from app.schemas.circuit import CircuitSchema, GateType
from app.schemas.simulation import CircuitMetadata, SimulationResultSchema
from app.services.quantum.base import QuantumSimulatorBase

logger = logging.getLogger(__name__)


class QiskitAerAdapter(QuantumSimulatorBase):
    """Adapter for executing standardized quantum circuits using Qiskit Aer."""

    def __init__(self) -> None:
        self._backend_name = "qiskit-aer"
        # AerSimulator instance
        self._simulator = AerSimulator()

    @property
    def name(self) -> str:
        return self._backend_name

    def to_qiskit_circuit(self, circuit: CircuitSchema) -> QuantumCircuit:
        """Converts standardized CircuitSchema to a Qiskit QuantumCircuit.
        
        Args:
            circuit: Validated CircuitSchema.

        Returns:
            qiskit.QuantumCircuit representation.
        """
        n_qubits = circuit.num_qubits
        n_clbits = circuit.num_classical_bits if circuit.num_classical_bits is not None else n_qubits
        qc = QuantumCircuit(n_qubits, n_clbits)

        for gate in circuit.gates:
            if gate.type == GateType.H:
                qc.h(gate.qubits[0])
            elif gate.type == GateType.X:
                qc.x(gate.qubits[0])
            elif gate.type == GateType.Y:
                qc.y(gate.qubits[0])
            elif gate.type == GateType.Z:
                qc.z(gate.qubits[0])
            elif gate.type == GateType.S:
                qc.s(gate.qubits[0])
            elif gate.type == GateType.T:
                qc.t(gate.qubits[0])
            elif gate.type == GateType.CNOT:
                qc.cx(gate.qubits[0], gate.qubits[1])
            elif gate.type == GateType.MEASURE:
                clbit = gate.classical_bits[0] if gate.classical_bits else gate.qubits[0]
                qc.measure(gate.qubits[0], clbit)
            else:
                raise ValueError(f"Unsupported gate type for Qiskit adapter: {gate.type}")

        return qc

    def simulate(self, circuit: CircuitSchema) -> SimulationResultSchema:
        """Executes simulation on Qiskit Aer and returns structured SimulationResultSchema.
        
        Bitstring ordering convention:
        Standard Qiskit / little-endian representation where:
        - Bit index 0 (c0) is the rightmost bit (least significant bit).
        - Bit index N-1 (cN-1) is the leftmost bit (most significant bit).
        Computational basis states range from |0...0> to |1...1> in numerical order.
        """
        qc = self.to_qiskit_circuit(circuit)

        start_time = time.perf_counter()
        job = self._simulator.run(qc, shots=circuit.shots)
        result = job.result()
        end_time = time.perf_counter()
        execution_time_ms = round((end_time - start_time) * 1000.0, 2)

        # Retrieve counts from Aer, normalizing keys to remove any whitespaces
        raw_counts = result.get_counts()
        counts: Dict[str, int] = {}
        if isinstance(raw_counts, dict):
            for k, v in raw_counts.items():
                counts[k.replace(" ", "")] = int(v)

        n_clbits = circuit.num_classical_bits if circuit.num_classical_bits is not None else circuit.num_qubits
        
        # Calculate probabilities for all basis states if n_clbits <= 12
        probabilities: Dict[str, float] = {}
        total_shots = circuit.shots

        if n_clbits <= 12:
            num_states = 1 << n_clbits
            for i in range(num_states):
                bitstring = format(i, f"0{n_clbits}b")
                c = counts.get(bitstring, 0)
                probabilities[bitstring] = round(c / total_shots, 6)
        else:
            # For larger state spaces, populate observed counts and non-observed on demand
            for bitstring, c in counts.items():
                probabilities[bitstring] = round(c / total_shots, 6)

        # Build gates by type summary
        gates_by_type: Dict[str, int] = {}
        for g in circuit.gates:
            gates_by_type[g.type.value] = gates_by_type.get(g.type.value, 0) + 1

        circuit_metadata = CircuitMetadata(
            gate_count=len(circuit.gates),
            depth=qc.depth(),
            gates_by_type=gates_by_type
        )

        return SimulationResultSchema(
            success=True,
            backend=self.name,
            num_qubits=circuit.num_qubits,
            num_classical_bits=n_clbits,
            shots=circuit.shots,
            counts=counts,
            probabilities=probabilities,
            execution_time_ms=execution_time_ms,
            circuit_metadata=circuit_metadata
        )
