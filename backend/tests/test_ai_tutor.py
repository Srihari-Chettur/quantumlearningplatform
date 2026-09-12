import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_ai_tutor_explain_concept():
    payload = {
        "query": "Explain how Grover's algorithm achieves quadratic speedup",
        "action": "explain_concept"
    }
    response = client.post("/api/ai/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Grover" in data["answer"]
    assert "quadratic" in data["answer"].lower() or "speedup" in data["answer"].lower()


def test_ai_tutor_debug_grover_missing_diffuser():
    # Circuit with H and CZ (oracle) but no diffuser
    circuit_payload = {
        "num_qubits": 2,
        "num_classical_bits": 2,
        "gates": [
            {"id": "h0", "type": "H", "qubits": [0]},
            {"id": "h1", "type": "H", "qubits": [1]},
            {"id": "cz", "type": "CZ", "qubits": [0, 1]},
            {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
        ],
        "shots": 1024
    }
    payload = {
        "query": "Why is my Grover algorithm not amplifying the target state?",
        "action": "debug_circuit",
        "circuit": circuit_payload,
        "lesson_title": "Grover's Algorithm"
    }
    response = client.post("/api/ai/debug", json=payload)
    assert response.status_code == 200
    answer = response.json()["answer"]
    assert "diffuser" in answer.lower() or "diffusion" in answer.lower()


def test_ai_tutor_explain_result():
    payload = {
        "query": "What do these simulation results mean?",
        "action": "explain_result",
        "probabilities": {"11": 0.98, "00": 0.01, "01": 0.005, "10": 0.005},
        "counts": {"11": 1004, "00": 10, "01": 5, "10": 5}
    }
    response = client.post("/api/ai/explain", json=payload)
    assert response.status_code == 200
    answer = response.json()["answer"]
    assert "|11⟩" in answer or "11" in answer
    assert "98" in answer or "dominant" in answer.lower()


def test_ai_tutor_progressive_hints():
    payload_lvl1 = {
        "query": "Give me a hint for this challenge",
        "action": "give_hint",
        "challenge_id": "chall_x_gate",
        "hint_level": 1
    }
    res1 = client.post("/api/ai/hint", json=payload_lvl1)
    assert res1.status_code == 200
    assert "Hint" in res1.json()["answer"]

    payload_lvl2 = {
        "query": "Give me a more specific hint",
        "action": "give_hint",
        "challenge_id": "chall_x_gate",
        "hint_level": 2
    }
    res2 = client.post("/api/ai/hint", json=payload_lvl2)
    assert res2.status_code == 200
    assert "Pauli-X" in res2.json()["answer"] or "X" in res2.json()["answer"]


from unittest.mock import patch, AsyncMock
import httpx
from app.services.ai.tutor_service import AITutorService
from app.schemas.ai import AIPromptRequest
from app.core.config import settings


@pytest.mark.anyio
async def test_gemini_api_success():
    service = AITutorService()
    mock_data = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "### Quantum Superposition\nA qubit in $|+\\rangle$ state."}]
                }
            }
        ]
    }
    mock_resp = httpx.Response(status_code=200, json=mock_data)

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        with patch.object(settings, "AI_API_KEY", "test_gemini_key_12345"):
            with patch.object(settings, "AI_PROVIDER", "gemini"):
                req = AIPromptRequest(query="What is superposition?", action="explain_concept")
                res = await service.ask(req)
                assert res.model_used == settings.AI_MODEL
                assert res.provider == "Google Gemini"
                assert "Quantum Superposition" in res.answer


@pytest.mark.anyio
@pytest.mark.parametrize("status_code", [400, 401, 403, 429, 500, 503])
async def test_gemini_api_error_fallbacks(status_code):
    service = AITutorService()
    mock_resp = httpx.Response(status_code=status_code, text="Error")

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        with patch.object(settings, "AI_API_KEY", "test_secret_key_99999"):
            with patch.object(settings, "AI_PROVIDER", "gemini"):
                req = AIPromptRequest(query="Explain Grover algorithm", action="explain_concept")
                res = await service.ask(req)
                # Must fall back gracefully to Quantum Diagnostic Reasoner
                assert res.model_used == "Quantum Diagnostic Reasoner"
                assert "Grover" in res.answer


@pytest.mark.anyio
async def test_gemini_api_timeout_fallback():
    service = AITutorService()

    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("timeout")):
        with patch.object(settings, "AI_API_KEY", "test_secret_key_99999"):
            with patch.object(settings, "AI_PROVIDER", "gemini"):
                req = AIPromptRequest(query="Explain Grover algorithm", action="explain_concept")
                res = await service.ask(req)
                assert res.model_used == "Quantum Diagnostic Reasoner"


@pytest.mark.anyio
async def test_gemini_api_malformed_response_fallback():
    service = AITutorService()
    mock_resp = httpx.Response(status_code=200, json={"malformed": "no_candidates"})

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        with patch.object(settings, "AI_API_KEY", "test_secret_key_99999"):
            with patch.object(settings, "AI_PROVIDER", "gemini"):
                req = AIPromptRequest(query="Explain Bell state", action="explain_concept")
                res = await service.ask(req)
                assert res.model_used == "Quantum Diagnostic Reasoner"
                assert res.fallback_reason is not None


def test_ai_status_endpoint():
    """Verifies that GET /api/ai/status returns structured diagnostic information."""
    response = client.get("/api/ai/status")
    assert response.status_code == 200
    data = response.json()
    assert "provider" in data
    assert "configured_model" in data
    assert "api_key_configured" in data
    assert "api_key_preview" in data
    assert "status" in data
    assert "supported_models" in data
    assert isinstance(data["supported_models"], list)


@pytest.mark.anyio
async def test_ai_status_live_test():
    """Verifies that tutor_service.get_status executes live ping and formats result."""
    service = AITutorService()
    mock_success = httpx.Response(
        status_code=200,
        json={"candidates": [{"content": {"parts": [{"text": "OK"}]}}]}
    )
    with patch("httpx.AsyncClient.post", return_value=mock_success):
        with patch.object(settings, "AI_API_KEY", "AIzaSyFakeKeyForTest1234567890"):
            with patch.object(settings, "AI_PROVIDER", "gemini"):
                status = await service.get_status()
                assert status.api_key_configured is True
                assert status.live_test_status == "connected"
                assert "AIzaSy" in status.api_key_preview
                assert "Successfully connected to Google Gemini" in status.live_test_message

