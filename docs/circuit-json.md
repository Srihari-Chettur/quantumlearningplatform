# Circuit JSON Specification

## Overview
The **SIH 2026 Interactive Quantum Algorithm Learning Platform** uses a standardized, framework-agnostic JSON format for representing quantum circuits. This format serves as the universal contract between the Next.js frontend circuit editor and the FastAPI simulation backend.

The frontend produces Circuit JSON; the backend validates it using Pydantic and converts it to quantum framework circuits (currently Qiskit Aer) via an adapter abstraction layer.

---

## JSON Schema Specification

### Top-Level Circuit Object

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

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `num_qubits` | `integer` | **Yes** | Total number of qubits in the circuit. Must satisfy $1 \le \text{num\_qubits} \le 24$. |
| `num_classical_bits` | `integer` | No | Total number of classical measurement bits. Defaults to `num_qubits` if omitted. When provided, must be $> 0$. |
| `gates` | `Array<Gate>` | **Yes** | Ordered list of quantum operations. Must contain at least one gate and at least one `MEASURE` gate. |
| `shots` | `integer` | No | Number of measurement samples. Default: `1024`. Range: $1 \le \text{shots} \le 100,000$. |

---

## Gate Schema

Each gate entry in `gates` is structured as:

```json
{
  "id": "cx1",
  "type": "CNOT",
  "qubits": [0, 1],
  "classical_bits": null
}
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **Yes** | Unique identifier for the gate. Must not be empty. Duplicate IDs in a circuit are rejected. |
| `type` | `string` | **Yes** | Gate identifier: `"H"`, `"X"`, `"Y"`, `"Z"`, `"S"`, `"T"`, `"CNOT"`, `"MEASURE"`. |
| `qubits` | `Array<integer>` | **Yes** | Qubit indices targeted by this operation (0-indexed). |
| `classical_bits` | `Array<integer>` | No | Classical register indices for `MEASURE` operations. Must be `null` or omitted for unitary gates. |

---

## Supported Gate Types & Rules

| Gate | Type String | Qubit Count | Description |
|---|---|---|---|
| **Hadamard** | `"H"` | 1 | Creates equal superposition: $H\|0\rangle = \frac{\|0\rangle + \|1\rangle}{\sqrt{2}}$. |
| **Pauli-X** | `"X"` | 1 | Quantum bit-flip NOT operator: $X\|0\rangle = \|1\rangle$, $X\|1\rangle = \|0\rangle$. |
| **Pauli-Y** | `"Y"` | 1 | Bit and phase flip: $Y\|0\rangle = i\|1\rangle$, $Y\|1\rangle = -i\|0\rangle$. |
| **Pauli-Z** | `"Z"` | 1 | Phase flip: $Z\|0\rangle = \|0\rangle$, $Z\|1\rangle = -\|1\rangle$. |
| **Phase (S)** | `"S"` | 1 | Quarter-turn phase rotation ($S^2 = Z$): $S\|1\rangle = i\|1\rangle$. |
| **$\pi/8$ (T)** | `"T"` | 1 | Eighth-turn phase rotation ($T^2 = S$): $T\|1\rangle = e^{i\pi/4}\|1\rangle$. |
| **Controlled-NOT** | `"CNOT"` | 2 | Flips target qubit (`qubits[1]`) when control (`qubits[0]`) is $\|1\rangle$. |
| **Measurement** | `"MEASURE"` | 1 | Projects qubit into classical bit (`classical_bits[0]`). |

---

## Bit-Ordering Convention

The platform adopts standard **little-endian** bitstring representation (matching Qiskit conventions):
- **Bit index 0 ($c_0$)** is the **rightmost bit** (least significant bit).
- **Bit index $N-1$ ($c_{N-1}$)** is the **leftmost bit** (most significant bit).

For a 2-qubit circuit where $q_0$ measures into $c_0$ and $q_1$ measures into $c_1$:
- Basis state `|01⟩` means $c_1 = 0$ ($q_1$) and $c_0 = 1$ ($q_0$).
- Computational basis states range in numerical order from `00`, `01`, `10`, to `11`.

---

## Validation Invariants

The backend strictly enforces the following domain rules:
1. **Qubit bounds**: Every index $q$ in `gate.qubits` must satisfy $0 \le q < \text{num\_qubits}$.
2. **Classical bit bounds**: Every index $c$ in `gate.classical_bits` must satisfy $0 \le c < \text{num\_classical\_bits}$.
3. **Unique Gate IDs**: No two gates in the same circuit may share an `id`.
4. **CNOT Differentiation**: Control and target qubits cannot be identical (`qubits[0] != qubits[1]`).
5. **No Duplicate Qubits in Gate**: No gate may reference the same qubit multiple times.
6. **Unique Classical Bit Measurements**: Each measurement operation must target a distinct classical bit; multiple measurements overwriting the same bit are rejected.
7. **Measurement Mandatory**: Circuits must include at least one `MEASURE` gate for sampling simulation.
