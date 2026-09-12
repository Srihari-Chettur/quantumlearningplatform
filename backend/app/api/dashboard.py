import logging
from fastapi import APIRouter, status, Query
from app.database.repositories import EducationRepository
from app.schemas.education import DashboardSummaryResponse, TopicMasterySchema

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "",
    response_model=DashboardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve consolidated student metrics for the learning dashboard"
)
async def get_dashboard_data(user_id: str = Query("student_demo")) -> DashboardSummaryResponse:
    progress = EducationRepository.get_student_progress(user_id=user_id)
    lessons = EducationRepository.get_all_lessons(user_id=user_id)
    total_lessons = len(lessons) or 1
    challenges = EducationRepository.get_all_challenges(user_id=user_id)
    total_challenges = len(challenges) or 1

    # Compute overall progress percentage as blended metric
    lesson_pct = (progress["completed_lessons"] / total_lessons) * 100.0
    challenge_pct = (progress["completed_challenges"] / total_challenges) * 100.0
    quiz_pct = progress["avg_quiz_score"]
    overall_progress = round(0.4 * lesson_pct + 0.4 * challenge_pct + 0.2 * quiz_pct, 1)

    topics_models = [TopicMasterySchema(**tp) for tp in progress["topics_progress"]]

    return DashboardSummaryResponse(
        user_id=user_id,
        completed_lessons=progress["completed_lessons"],
        completed_challenges=progress["completed_challenges"],
        avg_quiz_score=progress["avg_quiz_score"],
        simulations_run=progress["simulations_run"],
        overall_progress_pct=overall_progress,
        topics_progress=topics_models,
        recent_activities=progress["recent_activities"]
    )
