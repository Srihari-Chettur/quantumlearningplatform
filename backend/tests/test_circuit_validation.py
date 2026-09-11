import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_zero_or_negative_qubit_count():
    """Circuit with zero or negative qubits must fail validation."""
    for count in [0, -1, -5]:
        payload = {
            "num_qubits": count,
            "gates": [
                {"id": "h1", "type": "H", "qubits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [0]}
            ],
            "shots": 1024
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code in (400, 422)
        data = response.json()
        assert "detail" in data
        assert "num_qubits must be greater than 0" in data["detail"]


def test_unknown_gate_type():
    """Unknown or unsupported gate type must fail validation."""
    payload = {
        "num_qubits": 2,
        "gates": [
            {"id": "g1", "type": "INVALID_GATE", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "Invalid gate type 'INVALID_GATE'" in data["detail"]


def test_gate_referencing_non_existent_qubit():
    """Gate referencing a qubit index outside the circuit must fail validation."""
    payload = {
        "num_qubits": 2,
        "gates": [
            {"id": "cx1", "type": "CNOT", "qubits": [0, 4]},
            {"id": "m1", "type": "MEASURE", "qubits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert data["detail"] == "Gate 'cx1' references qubit 4, but the circuit only contains 2 qubits."


def test_gate_referencing_negative_qubit():
    """Gate referencing negative qubit index must fail validation."""
    payload = {
        "num_qubits": 2,
        "gates": [
            {"id": "h1", "type": "H", "qubits": [-1]},
            {"id": "m1", "type": "MEASURE", "qubits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "references qubit -1" in data["detail"]


def test_cnot_invalid_qubit_count():
    """CNOT with 1 or 3 qubits must fail validation."""
    for invalid_qubits in [[0], [0, 1, 2]]:
        payload = {
            "num_qubits": 3,
            "gates": [
                {"id": "cx1", "type": "CNOT", "qubits": invalid_qubits},
                {"id": "m1", "type": "MEASURE", "qubits": [0]}
            ],
            "shots": 1024
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code in (400, 422)
        data = response.json()
        assert "detail" in data
        assert "requires exactly 2 qubits" in data["detail"]


def test_cnot_identical_control_and_target():
    """CNOT with identical control and target qubit must fail validation."""
    payload = {
        "num_qubits": 2,
        "gates": [
            {"id": "cx1", "type": "CNOT", "qubits": [1, 1]},
            {"id": "m1", "type": "MEASURE", "qubits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "cannot use the same qubit 1 as both control and target" in data["detail"]


def test_single_qubit_gate_wrong_qubit_count():
    """Single-qubit gates (H, X, Y, Z, S, T) with multiple qubits must fail."""
    payload = {
        "num_qubits": 2,
        "gates": [
            {"id": "h1", "type": "H", "qubits": [0, 1]},
            {"id": "m1", "type": "MEASURE", "qubits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "requires exactly 1 qubit" in data["detail"]


def test_invalid_shots():
    """Zero or negative shots must fail validation."""
    for shots in [0, -10]:
        payload = {
            "num_qubits": 1,
            "gates": [
                {"id": "x1", "type": "X", "qubits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [0]}
            ],
            "shots": shots
        }
        response = client.post("/api/simulation/run", json=payload)
        assert response.status_code in (400, 422)
        data = response.json()
        assert "detail" in data
        assert "shots must be greater than 0" in data["detail"]


def test_circuit_without_measure_gate():
    """Circuit with no MEASURE gates must fail validation."""
    payload = {
        "num_qubits": 2,
        "gates": [
            {"id": "h1", "type": "H", "qubits": [0]},
            {"id": "cx1", "type": "CNOT", "qubits": [0, 1]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "must contain at least one MEASURE gate" in data["detail"]


def test_measurement_out_of_bounds_classical_bit():
    """Measurement mapping to non-existent classical bit must fail."""
    payload = {
        "num_qubits": 2,
        "num_classical_bits": 2,
        "gates": [
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [4]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "references classical bit 4, but the circuit only contains 2 classical bits." in data["detail"]


def test_measurement_multiple_classical_bits():
    """Measurement with multiple classical bits must fail."""
    payload = {
        "num_qubits": 2,
        "num_classical_bits": 2,
        "gates": [
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0, 1]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "requires exactly 1 classical bit" in data["detail"]


def test_non_measure_gate_with_classical_bits():
    """Non-measurement gate providing classical bits must fail."""
    payload = {
        "num_qubits": 2,
        "num_classical_bits": 2,
        "gates": [
            {"id": "h1", "type": "H", "qubits": [0], "classical_bits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "cannot have classical bits" in data["detail"]


def test_malformed_json_request():
    """Malformed non-JSON or invalid type payload must return clean 422."""
    response = client.post(
        "/api/simulation/run",
        content="not a json string",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data


def test_duplicate_gate_ids():
    """Circuit with duplicate gate IDs must fail validation."""
    payload = {
        "num_qubits": 2,
        "gates": [
            {"id": "gate-1", "type": "H", "qubits": [0]},
            {"id": "gate-1", "type": "X", "qubits": [1]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "Duplicate gate ID 'gate-1' found" in data["detail"]


def test_multiple_measurements_same_classical_bit():
    """Multiple measurements targeting the same classical bit must fail."""
    payload = {
        "num_qubits": 2,
        "num_classical_bits": 2,
        "gates": [
            {"id": "h1", "type": "H", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
            {"id": "m2", "type": "MEASURE", "qubits": [1], "classical_bits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "Classical bit 0 is targeted by multiple measurements" in data["detail"]


def test_zero_classical_bits_provided():
    """Providing num_classical_bits <= 0 must fail validation."""
    payload = {
        "num_qubits": 2,
        "num_classical_bits": 0,
        "gates": [
            {"id": "h1", "type": "H", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
        ],
        "shots": 1024
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data
    assert "num_classical_bits must be greater than 0" in data["detail"]

