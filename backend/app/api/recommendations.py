import logging
from fastapi import APIRouter, status, Query
from app.schemas.education import RecommendationListResponse
from app.services.education.recommendation_engine import generate_recommendations

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "",
    response_model=RecommendationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve personalized learning recommendations"
)
async def get_recommendations(user_id: str = Query("student_demo")) -> RecommendationListResponse:
    recs = generate_recommendations(user_id=user_id)
    return RecommendationListResponse(recommendations=recs)
