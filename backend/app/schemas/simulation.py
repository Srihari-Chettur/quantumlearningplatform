from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class CircuitMetadata(BaseModel):
    """Metadata describing structural properties of the simulated circuit."""
    gate_count: int = Field(..., description="Total number of gate and measurement operations")
    depth: int = Field(..., description="Calculated quantum circuit depth")
    gates_by_type: Dict[str, int] = Field(
        default_factory=dict,
        description="Histogram of operations grouped by gate type"
    )


class SimulationResultSchema(BaseModel):
    """Standardized response schema for quantum simulation results."""
    success: bool = Field(default=True, description="Indicates if simulation succeeded")
    backend: str = Field(default="qiskit-aer", description="Simulation backend engine used")
    num_qubits: int = Field(..., description="Number of qubits in simulated circuit")
    num_classical_bits: int = Field(..., description="Number of classical bits in simulated circuit")
    shots: int = Field(..., description="Total number of measurement shots executed")
    counts: Dict[str, int] = Field(
        ...,
        description="Sampled measurement counts keyed by bitstring"
    )
    probabilities: Dict[str, float] = Field(
        ...,
        description="Calculated measurement probabilities for all computational basis states"
    )
    execution_time_ms: float = Field(
        ...,
        description="Simulation execution duration in milliseconds"
    )
    circuit_metadata: CircuitMetadata = Field(
        ...,
        description="Structural metadata for the simulated circuit"
    )
