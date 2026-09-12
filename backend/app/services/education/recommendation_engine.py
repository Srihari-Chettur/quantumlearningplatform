import logging
from typing import List
from app.database.repositories import EducationRepository
from app.schemas.education import RecommendationSchema

logger = logging.getLogger(__name__)


def generate_recommendations(user_id: str = "student_demo") -> List[RecommendationSchema]:
    """Generates deterministic, rule-based recommendations based on student's actual learning progress."""
    progress_data = EducationRepository.get_student_progress(user_id)
    topics_progress = progress_data.get("topics_progress", [])
    completed_lessons = progress_data.get("completed_lessons", 0)
    completed_challenges = progress_data.get("completed_challenges", 0)
    avg_quiz_score = progress_data.get("avg_quiz_score", 0.0)

    recommendations: List[RecommendationSchema] = []

    # Rule 1: Weak Quiz Topic Check (< 60%)
    for tp in topics_progress:
        topic_name = tp["topic"]
        score = tp["quiz_avg_score"]
        if 0 < score < 60.0:
            recommendations.append(
                RecommendationSchema(
                    id=f"rec_review_{topic_name}",
                    title=f"Review {topic_name.title()} Fundamentals",
                    reason=f"Your average score on {topic_name} quizzes is {score}%. Strengthening core intuition will help with coding challenges.",
                    category="Lesson Review",
                    action_label=f"Review {topic_name.title()} Lesson",
                    action_url=f"/lessons/gates",
                    priority="High"
                )
            )

    # Rule 2: Challenges Not Yet Completed
    challenges = EducationRepository.get_all_challenges(user_id)
    unpassed_challenges = [c for c in challenges if not c["passed"]]

    if unpassed_challenges:
        next_chall = unpassed_challenges[0]
        recommendations.append(
            RecommendationSchema(
                id=f"rec_chall_{next_chall['id']}",
                title=f"Next Challenge: {next_chall['title']}",
                reason=f"Build and test this {next_chall['difficulty']} level quantum circuit to verify your gate knowledge.",
                category="Coding Challenge",
                action_label="Start Challenge",
                action_url=f"/challenges?id={next_chall['id']}",
                priority="High"
            )
        )

    # Rule 3: Prerequisite Progression Check
    if completed_lessons < 3:
        recommendations.append(
            RecommendationSchema(
                id="rec_lesson_gates",
                title="Master Single Qubit Gates",
                reason="Explore Hadamard, Pauli-X, and Phase gates on interactive Bloch spheres.",
                category="Interactive Lesson",
                action_label="Open Gates Lesson",
                action_url="/lessons/gates",
                priority="Medium"
            )
        )

    # Rule 4: Grover Exploration Check
    grover_challenges = [c for c in challenges if c["topic"] == "grover" and c["passed"]]
    if not grover_challenges:
        recommendations.append(
            RecommendationSchema(
                id="rec_grover_journey",
                title="Dive into Grover's Search Algorithm",
                reason="Experience quadratic quantum speedup with our interactive geometric phase rotation visualization.",
                category="Algorithm Exploration",
                action_label="Explore Grover",
                action_url="/lessons/grover",
                priority="Medium"
            )
        )

    # Rule 5: Code Lab Bridge
    recommendations.append(
        RecommendationSchema(
            id="rec_code_lab_practice",
            title="Write Real Qiskit Code in Code Lab",
            reason="Translate visual circuits into Python scripts and observe live Qiskit Aer simulation telemetry.",
            category="Hands-on Coding",
            action_label="Launch Code Lab",
            action_url="/code-lab",
            priority="Low"
        )
    )

    # Rule 6: Assessment Check
    if avg_quiz_score == 0.0:
        recommendations.append(
            RecommendationSchema(
                id="rec_first_assessment",
                title="Take Your First Quantum Quiz",
                reason="Evaluate your conceptual grasp of superposition, Dirac notation, and Pauli operators.",
                category="Knowledge Check",
                action_label="Start Assessment",
                action_url="/assessments",
                priority="High"
            )
        )

    return recommendations
