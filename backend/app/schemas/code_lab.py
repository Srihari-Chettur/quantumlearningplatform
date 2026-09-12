from typing import Dict, Optional, Any
from pydantic import BaseModel, Field
from app.schemas.circuit import CircuitSchema


class CodeExecutionRequest(BaseModel):
    """Request payload for executing quantum code safely."""
    code: str = Field(..., description="Quantum program source code")
    language: str = Field(default="qiskit", description="Programming framework: qiskit, pennylane, cirq")
    shots: int = Field(default=1024, ge=1, le=10000, description="Measurement sample count")
    user_id: str = Field(default="student_demo", description="Active student ID")


class CodeExecutionResponse(BaseModel):
    """Structured execution results from safe quantum code simulation."""
    success: bool
    stdout: str
    circuit_ascii: Optional[str] = None
    circuit: Optional[CircuitSchema] = None
    counts: Dict[str, int] = Field(default_factory=dict)
    probabilities: Dict[str, float] = Field(default_factory=dict)
    execution_time_ms: float = 0.0
    backend: str = "qiskit-aer"
    error: Optional[str] = None


class CodeValidationRequest(BaseModel):
    """Request payload for static syntax and safety validation of quantum code."""
    code: str
    language: str = "qiskit"


class CodeValidationResponse(BaseModel):
    """Static validation diagnostics."""
    valid: bool
    error: Optional[str] = None
    qubits_detected: Optional[int] = None
    gates_detected: Optional[int] = None


class CodeToCircuitRequest(BaseModel):
    """Request to convert supported quantum code to canonical Circuit JSON."""
    code: str
    language: str = "qiskit"


class CodeToCircuitResponse(BaseModel):
    """Resulting canonical Circuit JSON."""
    success: bool
    circuit: Optional[CircuitSchema] = None
    error: Optional[str] = None


class CircuitToCodeRequest(BaseModel):
    """Request to export canonical Circuit JSON into quantum code."""
    circuit: CircuitSchema
    language: str = "qiskit"


class CircuitToCodeResponse(BaseModel):
    """Exported code snippet."""
    code: str
    language: str
