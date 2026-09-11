import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """GET / must return 200 with service name and status ok."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "service": "SIH Quantum Simulation Backend",
        "status": "ok"
    }


def test_health_endpoint():
    """GET /health must return 200 with {'status': 'ok'}."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_h_gate_simulation():
    """A single H gate followed by measurement should produce approx 50% 0 and 50% 1."""
    shots = 1000
    payload = {
        "num_qubits": 1,
        "num_classical_bits": 1,
        "gates": [
            {"id": "h1", "type": "H", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
        ],
        "shots": shots
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["shots"] == shots

    # Probabilities must include both basis states
    assert "0" in data["probabilities"]
    assert "1" in data["probabilities"]

    prob_0 = data["probabilities"]["0"]
    prob_1 = data["probabilities"]["1"]

    # Aer sampling tolerance: ~50% with generous 15% tolerance
    assert 0.35 <= prob_0 <= 0.65
    assert 0.35 <= prob_1 <= 0.65
    assert round(prob_0 + prob_1, 4) == 1.0


def test_x_gate_simulation():
    """A single X gate followed by measurement should produce state 1 with 100% probability."""
    shots = 500
    payload = {
        "num_qubits": 1,
        "num_classical_bits": 1,
        "gates": [
            {"id": "x1", "type": "X", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
        ],
        "shots": shots
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["counts"].get("1") == shots
    assert data["probabilities"].get("1") == 1.0
    assert data["probabilities"].get("0") == 0.0


def test_y_gate_simulation():
    """A single Y gate followed by measurement should produce state 1 with 100% probability."""
    shots = 500
    payload = {
        "num_qubits": 1,
        "num_classical_bits": 1,
        "gates": [
            {"id": "y1", "type": "Y", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
        ],
        "shots": shots
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["counts"].get("1") == shots
    assert data["probabilities"].get("1") == 1.0
    assert data["probabilities"].get("0") == 0.0


def test_z_gate_simulation():
    """A single Z gate on |0> leaves it in |0>, producing state 0 with 100% probability."""
    shots = 500
    payload = {
        "num_qubits": 1,
        "num_classical_bits": 1,
        "gates": [
            {"id": "z1", "type": "Z", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
        ],
        "shots": shots
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["counts"].get("0") == shots
    assert data["probabilities"].get("0") == 1.0
    assert data["probabilities"].get("1") == 0.0


def test_s_and_t_gate_simulation():
    """S and T gates on |0> leave it in |0>."""
    shots = 200
    payload = {
        "num_qubits": 1,
        "num_classical_bits": 1,
        "gates": [
            {"id": "s1", "type": "S", "qubits": [0]},
            {"id": "t1", "type": "T", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
        ],
        "shots": shots
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["counts"].get("0") == shots
    assert data["probabilities"].get("0") == 1.0


def test_bell_state_simulation():
    """Bell state (|00> + |11>) / sqrt(2) test.
    
    Circuit:
    q0 ── H ──●── M
              │
    q1 ───────X── M
    Expected: ~50% for '00', ~50% for '11', ~0% for '01' and '10'.
    """
    shots = 1024
    payload = {
        "num_qubits": 2,
        "num_classical_bits": 2,
        "gates": [
            {"id": "h1", "type": "H", "qubits": [0]},
            {"id": "cx1", "type": "CNOT", "qubits": [0, 1]},
            {"id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
            {"id": "m2", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
        ],
        "shots": shots
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Structural verification
    assert data["success"] is True
    assert data["backend"] == "qiskit-aer"
    assert data["num_qubits"] == 2
    assert data["num_classical_bits"] == 2
    assert data["shots"] == shots
    assert isinstance(data["execution_time_ms"], float)
    assert data["execution_time_ms"] > 0

    # Metadata verification
    metadata = data["circuit_metadata"]
    assert metadata["gate_count"] == 4
    assert metadata["depth"] >= 2
    assert metadata["gates_by_type"] == {"H": 1, "CNOT": 1, "MEASURE": 2}

    # Counts and probabilities verification
    counts = data["counts"]
    probabilities = data["probabilities"]

    # All 4 computational basis states must be present
    for state in ["00", "01", "10", "11"]:
        assert state in probabilities

    # 00 and 11 should each be ~50%
    assert 0.40 <= probabilities["00"] <= 0.60
    assert 0.40 <= probabilities["11"] <= 0.60

    # 01 and 10 should be 0%
    assert probabilities["01"] == 0.0
    assert probabilities["10"] == 0.0
    assert counts.get("01", 0) == 0
    assert counts.get("10", 0) == 0

    # Probabilities sum to 1.0
    total_prob = sum(probabilities.values())
    assert round(total_prob, 5) == 1.0


def test_optional_defaults():
    """Verify num_classical_bits and classical_bits can be defaulted."""
    payload = {
        "num_qubits": 2,
        "gates": [
            {"id": "x1", "type": "X", "qubits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [0]},
            {"id": "m2", "type": "MEASURE", "qubits": [1]}
        ]
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["num_classical_bits"] == 2
    assert data["shots"] == 1024
    # State '01': q1=0, q0=1
    assert data["probabilities"]["01"] == 1.0
    assert data["probabilities"]["00"] == 0.0


def test_cz_gate_simulation():
    """Verify CZ gate behavior in simulation."""
    shots = 500
    # Prepare |11> with X gates, then apply CZ, then measure
    payload = {
        "num_qubits": 2,
        "num_classical_bits": 2,
        "gates": [
            {"id": "x0", "type": "X", "qubits": [0]},
            {"id": "x1", "type": "X", "qubits": [1]},
            {"id": "cz1", "type": "CZ", "qubits": [0, 1]},
            {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
        ],
        "shots": shots
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["counts"].get("11") == shots
    assert data["probabilities"].get("11") == 1.0


def test_grover_with_native_cz_simulation():
    """Verify 2-qubit Grover search circuit with native CZ gates achieves 100% amplification."""
    shots = 1000
    # Target state |11>:
    # 1. Superposition: H(0), H(1)
    # 2. Oracle (|11>): CZ(0, 1)
    # 3. Diffusion: H(0), H(1), X(0), X(1), CZ(0, 1), X(0), X(1), H(0), H(1)
    # 4. Measure: M(0)->0, M(1)->1
    payload = {
        "num_qubits": 2,
        "num_classical_bits": 2,
        "gates": [
            {"id": "h0", "type": "H", "qubits": [0]},
            {"id": "h1", "type": "H", "qubits": [1]},
            {"id": "oracle_cz", "type": "CZ", "qubits": [0, 1]},
            {"id": "diff_h0", "type": "H", "qubits": [0]},
            {"id": "diff_h1", "type": "H", "qubits": [1]},
            {"id": "diff_x0", "type": "X", "qubits": [0]},
            {"id": "diff_x1", "type": "X", "qubits": [1]},
            {"id": "diff_cz", "type": "CZ", "qubits": [0, 1]},
            {"id": "diff_x0_post", "type": "X", "qubits": [0]},
            {"id": "diff_x1_post", "type": "X", "qubits": [1]},
            {"id": "diff_h0_post", "type": "H", "qubits": [0]},
            {"id": "diff_h1_post", "type": "H", "qubits": [1]},
            {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
            {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
        ],
        "shots": shots
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # In Qiskit / Aer bit-ordering, target '11' is unambiguous and must have 100% probability
    assert data["counts"].get("11") == shots
    assert data["probabilities"].get("11") == 1.0

