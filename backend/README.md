# SIH 2026 — Quantum Simulation Backend

High-performance quantum simulation service for the **AI-Based Interactive Quantum Algorithm Learning Platform**. Built with **FastAPI**, **Pydantic**, **Qiskit**, and **Qiskit Aer**.

---

## Architecture Overview

The backend decouples the frontend circuit builder completely from Qiskit through an adapter abstraction:

```
Frontend Circuit Builder (Next.js)
       │
       ▼  Standardized Circuit JSON (HTTP POST)
FastAPI (/api/simulation/run)
       │
       ▼  Pydantic Validation (CircuitSchema)
QuantumSimulationService
       │
       ▼  Abstract Base Interface (QuantumSimulatorBase)
QiskitAerAdapter
       │
       ▼
Qiskit QuantumCircuit & AerSimulator
       │
       ▼
Simulation Result JSON (Counts, Basis Probabilities, Execution Time, Metadata)
```

### Bitstring Ordering Convention
The simulation service uses standard Qiskit / little-endian bitstring conventions:
- **Bit index 0 ($c_0$)** is the **rightmost bit** (least significant bit).
- **Bit index $N-1$ ($c_{N-1}$)** is the **leftmost bit** (most significant bit).
- Computational basis states range in numerical order from $|0\dots0\rangle$ to $|1\dots1\rangle$ (e.g. for 2 qubits: `"00"`, `"01"`, `"10"`, `"11"`).

---

## Requirements

- **Python 3.11+** (Tested on Python 3.14)
- **FastAPI**
- **Pydantic v2**
- **Qiskit 2.5+**
- **Qiskit Aer 0.17+**
- **pytest** & **httpx** (for testing)

---

## Setup & Installation

### 1. Virtual Environment Setup

From the `backend/` directory:

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS / Linux:
source .venv/bin/activate

# On Windows:
# .venv\Scripts\activate
```

### 2. Dependency Installation

```bash
pip install -r requirements.txt
```

---

## Running the Server

Start the FastAPI server with Uvicorn:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative API Docs (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## Environment Configuration

Configuration is managed in `app/core/config.py` and supports the following environment variables:

| Variable | Default | Description |
|---|---|---|
| `BACKEND_HOST` | `0.0.0.0` | Host IP to bind server |
| `BACKEND_PORT` | `8000` | Port to bind server |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Primary frontend origin for CORS |
| `ALLOWED_ORIGINS` | `""` | Comma-separated list of additional CORS origins |

---

## API Endpoints

### 1. Service Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok"
}
```

---

### 2. Run Quantum Simulation

**Endpoint**: `POST /api/simulation/run`

**Request Headers**: `Content-Type: application/json`

#### Example Circuit JSON (Bell State: $|\Phi^+\rangle = \frac{|00\rangle + |11\rangle}{\sqrt{2}}$)

```json
{
  "num_qubits": 2,
  "num_classical_bits": 2,
  "gates": [
    {
      "id": "h1",
      "type": "H",
      "qubits": [0]
    },
    {
      "id": "cx1",
      "type": "CNOT",
      "qubits": [0, 1]
    },
    {
      "id": "m1",
      "type": "MEASURE",
      "qubits": [0],
      "classical_bits": [0]
    },
    {
      "id": "m2",
      "type": "MEASURE",
      "qubits": [1],
      "classical_bits": [1]
    }
  ],
  "shots": 1024
}
```

#### Example Simulation Result JSON

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
  "execution_time_ms": 14.82,
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

#### Supported Gate Types
- `H`: Hadamard gate (1 qubit)
- `X`: Pauli-X / NOT gate (1 qubit)
- `Y`: Pauli-Y gate (1 qubit)
- `Z`: Pauli-Z gate (1 qubit)
- `S`: Phase gate ($\pi/2$) (1 qubit)
- `T`: $\pi/4$ gate (1 qubit)
- `CNOT`: Controlled-NOT gate (2 distinct qubits: control, target)
- `MEASURE`: Quantum measurement into a classical bit (1 qubit, 1 classical bit)

---

## Running Automated Tests

Run the complete test suite using pytest:

```bash
# From the backend directory
pytest tests -v

# Or from the project root
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests -v
```

Test coverage includes:
- Health check verification (`GET /health`)
- Single-qubit operations (`H`, `X`, `Y`, `Z`, `S`, `T`)
- Multi-qubit Bell State simulation and sampling distributions
- Comprehensive validation rules (bounds, gate types, duplicate qubits, shot counts, measurement mappings)
- Error response consistency and stack trace isolation
