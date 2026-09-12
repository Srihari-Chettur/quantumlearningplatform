import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_lessons_api():
    response = client.get("/api/lessons")
    assert response.status_code == 200
    lessons = response.json()["lessons"]
    assert len(lessons) >= 10
    first_lesson = lessons[0]

    # Individual lesson
    detail_res = client.get(f"/api/lessons/{first_lesson['id']}")
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == first_lesson["title"]

    # Complete lesson
    comp_res = client.post(f"/api/lessons/{first_lesson['id']}/complete")
    assert comp_res.status_code == 200
    assert comp_res.json()["completed"] is True


def test_assessments_api():
    # List questions
    q_res = client.get("/api/assessments")
    assert q_res.status_code == 200
    questions = q_res.json()
    assert len(questions) >= 20

    # Submit correct answer for q_01 (normalization: |α|² + |β|² = 1 is option "1")
    submit_res = client.post("/api/assessments/submit", json={
        "question_id": "q_01",
        "selected_answer": "1"
    })
    assert submit_res.status_code == 200
    result = submit_res.json()
    assert result["is_correct"] is True

    # Submit incorrect answer
    wrong_res = client.post("/api/assessments/submit", json={
        "question_id": "q_01",
        "selected_answer": "0"
    })
    assert wrong_res.status_code == 200
    assert wrong_res.json()["is_correct"] is False
    assert wrong_res.json()["explanation"] is not None


def test_challenges_api():
    # List challenges
    c_res = client.get("/api/challenges")
    assert c_res.status_code == 200
    challenges = c_res.json()
    assert len(challenges) >= 10

    # Submit passing code for X gate challenge
    passing_code = """
from qiskit import QuantumCircuit
qc = QuantumCircuit(1, 1)
qc.x(0)
qc.measure(0, 0)
"""
    sub_res = client.post("/api/challenges/submit", json={
        "challenge_id": "chall_x_gate",
        "code": passing_code
    })
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["passed"] is True
    assert sub_data["score"] == 100


def test_progress_and_dashboard_api():
    # Fetch progress
    prog_res = client.get("/api/progress")
    assert prog_res.status_code == 200
    prog_data = prog_res.json()
    assert "completed_lessons" in prog_data
    assert "completed_challenges" in prog_data

    # Fetch dashboard data
    dash_res = client.get("/api/dashboard")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "overall_progress_pct" in dash_data
    assert len(dash_data["topics_progress"]) >= 5


def test_recommendations_api():
    rec_res = client.get("/api/recommendations")
    assert rec_res.status_code == 200
    recs = rec_res.json()["recommendations"]
    assert len(recs) >= 3
    assert all("action_url" in r for r in recs)
