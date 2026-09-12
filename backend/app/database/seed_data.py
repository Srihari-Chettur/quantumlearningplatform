import json
import logging
from app.database.connection import get_db_connection

logger = logging.getLogger(__name__)

DEMO_USER_ID = "student_demo"

SEED_LESSONS = [
    {
        "id": "les_intro",
        "slug": "quantum-intro",
        "title": "Introduction to Quantum Computing",
        "category": "Foundations",
        "order_index": 1,
        "description": "Discover how quantum mechanical principles enable exponentially faster computational paradigms.",
        "content_markdown": """# Introduction to Quantum Computing

Classical computers manipulate bits that exist deterministically as either 0 or 1. Quantum computers leverage quantum phenomena—specifically **superposition**, **interference**, and **entanglement**—to process information in high-dimensional Hilbert spaces.

### Key Takeaways:
- Classical bits: $b \\in \\{0, 1\\}$.
- Quantum states: $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$, where $|\\alpha|^2 + |\\beta|^2 = 1$.
- Exponential scaling: An $n$-qubit system spans a $2^n$-dimensional statevector space.
""",
        "prerequisites": "[]"
    },
    {
        "id": "les_qubits",
        "slug": "qubits-and-states",
        "title": "The Quantum Bit and State Vectors",
        "category": "Foundations",
        "order_index": 2,
        "description": "Master Dirac bra-ket notation, probability amplitudes, and the geometric Bloch sphere representation.",
        "content_markdown": """# The Quantum Bit (Qubit)

A qubit is the fundamental unit of quantum information. Mathematically, it is a two-dimensional complex vector normalized under the Euclidean norm.

$$|\\psi\\rangle = \\cos(\\theta/2)|0\\rangle + e^{i\\phi}\\sin(\\theta/2)|1\\rangle$$

### Computational Basis:
- $|0\\rangle = \\begin{pmatrix} 1 \\\\ 0 \\end{pmatrix}$
- $|1\\rangle = \\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix}$
""",
        "prerequisites": "[\"les_intro\"]"
    },
    {
        "id": "les_superposition",
        "slug": "hadamard-superposition",
        "title": "Hadamard Gate & Superposition",
        "category": "Single Qubit Gates",
        "order_index": 3,
        "description": "Understand how the Hadamard gate maps computational basis states into unbiased quantum superpositions.",
        "content_markdown": """# The Hadamard Gate

The Hadamard ($H$) gate acts as a quantum beam splitter, transforming computational basis states into equal superpositions.

$$H|0\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}} = |+\\rangle$$
$$H|1\\rangle = \\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}} = |-\\rangle$$

Matrix representation:
$$H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}$$
""",
        "prerequisites": "[\"les_qubits\"]"
    },
    {
        "id": "les_pauli",
        "slug": "pauli-gates",
        "title": "Pauli Gates (X, Y, Z)",
        "category": "Single Qubit Gates",
        "order_index": 4,
        "description": "Explore the fundamental Pauli rotation operators: bit flip (X), combined flip (Y), and phase flip (Z).",
        "content_markdown": """# Pauli Operators

The Pauli matrices form an orthogonal basis for $2 \\times 2$ Hermitian operators:
- **Pauli-X (NOT)**: $X|0\\rangle = |1\\rangle$, $X|1\\rangle = |0\\rangle$ (180° rotation around x-axis).
- **Pauli-Y**: $Y|0\\rangle = i|1\\rangle$, $Y|1\\rangle = -i|0\\rangle$.
- **Pauli-Z (Phase Flip)**: $Z|0\\rangle = |0\\rangle$, $Z|1\\rangle = -|1\\rangle$.
""",
        "prerequisites": "[\"les_superposition\"]"
    },
    {
        "id": "les_phase",
        "slug": "phase-gates",
        "title": "Phase Rotations (S and T Gates)",
        "category": "Single Qubit Gates",
        "order_index": 5,
        "description": "Learn fractional phase rotations around the z-axis of the Bloch sphere.",
        "content_markdown": """# Phase Gates (S and T)

Phase gates preserve computational basis probabilities while rotating the relative phase:
- **Phase Gate $S$**: Adds a $\\pi/2$ ($90^\\circ$) phase: $S|1\\rangle = i|1\\rangle$. Notice $S^2 = Z$.
- **$\\pi/8$ Gate $T$**: Adds a $\\pi/4$ ($45^\\circ$) phase: $T|1\\rangle = e^{i\\pi/4}|1\\rangle$. Notice $T^2 = S$.
""",
        "prerequisites": "[\"les_pauli\"]"
    },
    {
        "id": "les_measurement",
        "slug": "measurement-collapse",
        "title": "Quantum Measurement & State Collapse",
        "category": "Measurement",
        "order_index": 6,
        "description": "Understand Born's rule, wave-function collapse, and sampling statistics in real quantum experiments.",
        "content_markdown": """# Quantum Measurement

According to the Born Rule, measuring a qubit $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$ yields:
- Outcome $0$ with probability $P(0) = |\\alpha|^2$
- Outcome $1$ with probability $P(1) = |\\beta|^2$

Upon measurement, the state irreversibly collapses into the observed basis state.
""",
        "prerequisites": "[\"les_superposition\"]"
    },
    {
        "id": "les_cnot_cz",
        "slug": "two-qubit-gates",
        "title": "Two-Qubit Gates: CNOT and CZ",
        "category": "Multi-Qubit Gates",
        "order_index": 7,
        "description": "Explore multi-qubit interactions, controlled unitary operations, and symmetric phase inversion.",
        "content_markdown": """# Controlled Two-Qubit Gates

Multi-qubit gates create non-separable quantum correlations.
- **CNOT (CX)**: Inverts target qubit if and only if control qubit is $|1\\rangle$.
- **Controlled-Z (CZ)**: Inverts the phase of $|11\\rangle$ by multiplying it by $-1$. Note that CZ is symmetric: control and target can be interchanged without changing the unitary!
""",
        "prerequisites": "[\"les_pauli\", \"les_measurement\"]"
    },
    {
        "id": "les_entanglement",
        "slug": "entanglement-bell-states",
        "title": "Entanglement and Bell States",
        "category": "Entanglement",
        "order_index": 8,
        "description": "Construct the four maximally entangled two-qubit Bell states using Hadamard and CNOT gates.",
        "content_markdown": """# Quantum Entanglement

An entangled state cannot be factored into product states $|\\psi_A\\rangle \\otimes |\\psi_B\\rangle$.
The standard Bell state $|\\Phi^+\\rangle$ is constructed by:
1. Applying $H$ to qubit 0: $\\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}} \\otimes |0\\rangle = \\frac{|00\\rangle + |10\\rangle}{\\sqrt{2}}$
2. Applying $CNOT(0, 1)$: yields $\\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}$.
""",
        "prerequisites": "[\"les_cnot_cz\"]"
    },
    {
        "id": "les_oracles",
        "slug": "quantum-oracles",
        "title": "Quantum Oracles & Phase Kickback",
        "category": "Algorithms",
        "order_index": 9,
        "description": "Understand how quantum oracles mark target states using phase kickback.",
        "content_markdown": """# Phase Oracles

A phase oracle $U_f$ marks target state $|w\\rangle$ by evaluating:
$$U_f|x\\rangle = (-1)^{f(x)}|x\\rangle$$
where $f(x) = 1$ if $x = w$, and $0$ otherwise.
For a 2-qubit system targeting $|11\\rangle$, the oracle is simply the native $CZ$ gate!
""",
        "prerequisites": "[\"les_cnot_cz\", \"les_entanglement\"]"
    },
    {
        "id": "les_grover",
        "slug": "grovers-algorithm",
        "title": "Grover's Algorithm: Amplitude Amplification",
        "category": "Algorithms",
        "order_index": 10,
        "description": "Complete study of quadratic speedup for unstructured search: Superposition -> Oracle -> Diffusion.",
        "content_markdown": """# Grover's Algorithm

Grover's algorithm searches an unsorted database of $N = 2^n$ items in $O(\\sqrt{N})$ queries.
### Three Core Steps:
1. **Equal Superposition**: Apply $H^{\\otimes n}$ to all qubits.
2. **Oracle ($U_w$)**: Inverts amplitude of marked state $|w\\rangle$.
3. **Diffuser ($U_s$)**: Reflection about the average amplitude:
$$U_s = 2|s\\rangle\\langle s| - I = H^{\\otimes n}(2|0\\rangle\\langle 0| - I)H^{\\otimes n}$$
In a 2-qubit system, exactly $k = \\lfloor \\frac{\\pi}{4}\\sqrt{4} \\rfloor = 1$ iteration achieves 100% target probability!
""",
        "prerequisites": "[\"les_oracles\"]"
    }
]

SEED_QUESTIONS = [
    {
        "id": "q_01",
        "topic": "qubits",
        "type": "multiple_choice",
        "question": "What is the normalization constraint for probability amplitudes in state |ψ⟩ = α|0⟩ + β|1⟩?",
        "options_json": json.dumps(["α + β = 1", "|α|² + |β|² = 1", "α² + β² = 0", "|α| + |β| = 1"]),
        "correct_answer": "1",
        "explanation": "According to the total probability axiom in quantum mechanics, the sum of squared absolute amplitudes must equal 1.",
        "prerequisite_lesson_id": "les_qubits"
    },
    {
        "id": "q_02",
        "topic": "superposition",
        "type": "multiple_choice",
        "question": "What state does the Hadamard (H) gate produce when applied to |0⟩?",
        "options_json": json.dumps(["|1⟩", "|+⟩ = (|0⟩ + |1⟩)/√2", "|−⟩ = (|0⟩ - |1⟩)/√2", "i|0⟩"]),
        "correct_answer": "1",
        "explanation": "The Hadamard gate maps |0⟩ to |+⟩ = (|0⟩ + |1⟩)/√2 with equal 50% probability for |0⟩ and |1⟩.",
        "prerequisite_lesson_id": "les_superposition"
    },
    {
        "id": "q_03",
        "topic": "superposition",
        "type": "multiple_choice",
        "question": "What state results from applying H to |1⟩?",
        "options_json": json.dumps(["|0⟩", "|+⟩", "|−⟩ = (|0⟩ - |1⟩)/√2", "-|1⟩"]),
        "correct_answer": "2",
        "explanation": "Applying H to basis state |1⟩ creates the orthogonal superposition state |−⟩ = (|0⟩ - |1⟩)/√2.",
        "prerequisite_lesson_id": "les_superposition"
    },
    {
        "id": "q_04",
        "topic": "gates",
        "type": "multiple_choice",
        "question": "Which Pauli gate performs a quantum bit-flip, mapping |0⟩ to |1⟩ and |1⟩ to |0⟩?",
        "options_json": json.dumps(["Pauli-Z", "Pauli-Y", "Pauli-X", "Hadamard"]),
        "correct_answer": "2",
        "explanation": "The Pauli-X gate acts as the quantum NOT operator, interchanging the computational basis states.",
        "prerequisite_lesson_id": "les_pauli"
    },
    {
        "id": "q_05",
        "topic": "gates",
        "type": "true_false",
        "question": "True or False: Applying the Pauli-X gate twice in succession (X · X) returns the qubit to its original state.",
        "options_json": json.dumps(["True", "False"]),
        "correct_answer": "0",
        "explanation": "True! The Pauli-X gate is unitary and self-inverse: X² = I (the identity matrix).",
        "prerequisite_lesson_id": "les_pauli"
    },
    {
        "id": "q_06",
        "topic": "gates",
        "type": "multiple_choice",
        "question": "What is the relationship between the Phase gate S and Pauli-Z?",
        "options_json": json.dumps(["S = Z", "S² = Z", "S = Z²", "S · Z = I"]),
        "correct_answer": "1",
        "explanation": "S applies a π/2 rotation, so S² applies π phase rotation, which equals the Pauli-Z gate.",
        "prerequisite_lesson_id": "les_phase"
    },
    {
        "id": "q_07",
        "topic": "gates",
        "type": "multiple_choice",
        "question": "How many T gate applications are required to equal one Pauli-Z gate?",
        "options_json": json.dumps(["2", "3", "4", "8"]),
        "correct_answer": "2",
        "explanation": "Since T applies a π/4 phase, T² = S (π/2) and T⁴ = Z (π). Therefore, 4 T gates equal one Z gate.",
        "prerequisite_lesson_id": "les_phase"
    },
    {
        "id": "q_08",
        "topic": "measurement",
        "type": "multiple_choice",
        "question": "If a qubit is in state |ψ⟩ = (√3/2)|0⟩ + (1/2)|1⟩, what is the probability of measuring 0?",
        "options_json": json.dumps(["25%", "50%", "75%", "100%"]),
        "correct_answer": "2",
        "explanation": "By Born's rule, P(0) = |√3/2|² = 3/4 = 75%.",
        "prerequisite_lesson_id": "les_measurement"
    },
    {
        "id": "q_09",
        "topic": "measurement",
        "type": "true_false",
        "question": "True or False: After a projective measurement yields outcome |1⟩, measuring the qubit immediately again can yield |0⟩.",
        "options_json": json.dumps(["True", "False"]),
        "correct_answer": "1",
        "explanation": "False! Measurement collapses the wavefunction into the measured eigenstate |1⟩. Subsequent identical measurements yield |1⟩ with 100% certainty.",
        "prerequisite_lesson_id": "les_measurement"
    },
    {
        "id": "q_10",
        "topic": "entanglement",
        "type": "multiple_choice",
        "question": "Which gate combination generates the standard Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2 from |00⟩?",
        "options_json": json.dumps(["X(0) then CNOT(0, 1)", "H(0) then CNOT(0, 1)", "H(1) then CZ(0, 1)", "H(0) then H(1)"]),
        "correct_answer": "1",
        "explanation": "Applying H to qubit 0 creates (|0⟩+|1⟩)|0⟩/√2 = (|00⟩+|10⟩)/√2, and CNOT(0, 1) entangles them into (|00⟩+|11⟩)/√2.",
        "prerequisite_lesson_id": "les_entanglement"
    },
    {
        "id": "q_11",
        "topic": "entanglement",
        "type": "multiple_choice",
        "question": "In the Bell state (|00⟩ + |11⟩)/√2, if Alice measures qubit 0 and obtains 1, what will Bob obtain when measuring qubit 1?",
        "options_json": json.dumps(["Always 0", "Always 1", "50% chance of 0, 50% chance of 1", "Undefined"]),
        "correct_answer": "1",
        "explanation": "Because the qubits are perfectly correlated in |Φ+⟩, measuring 1 on qubit 0 instantly collapses the joint state to |11⟩.",
        "prerequisite_lesson_id": "les_entanglement"
    },
    {
        "id": "q_12",
        "topic": "gates",
        "type": "true_false",
        "question": "True or False: The Controlled-Z (CZ) gate is symmetric with respect to control and target qubit indices.",
        "options_json": json.dumps(["True", "False"]),
        "correct_answer": "0",
        "explanation": "True! The CZ matrix applies a factor of -1 solely to the |11⟩ basis state, so CZ(0, 1) is mathematically identical to CZ(1, 0).",
        "prerequisite_lesson_id": "les_cnot_cz"
    },
    {
        "id": "q_13",
        "topic": "grover",
        "type": "multiple_choice",
        "question": "What is the query complexity of Grover's Algorithm to find a marked item in a database of N items?",
        "options_json": json.dumps(["O(N)", "O(log N)", "O(√N)", "O(1)"]),
        "correct_answer": "2",
        "explanation": "Grover's algorithm achieves a quadratic speedup of O(√N) compared to the classical brute-force average of O(N).",
        "prerequisite_lesson_id": "les_grover"
    },
    {
        "id": "q_14",
        "topic": "grover",
        "type": "multiple_choice",
        "question": "In a 2-qubit database (N = 4), how many Grover iterations are theoretically required to achieve 100% target probability?",
        "options_json": json.dumps(["1 iteration", "2 iterations", "3 iterations", "4 iterations"]),
        "correct_answer": "0",
        "explanation": "For N = 4, the initial angle is θ = 30°. A single Grover rotation advances the state vector by 2θ = 60° directly to 90° (the target state), yielding 100% probability in exactly 1 iteration.",
        "prerequisite_lesson_id": "les_grover"
    },
    {
        "id": "q_15",
        "topic": "grover",
        "type": "multiple_choice",
        "question": "What is the role of the Grover Diffuser operator?",
        "options_json": json.dumps([
            "It measures the qubits in the computational basis",
            "It reflects state amplitudes about the average amplitude",
            "It flips the phase of the target state only",
            "It erases errors caused by decoherence"
        ]),
        "correct_answer": "1",
        "explanation": "The diffuser performs inversion about the mean (2|s⟩⟨s| - I), amplifying amplitudes that have negative phase relative to the average.",
        "prerequisite_lesson_id": "les_grover"
    },
    {
        "id": "q_16",
        "topic": "grover",
        "type": "circuit_analysis",
        "question": "If you execute a 2-qubit Grover search for target |11⟩ but forget the diffuser stage, what will be the measurement distribution?",
        "options_json": json.dumps([
            "100% |11⟩",
            "Equal 25% across |00⟩, |01⟩, |10⟩, |11⟩",
            "50% |00⟩ and 50% |11⟩",
            "0% |11⟩"
        ]),
        "correct_answer": "1",
        "explanation": "The oracle flips the relative phase of |11⟩ to -1/2, but squared magnitudes remain |-1/2|² = 1/4 = 25%. Without diffusion to invert about the mean, the probabilities remain uniformly distributed!",
        "prerequisite_lesson_id": "les_grover"
    },
    {
        "id": "q_17",
        "topic": "circuits",
        "type": "multiple_choice",
        "question": "What happens if a quantum circuit contains unitary gates but NO measurement gates when simulated for counts?",
        "options_json": json.dumps([
            "Simulation defaults to measuring all qubits",
            "The circuit is invalid because measurement is required to observe classical shot samples",
            "Simulation runs indefinitely",
            "The statevector is printed to console"
        ]),
        "correct_answer": "1",
        "explanation": "Our standard Circuit JSON contract requires at least one MEASURE gate to produce shot sampling statistics.",
        "prerequisite_lesson_id": "les_measurement"
    },
    {
        "id": "q_18",
        "topic": "qubits",
        "type": "multiple_choice",
        "question": "On the Bloch Sphere, which points represent the eigenstates of the Pauli-Z operator?",
        "options_json": json.dumps([
            "North Pole (|0⟩) and South Pole (|1⟩)",
            "Equator along the X axis (|+⟩ and |−⟩)",
            "Equator along the Y axis (|i⟩ and |−i⟩)",
            "Center of the sphere"
        ]),
        "correct_answer": "0",
        "explanation": "The z-axis poles represent the computational basis states: North Pole is |0⟩ (eigenvalue +1) and South Pole is |1⟩ (eigenvalue -1).",
        "prerequisite_lesson_id": "les_qubits"
    },
    {
        "id": "q_19",
        "topic": "gates",
        "type": "multiple_choice",
        "question": "Which single-qubit gate satisfies the identity H · Z · H = ?",
        "options_json": json.dumps(["Pauli-X", "Pauli-Y", "Identity (I)", "Phase Gate S"]),
        "correct_answer": "0",
        "explanation": "Conjugating the Pauli-Z phase flip with Hadamards transforms a phase flip into a bit flip: H · Z · H = X.",
        "prerequisite_lesson_id": "les_pauli"
    },
    {
        "id": "q_20",
        "topic": "grover",
        "type": "multiple_choice",
        "question": "To construct an oracle marking target |01⟩ (q1=0, q0=1), what preliminary operation is required before applying CZ(0, 1)?",
        "options_json": json.dumps([
            "Apply Pauli-X to qubit 1 so the |01⟩ state is temporarily mapped to |11⟩",
            "Apply Pauli-X to qubit 0",
            "Apply Hadamard to both qubits",
            "Apply Phase gate S to qubit 1"
        ]),
        "correct_answer": "0",
        "explanation": "Because CZ naturally activates on |11⟩, applying X to qubit 1 converts target bit 0 into 1. After CZ, another X on qubit 1 uncomputes the flip.",
        "prerequisite_lesson_id": "les_grover"
    }
]

SEED_CHALLENGES = [
    {
        "id": "chall_x_gate",
        "title": "Flip a Qubit: Create |1⟩ from |0⟩",
        "difficulty": "Beginner",
        "topic": "gates",
        "description": "Initialize a single qubit in state |0⟩ and apply the necessary gate to transform it into state |1⟩ with 100% probability.",
        "objective": "Achieve 100% measurement probability on state |1⟩.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(1, 1)

# TODO: Apply the gate to flip |0> to |1>

qc.measure(0, 0)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 1,
            "num_classical_bits": 1,
            "gates": [
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 1,
            "target_state": "1",
            "min_probability": 0.98,
            "expected_distribution": {"1": 1.0}
        }),
        "hints_json": json.dumps([
            "Recall which Pauli gate acts as the quantum equivalent of a classical NOT gate.",
            "The Pauli-X gate inverts the computational basis: X|0⟩ = |1⟩.",
            "Insert 'qc.x(0)' before measuring the qubit."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(1, 1)
qc.x(0)
qc.measure(0, 0)
"""
    },
    {
        "id": "chall_h_gate",
        "title": "Create Equal Superposition |+⟩",
        "difficulty": "Beginner",
        "topic": "superposition",
        "description": "Transform a single qubit starting in |0⟩ into the balanced superposition state |+⟩ = (|0⟩ + |1⟩)/√2.",
        "objective": "Achieve approximately 50% probability for |0⟩ and 50% for |1⟩.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(1, 1)

# TODO: Apply the superposition gate

qc.measure(0, 0)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 1,
            "num_classical_bits": 1,
            "gates": [
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 1,
            "expected_distribution": {"0": 0.5, "1": 0.5},
            "tolerance": 0.08
        }),
        "hints_json": json.dumps([
            "Think of the quantum gate that acts like an optical beam splitter.",
            "The Hadamard (H) gate maps |0⟩ to |+⟩.",
            "Add 'qc.h(0)' before the measurement instruction."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(1, 1)
qc.h(0)
qc.measure(0, 0)
"""
    },
    {
        "id": "chall_minus_state",
        "title": "Prepare the |−⟩ State",
        "difficulty": "Beginner",
        "topic": "superposition",
        "description": "Construct the state |−⟩ = (|0⟩ - |1⟩)/√2 from initial state |0⟩.",
        "objective": "Create |−⟩ which measures with equal 50/50 probabilities and possesses a negative relative phase.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(1, 1)

# TODO: Prepare |1> first or apply H then Z

qc.measure(0, 0)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 1,
            "num_classical_bits": 1,
            "gates": [
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 1,
            "expected_distribution": {"0": 0.5, "1": 0.5},
            "tolerance": 0.08
        }),
        "hints_json": json.dumps([
            "Remember that H|1⟩ = |−⟩.",
            "You can first flip |0⟩ to |1⟩ with X, then apply H.",
            "Alternatively, apply H then Z: Z|+⟩ = |−⟩."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(1, 1)
qc.x(0)
qc.h(0)
qc.measure(0, 0)
"""
    },
    {
        "id": "chall_bell_phi_plus",
        "title": "Construct Bell State |Φ+⟩",
        "difficulty": "Intermediate",
        "topic": "entanglement",
        "description": "Create the canonical 2-qubit maximally entangled Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2.",
        "objective": "Achieve ~50% probability for |00⟩ and ~50% for |11⟩, with 0% for |01⟩ and |10⟩.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# TODO: Put qubit 0 into superposition and entangle with qubit 1

qc.measure(0, 0)
qc.measure(1, 1)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 2,
            "num_classical_bits": 2,
            "gates": [
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 2,
            "expected_distribution": {"00": 0.5, "11": 0.5, "01": 0.0, "10": 0.0},
            "tolerance": 0.08
        }),
        "hints_json": json.dumps([
            "You need two gates: one single-qubit gate and one two-qubit gate.",
            "Apply H to qubit 0 to create equal superposition.",
            "Apply CNOT with qubit 0 as control and qubit 1 as target: 'qc.cx(0, 1)'."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
"""
    },
    {
        "id": "chall_bell_psi_plus",
        "title": "Construct Bell State |Ψ+⟩",
        "difficulty": "Intermediate",
        "topic": "entanglement",
        "description": "Build the anti-correlated Bell pair |Ψ+⟩ = (|01⟩ + |10⟩)/√2.",
        "objective": "Achieve ~50% probability for |01⟩ and ~50% for |10⟩, with 0% for |00⟩ and |11⟩.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# TODO: Create |01> + |10> superposition

qc.measure(0, 0)
qc.measure(1, 1)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 2,
            "num_classical_bits": 2,
            "gates": [
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 2,
            "expected_distribution": {"01": 0.5, "10": 0.5, "00": 0.0, "11": 0.0},
            "tolerance": 0.08
        }),
        "hints_json": json.dumps([
            "How does |Ψ+⟩ differ from |Φ+⟩? One qubit is flipped.",
            "Apply an X gate to qubit 1 before or after the standard Bell circuit.",
            "Sequence: qc.h(0), qc.cx(0, 1), qc.x(1)."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.x(1)
qc.measure(0, 0)
qc.measure(1, 1)
"""
    },
    {
        "id": "chall_equal_superpos_2q",
        "title": "Uniform 2-Qubit Superposition",
        "difficulty": "Beginner",
        "topic": "superposition",
        "description": "Place both qubits into an equal superposition across all 4 computational basis states.",
        "objective": "Achieve ~25% probability for each of |00⟩, |01⟩, |10⟩, and |11⟩.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# TODO: Apply Hadamard to both qubits

qc.measure(0, 0)
qc.measure(1, 1)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 2,
            "num_classical_bits": 2,
            "gates": [
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 2,
            "expected_distribution": {"00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25},
            "tolerance": 0.07
        }),
        "hints_json": json.dumps([
            "Apply the Hadamard gate independently to each qubit register.",
            "qc.h(0) creates superposition on qubit 0.",
            "qc.h(1) creates superposition on qubit 1."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.h(1)
qc.measure(0, 0)
qc.measure(1, 1)
"""
    },
    {
        "id": "chall_phase_kickback",
        "title": "Phase Kickback with Controlled-Z",
        "difficulty": "Intermediate",
        "topic": "oracles",
        "description": "Demonstrate phase kickback using a Controlled-Z gate where both qubits are in superposition.",
        "objective": "Observe that CZ selectively marks state |11⟩ with a negative relative phase without disturbing measurement magnitudes.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# Prepare |+> on both qubits
qc.h(0)
qc.h(1)

# TODO: Apply Controlled-Z gate

qc.measure(0, 0)
qc.measure(1, 1)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 2,
            "num_classical_bits": 2,
            "gates": [
                {"id": "h0", "type": "H", "qubits": [0]},
                {"id": "h1", "type": "H", "qubits": [1]},
                {"id": "cz0", "type": "CZ", "qubits": [0, 1]},
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 2,
            "expected_distribution": {"00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25},
            "tolerance": 0.07
        }),
        "hints_json": json.dumps([
            "Use the 'qc.cz(0, 1)' instruction.",
            "Because CZ only changes the phase of |11⟩ to -1, standard measurement probabilities remain 25% each.",
            "The phase inversion will be converted to an amplitude difference during diffusion!"
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.h(1)
qc.cz(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
"""
    },
    {
        "id": "chall_oracle_11",
        "title": "Construct Phase Oracle for |11⟩",
        "difficulty": "Intermediate",
        "topic": "oracles",
        "description": "Build an oracle operator that selectively flips the phase of target state |11⟩ while leaving |00⟩, |01⟩, and |10⟩ unchanged.",
        "objective": "Implement the native 2-qubit CZ oracle.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# Initial Superposition
qc.h(0)
qc.h(1)

# TODO: Apply oracle for |11>

qc.measure(0, 0)
qc.measure(1, 1)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 2,
            "num_classical_bits": 2,
            "gates": [
                {"id": "h0", "type": "H", "qubits": [0]},
                {"id": "h1", "type": "H", "qubits": [1]},
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 2,
            "expected_distribution": {"00": 0.25, "01": 0.25, "10": 0.25, "11": 0.25},
            "tolerance": 0.07
        }),
        "hints_json": json.dumps([
            "A Controlled-Z gate flips the phase of |11⟩ naturally.",
            "Use 'qc.cz(0, 1)'.",
            "This serves as the phase oracle stage of Grover's search."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.h(1)
qc.cz(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
"""
    },
    {
        "id": "chall_grover_full",
        "title": "Complete 2-Qubit Grover Search (|11⟩)",
        "difficulty": "Advanced",
        "topic": "grover",
        "description": "Construct the full 2-qubit Grover search circuit targeting |11⟩: Superposition -> Oracle -> Diffuser -> Measurement.",
        "objective": "Achieve > 95% measurement probability for target state |11⟩.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# 1. Superposition
qc.h(0)
qc.h(1)

# 2. Oracle for |11>
qc.cz(0, 1)

# TODO: 3. Diffuser Stage (H -> X -> CZ -> X -> H)

qc.measure(0, 0)
qc.measure(1, 1)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 2,
            "num_classical_bits": 2,
            "gates": [
                {"id": "h0", "type": "H", "qubits": [0]},
                {"id": "h1", "type": "H", "qubits": [1]},
                {"id": "cz_o", "type": "CZ", "qubits": [0, 1]},
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 2,
            "target_state": "11",
            "min_probability": 0.95,
            "expected_distribution": {"11": 1.0, "00": 0.0, "01": 0.0, "10": 0.0}
        }),
        "hints_json": json.dumps([
            "The diffuser transforms 2|0⟩⟨0| - I using Hadamards on both sides.",
            "Between Hadamards, apply X to both qubits, then CZ(0, 1), then X to both qubits.",
            "Complete diffuser sequence: H(0), H(1), X(0), X(1), CZ(0, 1), X(0), X(1), H(0), H(1)."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# Superposition
qc.h(0)
qc.h(1)

# Oracle for |11>
qc.cz(0, 1)

# Diffuser
qc.h(0)
qc.h(1)
qc.x(0)
qc.x(1)
qc.cz(0, 1)
qc.x(0)
qc.x(1)
qc.h(0)
qc.h(1)

# Measurement
qc.measure(0, 0)
qc.measure(1, 1)
"""
    },
    {
        "id": "chall_grover_target_10",
        "title": "Grover Search with Inverted Target |10⟩",
        "difficulty": "Advanced",
        "topic": "grover",
        "description": "Construct the 2-qubit Grover circuit to search for target state |10⟩ (qubit 1 = 1, qubit 0 = 0).",
        "objective": "Achieve > 95% measurement probability for target state |10⟩.",
        "starter_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# Superposition
qc.h(0)
qc.h(1)

# TODO: Oracle for |10> (hint: flip qubit 0 with X before and after CZ)

# Diffuser
qc.h(0)
qc.h(1)
qc.x(0)
qc.x(1)
qc.cz(0, 1)
qc.x(0)
qc.x(1)
qc.h(0)
qc.h(1)

qc.measure(0, 0)
qc.measure(1, 1)
""",
        "starter_circuit_json": json.dumps({
            "num_qubits": 2,
            "num_classical_bits": 2,
            "gates": [
                {"id": "h0", "type": "H", "qubits": [0]},
                {"id": "h1", "type": "H", "qubits": [1]},
                {"id": "m0", "type": "MEASURE", "qubits": [0], "classical_bits": [0]},
                {"id": "m1", "type": "MEASURE", "qubits": [1], "classical_bits": [1]}
            ],
            "shots": 1024
        }),
        "expected_behavior_json": json.dumps({
            "num_qubits": 2,
            "target_state": "10",
            "min_probability": 0.95,
            "expected_distribution": {"10": 1.0, "00": 0.0, "01": 0.0, "11": 0.0}
        }),
        "hints_json": json.dumps([
            "Target |10⟩ has qubit 0 as 0 and qubit 1 as 1 (little-endian bit 0 is qubit 0).",
            "Apply X(0) to flip qubit 0, then apply CZ(0, 1), then apply X(0) to uncompute.",
            "Oracle sequence: qc.x(0), qc.cz(0, 1), qc.x(0)."
        ]),
        "solution_code": """from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)

# Superposition
qc.h(0)
qc.h(1)

# Oracle for |10>
qc.x(0)
qc.cz(0, 1)
qc.x(0)

# Diffuser
qc.h(0)
qc.h(1)
qc.x(0)
qc.x(1)
qc.cz(0, 1)
qc.x(0)
qc.x(1)
qc.h(0)
qc.h(1)

qc.measure(0, 0)
qc.measure(1, 1)
"""
    }
]

TOPICS = ["qubits", "superposition", "gates", "measurement", "entanglement", "grover", "circuits"]


def seed_all() -> None:
    """Populates initial database seed records if not already populated."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Seed demo user
        cursor.execute(
            "INSERT OR IGNORE INTO users (id, username, email) VALUES (?, ?, ?)",
            (DEMO_USER_ID, "student_demo", "student@quantumlearning.org")
        )

        # 2. Seed lessons
        for lesson in SEED_LESSONS:
            cursor.execute(
                """
                INSERT INTO lessons (id, slug, title, category, order_index, description, content_markdown, prerequisites)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    slug=excluded.slug,
                    title=excluded.title,
                    category=excluded.category,
                    order_index=excluded.order_index,
                    description=excluded.description,
                    content_markdown=excluded.content_markdown,
                    prerequisites=excluded.prerequisites
                """,
                (
                    lesson["id"],
                    lesson["slug"],
                    lesson["title"],
                    lesson["category"],
                    lesson["order_index"],
                    lesson["description"],
                    lesson["content_markdown"],
                    lesson["prerequisites"]
                )
            )

        # 3. Seed assessment questions
        for q in SEED_QUESTIONS:
            cursor.execute(
                """
                INSERT INTO assessment_questions (id, topic, type, question, options_json, correct_answer, explanation, prerequisite_lesson_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    topic=excluded.topic,
                    type=excluded.type,
                    question=excluded.question,
                    options_json=excluded.options_json,
                    correct_answer=excluded.correct_answer,
                    explanation=excluded.explanation,
                    prerequisite_lesson_id=excluded.prerequisite_lesson_id
                """,
                (
                    q["id"],
                    q["topic"],
                    q["type"],
                    q["question"],
                    q["options_json"],
                    q["correct_answer"],
                    q["explanation"],
                    q["prerequisite_lesson_id"]
                )
            )

        # 4. Seed coding challenges
        for ch in SEED_CHALLENGES:
            cursor.execute(
                """
                INSERT INTO coding_challenges (id, title, difficulty, topic, description, objective, starter_code, starter_circuit_json, expected_behavior_json, hints_json, solution_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    difficulty=excluded.difficulty,
                    topic=excluded.topic,
                    description=excluded.description,
                    objective=excluded.objective,
                    starter_code=excluded.starter_code,
                    starter_circuit_json=excluded.starter_circuit_json,
                    expected_behavior_json=excluded.expected_behavior_json,
                    hints_json=excluded.hints_json,
                    solution_code=excluded.solution_code
                """,
                (
                    ch["id"],
                    ch["title"],
                    ch["difficulty"],
                    ch["topic"],
                    ch["description"],
                    ch["objective"],
                    ch["starter_code"],
                    ch["starter_circuit_json"],
                    ch["expected_behavior_json"],
                    ch["hints_json"],
                    ch["solution_code"]
                )
            )

        # 5. Seed initial topic progress for demo user
        for topic in TOPICS:
            cursor.execute(
                """
                INSERT OR IGNORE INTO student_progress (user_id, topic, mastery_level, quiz_avg_score, challenges_completed, simulations_run)
                VALUES (?, ?, 'Learning', 0.0, 0, 0)
                """,
                (DEMO_USER_ID, topic)
            )

    logger.info(f"Seeded {len(SEED_LESSONS)} lessons, {len(SEED_QUESTIONS)} questions, and {len(SEED_CHALLENGES)} challenges.")
