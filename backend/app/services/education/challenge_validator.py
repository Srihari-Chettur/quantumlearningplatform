import json
import logging
from typing import Optional
from qiskit import QuantumCircuit
from app.database.repositories import EducationRepository
from app.schemas.circuit import CircuitSchema, GateType
from app.schemas.education import ChallengeSubmissionRequest, ChallengeResultResponse
from app.services.code.transpiler import code_to_circuit
from app.services.quantum.simulator import QuantumSimulationService

logger = logging.getLogger(__name__)


def evaluate_challenge_submission(request: ChallengeSubmissionRequest) -> ChallengeResultResponse:
    """Evaluates student challenge submission against behavioral distribution requirements."""
    challenge = EducationRepository.get_challenge_by_id(request.challenge_id, user_id=request.user_id)
    if not challenge:
        return ChallengeResultResponse(
            challenge_id=request.challenge_id,
            passed=False,
            score=0,
            feedback=f"Challenge '{request.challenge_id}' not found.",
            error="Challenge not found"
        )

    expected = challenge["expected_behavior"]

    # Obtain circuit
    circuit: Optional[CircuitSchema] = request.circuit
    submitted_code = request.code or ""

    if not circuit:
        if not submitted_code or not submitted_code.strip():
            return ChallengeResultResponse(
                challenge_id=request.challenge_id,
                passed=False,
                score=0,
                feedback="Please submit valid quantum code or a circuit schema.",
                error="Empty submission"
            )
        try:
            circuit = code_to_circuit(submitted_code, "qiskit")
        except Exception as e:
            return ChallengeResultResponse(
                challenge_id=request.challenge_id,
                passed=False,
                score=0,
                feedback=f"Could not parse code: {str(e)}",
                error=str(e)
            )

    # Simulate circuit
    try:
        sim_service = QuantumSimulationService()
        circuit.shots = 1024
        result = sim_service.run_simulation(circuit)
    except Exception as se:
        logger.exception(f"Simulation failed during challenge evaluation: {se}")
        return ChallengeResultResponse(
            challenge_id=request.challenge_id,
            passed=False,
            score=0,
            feedback=f"Simulation runtime error: {str(se)}",
            error=str(se)
        )

    # Render ASCII circuit diagram
    try:
        qc = QuantumCircuit(circuit.num_qubits, circuit.num_classical_bits or circuit.num_qubits)
        for g in circuit.gates:
            if g.type == GateType.H:
                qc.h(g.qubits[0])
            elif g.type == GateType.X:
                qc.x(g.qubits[0])
            elif g.type == GateType.Y:
                qc.y(g.qubits[0])
            elif g.type == GateType.Z:
                qc.z(g.qubits[0])
            elif g.type == GateType.S:
                qc.s(g.qubits[0])
            elif g.type == GateType.T:
                qc.t(g.qubits[0])
            elif g.type == GateType.CNOT:
                qc.cx(g.qubits[0], g.qubits[1])
            elif g.type == GateType.CZ:
                qc.cz(g.qubits[0], g.qubits[1])
            elif g.type == GateType.MEASURE:
                c = g.classical_bits[0] if g.classical_bits else g.qubits[0]
                qc.measure(g.qubits[0], c)
        circuit_ascii = str(qc.draw(output="text"))
    except Exception:
        circuit_ascii = None

    passed = False
    score = 0
    feedback = ""

    # Mode 1: Target state verification (e.g. Grover or X gate)
    if "target_state" in expected:
        target = expected["target_state"]
        min_p = expected.get("min_probability", 0.90)
        actual_p = result.probabilities.get(target, 0.0)

        if actual_p >= min_p:
            passed = True
            score = 100
            feedback = (
                f"🎉 **Challenge Passed!** Target basis state `|{target}⟩` was observed with "
                f"**{round(actual_p * 100, 1)}%** probability (threshold: ≥ {round(min_p * 100, 1)}%)."
            )
        else:
            passed = False
            score = max(0, min(90, int((actual_p / min_p) * 100)))
            feedback = (
                f"❌ **Distribution Mismatch**: Target state `|{target}⟩` reached **{round(actual_p * 100, 1)}%**, "
                f"which is below the required **{round(min_p * 100, 1)}%**. Review your gate transformations or use the AI Tutor for hints."
            )

    # Mode 2: Multi-state distribution verification (e.g. Bell states or equal superposition)
    elif "expected_distribution" in expected:
        exp_dist = expected["expected_distribution"]
        tolerance = expected.get("tolerance", 0.08)
        all_match = True
        discrepancies = []

        for state, exp_p in exp_dist.items():
            act_p = result.probabilities.get(state, 0.0)
            diff = abs(act_p - exp_p)
            if diff > tolerance:
                all_match = False
                discrepancies.append(f"|{state}⟩: got {round(act_p*100, 1)}% (expected ~{round(exp_p*100, 1)}%)")

        if all_match:
            passed = True
            score = 100
            feedback = (
                f"🎉 **Challenge Passed!** Your circuit generated the expected quantum state distribution "
                f"within statistical tolerance."
            )
        else:
            passed = False
            score = max(10, 100 - len(discrepancies) * 30)
            feedback = (
                f"❌ **State Distribution Error**: Observed amplitudes deviated from expected values: "
                f"{'; '.join(discrepancies)}. Review gate sequencing and entanglement."
            )

    # Record in database
    EducationRepository.record_challenge_attempt(
        user_id=request.user_id,
        challenge_id=request.challenge_id,
        submitted_code=submitted_code,
        circuit_json=circuit.model_dump(),
        simulation_result={"counts": result.counts, "probabilities": result.probabilities},
        score=score,
        passed=passed,
        feedback=feedback
    )

    return ChallengeResultResponse(
        challenge_id=request.challenge_id,
        passed=passed,
        score=score,
        feedback=feedback,
        probabilities=result.probabilities,
        counts=result.counts,
        circuit_ascii=circuit_ascii
    )
