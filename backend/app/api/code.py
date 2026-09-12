import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.code_lab import (
    CodeExecutionRequest,
    CodeExecutionResponse,
    CodeValidationRequest,
    CodeValidationResponse,
    CodeToCircuitRequest,
    CodeToCircuitResponse,
    CircuitToCodeRequest,
    CircuitToCodeResponse,
)
from app.services.code.safe_executor import execute_quantum_code, validate_code_safety
from app.services.code.transpiler import circuit_to_code, code_to_circuit

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/run",
    response_model=CodeExecutionResponse,
    status_code=status.HTTP_200_OK,
    summary="Safely execute quantum code",
    description="Validates Python AST, extracts quantum circuit operations, and simulates via Qiskit Aer."
)
async def run_code(request: CodeExecutionRequest) -> CodeExecutionResponse:
    return execute_quantum_code(request)


@router.post(
    "/validate",
    response_model=CodeValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate quantum code syntax and safety"
)
async def validate_code(request: CodeValidationRequest) -> CodeValidationResponse:
    is_safe, err = validate_code_safety(request.code)
    if not is_safe:
        return CodeValidationResponse(valid=False, error=err)
    try:
        circuit = code_to_circuit(request.code, request.language)
        return CodeValidationResponse(
            valid=True,
            qubits_detected=circuit.num_qubits,
            gates_detected=len(circuit.gates)
        )
    except Exception as e:
        return CodeValidationResponse(valid=False, error=str(e))


@router.post(
    "/to-circuit",
    response_model=CodeToCircuitResponse,
    status_code=status.HTTP_200_OK,
    summary="Transpile quantum code to Circuit JSON"
)
async def convert_code_to_circuit(request: CodeToCircuitRequest) -> CodeToCircuitResponse:
    try:
        circuit = code_to_circuit(request.code, request.language)
        return CodeToCircuitResponse(success=True, circuit=circuit)
    except Exception as e:
        return CodeToCircuitResponse(success=False, error=str(e))


@router.post(
    "/to-code",
    response_model=CircuitToCodeResponse,
    status_code=status.HTTP_200_OK,
    summary="Export Circuit JSON to code snippet"
)
async def convert_circuit_to_code(request: CircuitToCodeRequest) -> CircuitToCodeResponse:
    code = circuit_to_code(request.circuit, request.language)
    return CircuitToCodeResponse(code=code, language=request.language)
