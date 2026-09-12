import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from app.database.repositories import EducationRepository
from app.schemas.education import (
    AssessmentQuestionSchema,
    AssessmentSubmissionRequest,
    AssessmentResultResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "",
    response_model=List[AssessmentQuestionSchema],
    status_code=status.HTTP_200_OK,
    summary="List assessment questions optionally filtered by topic"
)
async def list_questions(topic: Optional[str] = Query(None)) -> List[AssessmentQuestionSchema]:
    questions = EducationRepository.get_assessment_questions(topic=topic)
    return [AssessmentQuestionSchema(**q) for q in questions]


@router.post(
    "/submit",
    response_model=AssessmentResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit student answer to an assessment question"
)
async def submit_answer(request: AssessmentSubmissionRequest) -> AssessmentResultResponse:
    q = EducationRepository.get_question_by_id(request.question_id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Question '{request.question_id}' not found.")

    correct_ans = str(q["correct_answer"]).strip()
    user_ans = str(request.selected_answer).strip()
    is_correct = (correct_ans == user_ans)

    EducationRepository.record_assessment_attempt(
        user_id=request.user_id,
        question_id=request.question_id,
        selected_answer=user_ans,
        is_correct=is_correct
    )

    lesson_url = f"/lessons/gates"
    if q.get("prerequisite_lesson_id") == "les_grover":
        lesson_url = "/lessons/grover"

    return AssessmentResultResponse(
        question_id=request.question_id,
        is_correct=is_correct,
        correct_answer=correct_ans,
        selected_answer=user_ans,
        explanation=q["explanation"],
        lesson_review_url=lesson_url
    )
