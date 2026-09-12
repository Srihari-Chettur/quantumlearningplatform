from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from app.schemas.circuit import CircuitSchema


class LessonSchema(BaseModel):
    """Schema for quantum computing lesson."""
    id: str
    slug: str
    title: str
    category: str
    order_index: int
    description: str
    content_markdown: str
    prerequisites: List[str] = Field(default_factory=list)
    user_status: str = "not_started"


class LessonListResponse(BaseModel):
    lessons: List[LessonSchema]


class AssessmentQuestionSchema(BaseModel):
    """Schema for an interactive assessment question."""
    id: str
    topic: str
    type: str
    question: str
    options: List[str]
    explanation: str
    prerequisite_lesson_id: Optional[str] = None


class AssessmentSubmissionRequest(BaseModel):
    """Submission payload for an assessment question."""
    question_id: str
    selected_answer: str
    user_id: str = "student_demo"


class AssessmentResultResponse(BaseModel):
    """Result of an assessment attempt with explanation and misconception guide."""
    question_id: str
    is_correct: bool
    correct_answer: str
    selected_answer: str
    explanation: str
    lesson_review_url: Optional[str] = None


class CodingChallengeSchema(BaseModel):
    """Schema for interactive quantum coding challenge."""
    id: str
    title: str
    difficulty: str
    topic: str
    description: str
    objective: str
    starter_code: str
    starter_circuit: Optional[Dict[str, Any]] = None
    expected_behavior: Dict[str, Any]
    hints: List[str] = Field(default_factory=list)
    passed: bool = False
    high_score: int = 0


class ChallengeSubmissionRequest(BaseModel):
    """Submission payload for a coding challenge."""
    challenge_id: str
    code: Optional[str] = None
    circuit: Optional[CircuitSchema] = None
    user_id: str = "student_demo"


class ChallengeResultResponse(BaseModel):
    """Evaluation result for a coding challenge submission."""
    challenge_id: str
    passed: bool
    score: int
    feedback: str
    probabilities: Dict[str, float] = Field(default_factory=dict)
    counts: Dict[str, int] = Field(default_factory=dict)
    circuit_ascii: Optional[str] = None
    error: Optional[str] = None


class TopicMasterySchema(BaseModel):
    """Mastery progress in an individual quantum topic."""
    topic: str
    mastery_level: str
    quiz_avg_score: float
    challenges_completed: int
    simulations_run: int


class DashboardSummaryResponse(BaseModel):
    """Aggregated student metrics for the student dashboard."""
    user_id: str
    completed_lessons: int
    completed_challenges: int
    avg_quiz_score: float
    simulations_run: int
    overall_progress_pct: float
    topics_progress: List[TopicMasterySchema]
    recent_activities: List[Dict[str, Any]]


class RecommendationSchema(BaseModel):
    """Targeted learning recommendation."""
    id: str
    title: str
    reason: str
    category: str
    action_label: str
    action_url: str
    priority: str = "Medium" # High, Medium, Low


class RecommendationListResponse(BaseModel):
    recommendations: List[RecommendationSchema]
