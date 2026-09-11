from abc import ABC, abstractmethod
from app.schemas.circuit import CircuitSchema
from app.schemas.simulation import SimulationResultSchema


class QuantumSimulatorBase(ABC):
    """Abstract base class defining the contract for quantum simulation backends."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Returns the unique identifier/name for this backend simulator."""
        pass

    @abstractmethod
    def simulate(self, circuit: CircuitSchema) -> SimulationResultSchema:
        """Execute a quantum circuit simulation and return structured results.
        
        Args:
            circuit: Validated standardized CircuitSchema instance.

        Returns:
            SimulationResultSchema containing counts, basis probabilities, and metadata.
        """
        pass
