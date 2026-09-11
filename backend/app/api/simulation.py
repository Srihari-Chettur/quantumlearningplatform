import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.circuit import CircuitSchema
from app.schemas.simulation import SimulationResultSchema
from app.services.quantum.simulator import QuantumSimulationService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_simulation_service() -> QuantumSimulationService:
    """Dependency provider for the quantum simulation service."""
    return QuantumSimulationService()


@router.post(
    "/run",
    response_model=SimulationResultSchema,
    status_code=status.HTTP_200_OK,
    summary="Run quantum circuit simulation",
    description="Accepts standardized Circuit JSON, executes simulation via Qiskit Aer, and returns counts and probabilities."
)
async def run_simulation(
    circuit: CircuitSchema,
    service: QuantumSimulationService = Depends(get_simulation_service)
) -> SimulationResultSchema:
    """Simulate a quantum circuit and return measurement counts and computational basis probabilities."""
    try:
        result = service.run_simulation(circuit)
        return result
    except ValueError as ve:
        logger.warning(f"Circuit validation error: {str(ve)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        logger.error(f"Simulation runtime error: {str(re)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Simulation failed to execute on the quantum backend."
        )
    except Exception as e:
        logger.exception(f"Unexpected simulation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during quantum circuit simulation."
        )
