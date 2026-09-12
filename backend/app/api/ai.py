import logging
from fastapi import APIRouter, status
from app.schemas.ai import AIPromptRequest, AIResponse, AIStatusResponse
from app.services.ai.tutor_service import AITutorService

logger = logging.getLogger(__name__)

router = APIRouter()
ai_service = AITutorService()


@router.get(
    "/status",
    response_model=AIStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check AI Tutor model configuration, connectivity, and fallback reason"
)
async def get_ai_status() -> AIStatusResponse:
    return await ai_service.get_status()


@router.post(
    "/ask",
    response_model=AIResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask AI Quantum Tutor general or contextual question"
)
async def ask_tutor(request: AIPromptRequest) -> AIResponse:
    return await ai_service.ask(request)


@router.post(
    "/explain",
    response_model=AIResponse,
    status_code=status.HTTP_200_OK,
    summary="Request AI explanation of a concept, circuit, or result"
)
async def explain_tutor(request: AIPromptRequest) -> AIResponse:
    if not request.action or request.action == "ask":
        request.action = "explain_circuit" if request.circuit else "explain_concept"
    return await ai_service.ask(request)


@router.post(
    "/debug",
    response_model=AIResponse,
    status_code=status.HTTP_200_OK,
    summary="Request AI debugging of a circuit or quantum program"
)
async def debug_tutor(request: AIPromptRequest) -> AIResponse:
    request.action = "debug_circuit" if request.circuit else "debug_code"
    return await ai_service.ask(request)


@router.post(
    "/hint",
    response_model=AIResponse,
    status_code=status.HTTP_200_OK,
    summary="Get progressive hints for active coding challenge"
)
async def hint_tutor(request: AIPromptRequest) -> AIResponse:
    request.action = "give_hint"
    return await ai_service.ask(request)
