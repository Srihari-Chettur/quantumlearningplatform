"""API router package registering all Phase P0 and P1 endpoints."""
from fastapi import APIRouter
from app.api.simulation import router as simulation_router
from app.api.code import router as code_router
from app.api.ai import router as ai_router
from app.api.lessons import router as lessons_router
from app.api.assessments import router as assessments_router
from app.api.challenges import router as challenges_router
from app.api.progress import router as progress_router
from app.api.recommendations import router as recommendations_router
from app.api.dashboard import router as dashboard_router

api_router = APIRouter()

# P0 Core Simulation Router
api_router.include_router(simulation_router, prefix="/simulation", tags=["simulation"])

# P1 Interactive & Educational Routers
api_router.include_router(code_router, prefix="/code", tags=["code"])
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])
api_router.include_router(lessons_router, prefix="/lessons", tags=["lessons"])
api_router.include_router(assessments_router, prefix="/assessments", tags=["assessments"])
api_router.include_router(challenges_router, prefix="/challenges", tags=["challenges"])
api_router.include_router(progress_router, prefix="/progress", tags=["progress"])
api_router.include_router(recommendations_router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])

__all__ = ["api_router"]
