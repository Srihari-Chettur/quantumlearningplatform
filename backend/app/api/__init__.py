"""API router package."""
from fastapi import APIRouter
from app.api.simulation import router as simulation_router

api_router = APIRouter()
api_router.include_router(simulation_router, prefix="/simulation", tags=["simulation"])

__all__ = ["api_router"]
