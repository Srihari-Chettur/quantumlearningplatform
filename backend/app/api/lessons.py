import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Query
from app.database.repositories import EducationRepository
from app.schemas.education import LessonSchema, LessonListResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "",
    response_model=LessonListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all curriculum lessons with completion status"
)
async def list_lessons(user_id: str = Query("student_demo")) -> LessonListResponse:
    lessons = EducationRepository.get_all_lessons(user_id=user_id)
    return LessonListResponse(lessons=[LessonSchema(**l) for l in lessons])


@router.get(
    "/{lesson_id}",
    response_model=LessonSchema,
    status_code=status.HTTP_200_OK,
    summary="Retrieve individual lesson content and metadata"
)
async def get_lesson(lesson_id: str, user_id: str = Query("student_demo")) -> LessonSchema:
    lesson = EducationRepository.get_lesson_by_id(lesson_id, user_id=user_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Lesson '{lesson_id}' not found.")
    return LessonSchema(**lesson)


@router.post(
    "/{lesson_id}/complete",
    status_code=status.HTTP_200_OK,
    summary="Mark a lesson as completed for the student"
)
async def complete_lesson(lesson_id: str, user_id: str = Query("student_demo")) -> dict:
    EducationRepository.complete_lesson(lesson_id, user_id=user_id)
    return {"status": "success", "lesson_id": lesson_id, "completed": True}
