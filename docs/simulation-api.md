# Simulation API Documentation

## Overview
The Quantum Simulation API is a RESTful service built with **FastAPI** that exposes endpoints for quantum circuit execution. The API isolates the frontend from the underlying quantum simulation engine (Qiskit Aer), ensuring zero direct Qiskit dependencies on the client.

- **Base URL**: `http://localhost:8000`
- **Interactive Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

---

## Endpoints

### 1. Root Service Info

Returns service identity and basic status.

- **Method**: `GET`
- **Path**: `/`
- **Request Headers**: None
- **Response**: `200 OK`
```json
{
  "service": "SIH Quantum Simulation Backend",
  "status": "ok"
}
```

---

### 2. Health Check

Verifies backend liveness and readiness.

- **Method**: `GET`
- **Path**: `/health`
- **Request Headers**: None
- **Response**: `200 OK`
```json
{
  "status": "ok"
}
```


---

### 2. Run Quantum Simulation

Executes a quantum circuit and returns measurement counts, complete computational basis probabilities, and execution metadata.

- **Method**: `POST`
- **Path**: `/api/simulation/run`
- **Request Headers**: `Content-Type: application/json`

#### Request Body
Standardized Circuit JSON payload (see `docs/circuit-json.md`):

```json
{
  "num_qubits": 2,
  "num_classical_bits": 2,
  "gates": [
    { "id": "h1", "type": "H", "qubits": [0] },
    { "id": "cx1", "type": "CNOT", "qubits": [0, 1] },
    { "id": "m1", "type": "MEASURE", "qubits": [0], "classical_bits": [0] },
    { "id": "m2", "type": "MEASURE", "qubits": [1], "classical_bits": [1] }
  ],
  "shots": 1024
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "backend": "qiskit-aer",
  "num_qubits": 2,
  "num_classical_bits": 2,
  "shots": 1024,
  "counts": {
    "00": 519,
    "11": 505
  },
  "probabilities": {
    "00": 0.506836,
    "01": 0.0,
    "10": 0.0,
    "11": 0.493164
  },
  "execution_time_ms": 9.42,
  "circuit_metadata": {
    "gate_count": 4,
    "depth": 3,
    "gates_by_type": {
      "H": 1,
      "CNOT": 1,
      "MEASURE": 2
    }
  }
}
```

#### Error Responses

##### `422 Unprocessable Content` (Validation Error)
Triggered when the circuit payload violates schema or quantum rules:
```json
{
  "detail": "Gate 'cx1' references qubit 4, but the circuit only contains 2 qubits."
}
```

##### `500 Internal Server Error` (Simulator Runtime Failure)
Triggered if the quantum backend encounters an unrecoverable failure. Stack traces are sanitized and logged to the server:
```json
{
  "detail": "Simulation failed to execute on the quantum backend."
}
```

---

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to permit communication from the Next.js development server:
- Default allowed origin: `http://localhost:3000` (and `http://127.0.0.1:3000`)
- Configurable through environment variable `ALLOWED_ORIGINS` (comma-separated list).
- Wildcard `allow_origins=["*"]` is disabled for production safety.
