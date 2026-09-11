from enum import Enum
from typing import Any, List, Optional, Set
from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.config import settings


class GateType(str, Enum):
    """Supported quantum gate and operation types."""
    H = "H"
    X = "X"
    Y = "Y"
    Z = "Z"
    S = "S"
    T = "T"
    CNOT = "CNOT"
    MEASURE = "MEASURE"


class GateSchema(BaseModel):
    """Schema representing an individual quantum gate or measurement operation."""
    id: str = Field(..., description="Unique identifier for the gate in the circuit")
    type: GateType = Field(..., description="Type of quantum gate or operation")
    qubits: List[int] = Field(..., description="List of target/control qubit indices")
    classical_bits: Optional[List[int]] = Field(
        default=None,
        description="Target classical bit indices (used for MEASURE operations)"
    )

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Gate id cannot be empty.")
        return v.strip()

    @field_validator("type", mode="before")
    @classmethod
    def validate_gate_type(cls, v: Any) -> GateType:
        if isinstance(v, GateType):
            return v
        if isinstance(v, str):
            upper_v = v.strip().upper()
            try:
                return GateType(upper_v)
            except ValueError:
                valid_types = [gt.value for gt in GateType]
                raise ValueError(
                    f"Invalid gate type '{v}'. Supported gate types are: {', '.join(valid_types)}."
                )
        raise ValueError(f"Invalid gate type '{v}'. Expected a valid gate name string.")

    @field_validator("qubits")
    @classmethod
    def validate_qubits_non_empty(cls, v: List[int]) -> List[int]:
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Gate qubits list must contain at least one qubit index.")
        return v


class CircuitSchema(BaseModel):
    """Standardized Circuit JSON representation accepted from frontend."""
    num_qubits: int = Field(..., description="Total number of quantum bits in the circuit")
    num_classical_bits: Optional[int] = Field(
        default=None,
        description="Total number of classical bits. Defaults to num_qubits if omitted."
    )
    gates: List[GateSchema] = Field(..., description="Ordered list of quantum operations")
    shots: int = Field(default=1024, description="Number of simulation measurement shots")

    @field_validator("num_qubits")
    @classmethod
    def validate_num_qubits(cls, v: int) -> int:
        if v <= 0:
            raise ValueError(f"num_qubits must be greater than 0, but received {v}.")
        if v > settings.MAX_QUBITS:
            raise ValueError(
                f"num_qubits cannot exceed {settings.MAX_QUBITS} for state simulation, but received {v}."
            )
        return v

    @field_validator("shots")
    @classmethod
    def validate_shots(cls, v: int) -> int:
        if v <= 0:
            raise ValueError(f"shots must be greater than 0, but received {v}.")
        if v > settings.MAX_SHOTS:
            raise ValueError(f"shots cannot exceed {settings.MAX_SHOTS}, but received {v}.")
        return v

    @field_validator("num_classical_bits")
    @classmethod
    def validate_num_classical_bits(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError(f"num_classical_bits must be greater than 0 when provided, but received {v}.")
        return v

    @model_validator(mode="after")
    def validate_circuit_structure(self) -> "CircuitSchema":
        # Default classical bits to num_qubits if omitted
        if self.num_classical_bits is None:
            self.num_classical_bits = self.num_qubits

        if not self.gates:
            raise ValueError("Circuit must contain at least one gate operation.")

        seen_gate_ids: Set[str] = set()
        measured_classical_bits: Set[int] = set()
        has_measurement = False

        for gate in self.gates:
            # 1. Validate unique gate IDs
            if gate.id in seen_gate_ids:
                raise ValueError(
                    f"Duplicate gate ID '{gate.id}' found. Each gate must have a unique identifier."
                )
            seen_gate_ids.add(gate.id)

            # 2. Validate qubit bounds
            for q in gate.qubits:
                if q < 0 or q >= self.num_qubits:
                    raise ValueError(
                        f"Gate '{gate.id}' references qubit {q}, but the circuit only contains {self.num_qubits} qubits."
                    )

            # 3. Validate single-qubit gates
            if gate.type in {
                GateType.H,
                GateType.X,
                GateType.Y,
                GateType.Z,
                GateType.S,
                GateType.T,
            }:
                if len(gate.qubits) != 1:
                    raise ValueError(
                        f"Gate '{gate.id}' of type '{gate.type.value}' requires exactly 1 qubit, but received {len(gate.qubits)}."
                    )
                if gate.classical_bits is not None and len(gate.classical_bits) > 0:
                    raise ValueError(
                        f"Gate '{gate.id}' of type '{gate.type.value}' cannot have classical bits."
                    )

            # 4. Validate CNOT gate
            elif gate.type == GateType.CNOT:
                if len(gate.qubits) != 2:
                    raise ValueError(
                        f"Gate '{gate.id}' of type 'CNOT' requires exactly 2 qubits (control and target), but received {len(gate.qubits)}."
                    )
                if gate.qubits[0] == gate.qubits[1]:
                    raise ValueError(
                        f"Gate '{gate.id}' of type 'CNOT' cannot use the same qubit {gate.qubits[0]} as both control and target."
                    )
                if gate.classical_bits is not None and len(gate.classical_bits) > 0:
                    raise ValueError(
                        f"Gate '{gate.id}' of type 'CNOT' cannot have classical bits."
                    )

            # 5. Validate MEASURE operation
            elif gate.type == GateType.MEASURE:
                has_measurement = True
                if len(gate.qubits) != 1:
                    raise ValueError(
                        f"Gate '{gate.id}' of type 'MEASURE' requires exactly 1 qubit, but received {len(gate.qubits)}."
                    )

                # If classical_bits not supplied, default to the qubit index if in range
                if gate.classical_bits is None or len(gate.classical_bits) == 0:
                    if gate.qubits[0] >= self.num_classical_bits:
                        raise ValueError(
                            f"Gate '{gate.id}' cannot auto-map qubit {gate.qubits[0]} to classical bit because the circuit only contains {self.num_classical_bits} classical bits."
                        )
                    gate.classical_bits = [gate.qubits[0]]
                elif len(gate.classical_bits) != 1:
                    raise ValueError(
                        f"Gate '{gate.id}' of type 'MEASURE' requires exactly 1 classical bit, but received {len(gate.classical_bits)}."
                    )

                # Check classical bit index bounds
                c = gate.classical_bits[0]
                if c < 0 or c >= self.num_classical_bits:
                    raise ValueError(
                        f"Gate '{gate.id}' references classical bit {c}, but the circuit only contains {self.num_classical_bits} classical bits."
                    )

                # Check for multiple measurements targeting the same classical bit
                if c in measured_classical_bits:
                    raise ValueError(
                        f"Classical bit {c} is targeted by multiple measurements. Each measurement must target a unique classical bit."
                    )
                measured_classical_bits.add(c)

        if not has_measurement:
            raise ValueError(
                "Circuit must contain at least one MEASURE gate to perform measurement simulation."
            )

        return self

