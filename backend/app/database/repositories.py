import json
import logging
import uuid
from typing import List, Optional, Dict, Any
from app.database.connection import get_db_connection

logger = logging.getLogger(__name__)


class EducationRepository:
    """Repository handling database operations for lessons, assessments, and challenges."""

    # ------------------ Lessons ------------------
    @staticmethod
    def get_all_lessons(user_id: str = "student_demo") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT l.*, COALESCE(lp.status, 'not_started') as user_status
                FROM lessons l
                LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
                ORDER BY l.order_index ASC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["prerequisites"] = json.loads(item["prerequisites"] or "[]")
                results.append(item)
            return results

    @staticmethod
    def get_lesson_by_id(lesson_id: str, user_id: str = "student_demo") -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT l.*, COALESCE(lp.status, 'not_started') as user_status
                FROM lessons l
                LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
                WHERE l.id = ? OR l.slug = ?
                """,
                (user_id, lesson_id, lesson_id)
            )
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            item["prerequisites"] = json.loads(item["prerequisites"] or "[]")
            return item

    @staticmethod
    def complete_lesson(lesson_id: str, user_id: str = "student_demo") -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at)
                VALUES (?, ?, 'completed', CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, lesson_id) DO UPDATE SET
                    status='completed',
                    completed_at=CURRENT_TIMESTAMP
                """,
                (user_id, lesson_id)
            )
            return True

    # ------------------ Assessments ------------------
    @staticmethod
    def get_assessment_questions(topic: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if topic and topic != "all":
                cursor.execute(
                    "SELECT * FROM assessment_questions WHERE topic = ? ORDER BY id ASC",
                    (topic,)
                )
            else:
                cursor.execute("SELECT * FROM assessment_questions ORDER BY id ASC")
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["options"] = json.loads(item["options_json"])
                results.append(item)
            return results

    @staticmethod
    def get_question_by_id(question_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM assessment_questions WHERE id = ?", (question_id,))
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            item["options"] = json.loads(item["options_json"])
            return item

    @staticmethod
    def record_assessment_attempt(
        user_id: str, question_id: str, selected_answer: str, is_correct: bool
    ) -> str:
        attempt_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO assessment_attempts (id, user_id, question_id, selected_answer, is_correct)
                VALUES (?, ?, ?, ?, ?)
                """,
                (attempt_id, user_id, question_id, selected_answer, 1 if is_correct else 0)
            )
            
            # Recalculate topic progress for student
            cursor.execute("SELECT topic FROM assessment_questions WHERE id = ?", (question_id,))
            q_row = cursor.fetchone()
            if q_row:
                topic = q_row["topic"]
                cursor.execute(
                    """
                    SELECT AVG(is_correct) as avg_score, COUNT(*) as total_attempts
                    FROM assessment_attempts aa
                    JOIN assessment_questions aq ON aa.question_id = aq.id
                    WHERE aa.user_id = ? AND aq.topic = ?
                    """,
                    (user_id, topic)
                )
                score_row = cursor.fetchone()
                avg_pct = (score_row["avg_score"] or 0.0) * 100.0

                # Determine mastery level
                mastery = "Learning"
                if avg_pct >= 90.0:
                    mastery = "Mastered"
                elif avg_pct >= 75.0:
                    mastery = "Proficient"
                elif avg_pct >= 50.0:
                    mastery = "Practicing"

                cursor.execute(
                    """
                    INSERT INTO student_progress (user_id, topic, mastery_level, quiz_avg_score, last_updated)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, topic) DO UPDATE SET
                        mastery_level = excluded.mastery_level,
                        quiz_avg_score = excluded.quiz_avg_score,
                        last_updated = CURRENT_TIMESTAMP
                    """,
                    (user_id, topic, mastery, avg_pct)
                )
        return attempt_id

    # ------------------ Challenges ------------------
    @staticmethod
    def get_all_challenges(user_id: str = "student_demo") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT c.*, 
                       (SELECT MAX(passed) FROM challenge_attempts WHERE user_id = ? AND challenge_id = c.id) as user_passed,
                       (SELECT MAX(score) FROM challenge_attempts WHERE user_id = ? AND challenge_id = c.id) as user_high_score
                FROM coding_challenges c
                ORDER BY c.rowid ASC
                """,
                (user_id, user_id)
            )
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["starter_circuit"] = json.loads(item["starter_circuit_json"] or "{}")
                item["expected_behavior"] = json.loads(item["expected_behavior_json"])
                item["hints"] = json.loads(item["hints_json"])
                item["passed"] = bool(item["user_passed"])
                item["high_score"] = item["user_high_score"] or 0
                results.append(item)
            return results

    @staticmethod
    def get_challenge_by_id(challenge_id: str, user_id: str = "student_demo") -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT c.*, 
                       (SELECT MAX(passed) FROM challenge_attempts WHERE user_id = ? AND challenge_id = c.id) as user_passed,
                       (SELECT MAX(score) FROM challenge_attempts WHERE user_id = ? AND challenge_id = c.id) as user_high_score
                FROM coding_challenges c
                WHERE c.id = ?
                """,
                (user_id, user_id, challenge_id)
            )
            row = cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            item["starter_circuit"] = json.loads(item["starter_circuit_json"] or "{}")
            item["expected_behavior"] = json.loads(item["expected_behavior_json"])
            item["hints"] = json.loads(item["hints_json"])
            item["passed"] = bool(item["user_passed"])
            item["high_score"] = item["user_high_score"] or 0
            return item

    @staticmethod
    def record_challenge_attempt(
        user_id: str,
        challenge_id: str,
        submitted_code: str,
        circuit_json: Optional[Dict[str, Any]],
        simulation_result: Optional[Dict[str, Any]],
        score: int,
        passed: bool,
        feedback: str
    ) -> str:
        attempt_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO challenge_attempts (id, user_id, challenge_id, submitted_code, circuit_json, simulation_result_json, score, passed, feedback)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    attempt_id,
                    user_id,
                    challenge_id,
                    submitted_code,
                    json.dumps(circuit_json) if circuit_json else None,
                    json.dumps(simulation_result) if simulation_result else None,
                    score,
                    1 if passed else 0,
                    feedback
                )
            )

            # Update student progress for this topic
            cursor.execute("SELECT topic FROM coding_challenges WHERE id = ?", (challenge_id,))
            ch_row = cursor.fetchone()
            if ch_row:
                topic = ch_row["topic"]
                cursor.execute(
                    """
                    SELECT COUNT(DISTINCT challenge_id) as passed_challenges
                    FROM challenge_attempts ca
                    JOIN coding_challenges cc ON ca.challenge_id = cc.id
                    WHERE ca.user_id = ? AND cc.topic = ? AND ca.passed = 1
                    """,
                    (user_id, topic)
                )
                p_row = cursor.fetchone()
                passed_count = p_row["passed_challenges"] if p_row else 0
                cursor.execute(
                    """
                    INSERT INTO student_progress (user_id, topic, challenges_completed, last_updated)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, topic) DO UPDATE SET
                        challenges_completed = ?,
                        last_updated = CURRENT_TIMESTAMP
                    """,
                    (user_id, topic, passed_count, passed_count)
                )
        return attempt_id

    # ------------------ Progress & Dashboard ------------------
    @staticmethod
    def get_student_progress(user_id: str = "student_demo") -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM student_progress WHERE user_id = ?", (user_id,))
            topic_rows = cursor.fetchall()

            # Global counters
            cursor.execute(
                "SELECT COUNT(*) as completed_lessons FROM lesson_progress WHERE user_id = ? AND status = 'completed'",
                (user_id,)
            )
            completed_lessons = cursor.fetchone()["completed_lessons"]

            cursor.execute(
                "SELECT COUNT(DISTINCT challenge_id) as completed_challenges FROM challenge_attempts WHERE user_id = ? AND passed = 1",
                (user_id,)
            )
            completed_challenges = cursor.fetchone()["completed_challenges"]

            cursor.execute(
                "SELECT AVG(is_correct) as avg_score FROM assessment_attempts WHERE user_id = ?",
                (user_id,)
            )
            avg_score_row = cursor.fetchone()
            avg_quiz_score = round((avg_score_row["avg_score"] or 0.0) * 100.0, 1)

            cursor.execute(
                "SELECT COUNT(*) as total_simulations FROM simulation_runs WHERE user_id = ?",
                (user_id,)
            )
            simulations_run = cursor.fetchone()["total_simulations"]

            # Recent activity
            cursor.execute(
                """
                SELECT 'challenge' as type, cc.title as label, ca.score, ca.passed, ca.attempted_at as timestamp
                FROM challenge_attempts ca
                JOIN coding_challenges cc ON ca.challenge_id = cc.id
                WHERE ca.user_id = ?
                UNION ALL
                SELECT 'quiz' as type, aq.topic as label, (aa.is_correct * 100) as score, aa.is_correct as passed, aa.attempted_at as timestamp
                FROM assessment_attempts aa
                JOIN assessment_questions aq ON aa.question_id = aq.id
                WHERE aa.user_id = ?
                ORDER BY timestamp DESC
                LIMIT 6
                """,
                (user_id, user_id)
            )
            recent_activities = [dict(r) for r in cursor.fetchall()]

            topics_progress = []
            for r in topic_rows:
                topics_progress.append({
                    "topic": r["topic"],
                    "mastery_level": r["mastery_level"],
                    "quiz_avg_score": round(r["quiz_avg_score"], 1),
                    "challenges_completed": r["challenges_completed"],
                    "simulations_run": r["simulations_run"],
                })

            return {
                "user_id": user_id,
                "completed_lessons": completed_lessons,
                "completed_challenges": completed_challenges,
                "avg_quiz_score": avg_quiz_score,
                "simulations_run": simulations_run,
                "topics_progress": topics_progress,
                "recent_activities": recent_activities
            }

    @staticmethod
    def record_simulation_run(user_id: str, num_qubits: int, gate_count: int, shots: int, counts: Dict[str, int]) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO simulation_runs (id, user_id, num_qubits, gate_count, shots, success, counts_json)
                VALUES (?, ?, ?, ?, ?, 1, ?)
                """,
                (str(uuid.uuid4()), user_id, num_qubits, gate_count, shots, json.dumps(counts))
            )
            cursor.execute(
                """
                UPDATE student_progress
                SET simulations_run = simulations_run + 1, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (user_id,)
            )

    @staticmethod
    def record_ai_interaction(user_id: str, context_type: str, prompt: str, response: str) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO ai_interactions (id, user_id, context_type, prompt, response)
                VALUES (?, ?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), user_id, context_type, prompt, response)
            )

    @staticmethod
    def reset_progress(user_id: str = "student_demo") -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM lesson_progress WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM assessment_attempts WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM challenge_attempts WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM simulation_runs WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM ai_interactions WHERE user_id = ?", (user_id,))
            cursor.execute(
                """
                UPDATE student_progress
                SET mastery_level = 'Learning', quiz_avg_score = 0.0, challenges_completed = 0, simulations_run = 0, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (user_id,)
            )
