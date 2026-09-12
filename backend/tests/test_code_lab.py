import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.circuit import CircuitSchema, GateSchema, GateType
from app.services.code.safe_executor import validate_code_safety
from app.services.code.transpiler import code_to_circuit, circuit_to_code

client = TestClient(app)


def test_code_safety_blocks_forbidden_modules():
    code_with_os = "import os\nos.system('echo hacked')"
    is_safe, err = validate_code_safety(code_with_os)
    assert not is_safe
    assert "strictly forbidden" in err

    code_with_subprocess = "from subprocess import Popen"
    is_safe, err = validate_code_safety(code_with_subprocess)
    assert not is_safe
    assert "strictly forbidden" in err


def test_code_safety_blocks_eval_exec():
    code_eval = "eval('1 + 1')"
    is_safe, err = validate_code_safety(code_eval)
    assert not is_safe
    assert "strictly prohibited" in err


def test_code_safety_allows_valid_qiskit():
    valid_code = """
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
print(qc)
"""
    is_safe, err = validate_code_safety(valid_code)
    assert is_safe
    assert err is None


def test_code_to_circuit_and_circuit_to_code():
    code = """
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cz(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
"""
    circuit = code_to_circuit(code, "qiskit")
    assert circuit.num_qubits == 2
    assert len(circuit.gates) == 4
    assert circuit.gates[0].type == GateType.H
    assert circuit.gates[1].type == GateType.CZ

    # Roundtrip back to code
    exported_code = circuit_to_code(circuit, "qiskit")
    assert "qc.h(0)" in exported_code
    assert "qc.cz(0, 1)" in exported_code


def test_api_code_run():
    payload = {
        "code": """
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
""",
        "language": "qiskit",
        "shots": 512
    }
    response = client.post("/api/code/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "00" in data["counts"] or "11" in data["counts"]
    assert data["circuit_ascii"] is not None


def test_api_code_validate():
    payload = {"code": "qc = QuantumCircuit(1)\nqc.h(0)\nqc.measure(0, 0)"}
    response = client.post("/api/code/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["qubits_detected"] == 1


def test_api_to_circuit_and_to_code():
    payload = {"code": "qc = QuantumCircuit(1)\nqc.x(0)\nqc.measure(0, 0)"}
    resp = client.post("/api/code/to-circuit", json=payload)
    assert resp.status_code == 200
    circuit = resp.json()["circuit"]
    assert circuit["num_qubits"] == 1

    to_code_resp = client.post("/api/code/to-code", json={"circuit": circuit, "language": "qiskit"})
    assert to_code_resp.status_code == 200
    assert "qc.x(0)" in to_code_resp.json()["code"]
