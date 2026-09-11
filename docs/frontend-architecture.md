# Frontend Architecture Documentation

## Overview
The frontend of the **SIH 2026 Interactive Quantum Algorithm Learning Platform** is built using **Next.js (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Recharts**.

The architecture enforces strict educational and software engineering boundaries:
1. **Zero Client Mocks**: All simulation outputs represent real physical sampling conducted by Qiskit Aer via the FastAPI backend.
2. **Centralized Data Layer**: Component-level fetch calls are forbidden; all network communication is routed through typed API functions in `lib/api/simulation.ts`.
3. **Structured Circuit Representation**: The client circuit builder mirrors the backend `CircuitSchema`, eliminating translation overhead.

---

## Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx                # Root layout with offline-safe font stack, Navbar, and Footer
│   ├── page.tsx                  # Landing / Home page with curriculum progression
│   ├── globals.css               # Tailwind CSS styles and theme variables
│   ├── circuit-lab/
│   │   └── page.tsx              # Interactive visual quantum circuit editor
│   └── lessons/
│       ├── gates/
│       │   └── page.tsx          # Interactive gate explorer (H, X, Y, Z, S, T, CNOT)
│       └── grover/
│           └── page.tsx          # 5-step Grover lesson, interactive demo, and error diagnosis
├── components/
│   ├── Navbar.tsx                # Responsive header with live Qiskit Aer health badge
│   └── ui/                       # Base UI components
└── lib/
    ├── api/
    │   └── simulation.ts         # Type-safe API client (runSimulation, checkBackendHealth)
    ├── types/
    │   └── quantum.ts            # Centralized TypeScript schemas, gate definitions, and metadata
    └── utils.ts                  # Shared utility helpers
```

---

## Key Modules & Component Design

### 1. API Client Layer (`lib/api/simulation.ts`)
- `runSimulation(circuit: CircuitSchema): Promise<SimulationResultSchema>`: Dispatches `POST` requests to `/api/simulation/run`, handles network failures with user-friendly diagnostics, and extracts clean error detail messages.
- `checkBackendHealth(): Promise<boolean>`: Periodic health poller querying `/health` to maintain the real-time status badge in the navbar.

### 2. Interactive Gates Lesson (`app/lessons/gates/page.tsx`)
- Step-by-step exploration of individual gates.
- Built-in mini-circuit executor: tests each gate on ground state $|0\rangle$ (or prepared $|1\rangle$ for CNOT).
- Highlights quantum concepts such as relative phase vs computational basis measurement probabilities.

### 3. Circuit Lab Studio (`app/circuit-lab/page.tsx`)
- Multi-qubit wire grid with interactive gate placement, deletion, and classical register mapping.
- Preset configurations for instant experimentation: Empty, H Gate, Bell State ($|\Phi^+\rangle$), and Grover's search.
- Telemetry & visualizer panel displaying execution duration, depth, and Recharts probability bars.

### 4. Grover's Algorithm Laboratory (`app/lessons/grover/page.tsx`)
- Progressive 5-step curriculum: Search Problem $\to$ Superposition $\to$ Oracle $\to$ Diffusion $\to$ Execution.
- Dynamic circuit synthesis for all 4 two-qubit basis targets: $|00\rangle, |01\rangle, |10\rangle, |11\rangle$.
- **Error / Debug Mode**: Injects intentional faults (omitted diffusion operator) to visually demonstrate why quantum phase marking requires interference to be observed.
