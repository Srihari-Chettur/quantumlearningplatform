import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Query
from app.database.repositories import EducationRepository
from app.schemas.education import (
    CodingChallengeSchema,
    ChallengeSubmissionRequest,
    ChallengeResultResponse,
)
from app.services.education.challenge_validator import evaluate_challenge_submission

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "",
    response_model=List[CodingChallengeSchema],
    status_code=status.HTTP_200_OK,
    summary="List all coding challenges with student status"
)
async def list_challenges(user_id: str = Query("student_demo")) -> List[CodingChallengeSchema]:
    challenges = EducationRepository.get_all_challenges(user_id=user_id)
    return [CodingChallengeSchema(**c) for c in challenges]


@router.get(
    "/{challenge_id}",
    response_model=CodingChallengeSchema,
    status_code=status.HTTP_200_OK,
    summary="Retrieve individual challenge detail"
)
async def get_challenge(challenge_id: str, user_id: str = Query("student_demo")) -> CodingChallengeSchema:
    ch = EducationRepository.get_challenge_by_id(challenge_id, user_id=user_id)
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Challenge '{challenge_id}' not found.")
    return CodingChallengeSchema(**ch)


@router.post(
    "/submit",
    response_model=ChallengeResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit and evaluate solution to a coding challenge"
)
async def submit_challenge(request: ChallengeSubmissionRequest) -> ChallengeResultResponse:
    return evaluate_challenge_submission(request)
