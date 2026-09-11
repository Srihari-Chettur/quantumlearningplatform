import logging
from typing import Optional
from app.schemas.circuit import CircuitSchema
from app.schemas.simulation import SimulationResultSchema
from app.services.quantum.base import QuantumSimulatorBase
from app.services.quantum.qiskit_adapter import QiskitAerAdapter

logger = logging.getLogger(__name__)


class QuantumSimulationService:
    """Service layer coordinating circuit simulations across pluggable quantum backends."""

    def __init__(self, backend_adapter: Optional[QuantumSimulatorBase] = None) -> None:
        self._adapter: QuantumSimulatorBase = backend_adapter or QiskitAerAdapter()

    @property
    def backend_name(self) -> str:
        return self._adapter.name

    def run_simulation(self, circuit: CircuitSchema) -> SimulationResultSchema:
        """Run simulation on the configured backend.
        
        Args:
            circuit: Validated circuit schema.
            
        Returns:
            SimulationResultSchema containing counts, probabilities, and execution metrics.
            
        Raises:
            RuntimeError: If the simulation execution fails internally.
        """
        logger.info(
            f"Initiating simulation: backend={self._adapter.name}, "
            f"qubits={circuit.num_qubits}, clbits={circuit.num_classical_bits}, "
            f"gates={len(circuit.gates)}, shots={circuit.shots}"
        )
        try:
            result = self._adapter.simulate(circuit)
            logger.info(
                f"Simulation completed successfully in {result.execution_time_ms}ms "
                f"with {len(result.counts)} observed states."
            )
            return result
        except Exception as e:
            logger.exception(f"Error occurred during quantum simulation on {self._adapter.name}: {str(e)}")
            raise RuntimeError(f"Quantum simulation failed on backend '{self._adapter.name}': {str(e)}")
