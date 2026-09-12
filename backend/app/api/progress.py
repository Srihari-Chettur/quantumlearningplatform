import logging
from fastapi import APIRouter, status, Query
from app.database.repositories import EducationRepository

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Retrieve current student progress and topic mastery metrics"
)
async def get_progress(user_id: str = Query("student_demo")) -> dict:
    return EducationRepository.get_student_progress(user_id=user_id)


@router.post(
    "/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset student progress for demo purposes"
)
async def reset_progress(user_id: str = Query("student_demo")) -> dict:
    EducationRepository.reset_progress(user_id=user_id)
    return {"status": "success", "message": f"Progress reset successfully for user '{user_id}'."}
