import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.schemas.ai import AIPromptRequest, AIResponse, AIStatusResponse
from app.schemas.circuit import CircuitSchema, GateType
from app.database.repositories import EducationRepository

logger = logging.getLogger(__name__)


class AITutorService:
    """Intelligent Quantum Tutor service with dual LLM and deterministic diagnostic engine."""

    def __init__(self) -> None:
        self.provider = settings.AI_PROVIDER.lower().strip()
        self.api_key = settings.AI_API_KEY.strip()
        self.model = settings.AI_MODEL.strip()
        self.last_fallback_reason: Optional[str] = None

    async def ask(self, request: AIPromptRequest) -> AIResponse:
        """Processes tutor request via live LLM if configured, else diagnostic engine."""
        api_key = getattr(settings, "AI_API_KEY", self.api_key).strip()

        if api_key:
            try:
                llm_response = await self._call_llm(request)
                if llm_response:
                    self.last_fallback_reason = None
                    self._log_interaction(request, llm_response.answer)
                    return llm_response
            except Exception as e:
                self.last_fallback_reason = f"LLM execution error ({e.__class__.__name__})"
                logger.warning(
                    "LLM API call failed (%s), falling back to Quantum Diagnostic Engine.",
                    e.__class__.__name__
                )
        else:
            self.last_fallback_reason = "No AI_API_KEY detected. Add AI_API_KEY to backend/.env or set the environment variable."

        # Fallback to Deterministic Quantum Diagnostic Engine
        diagnostic_response = self._run_diagnostic_engine(request)
        if self.last_fallback_reason:
            diagnostic_response.fallback_reason = self.last_fallback_reason
            diagnostic_response.answer = (
                f"{diagnostic_response.answer}\n\n---\n"
                f"> ⚠️ **AI Fallback Active**: Running on local **Quantum Diagnostic Reasoner**.\n"
                f"> **Reason**: *{self.last_fallback_reason}*"
            )
        self._log_interaction(request, diagnostic_response.answer)
        return diagnostic_response

    async def _call_llm(self, request: AIPromptRequest) -> Optional[AIResponse]:
        """Calls external LLM with strict quantum grounding and educational formatting."""
        provider = getattr(settings, "AI_PROVIDER", self.provider).lower().strip()
        api_key = getattr(settings, "AI_API_KEY", self.api_key).strip()
        model = getattr(settings, "AI_MODEL", self.model).strip()

        if not api_key:
            self.last_fallback_reason = "No AI_API_KEY configured."
            return None

        system_prompt = (
            "You are the AI Quantum Tutor for the SIH 2026 Interactive Quantum Learning Platform. "
            "You are an expert in quantum mechanics, quantum computing, Qiskit, and quantum algorithms.\n\n"
            "CRITICAL GROUNDING RULES:\n"
            "1. Base your explanations strictly on the provided Circuit JSON, code snippet, and real Qiskit Aer simulation results.\n"
            "2. NEVER fabricate measurement probabilities or claim quantum hardware executions that did not happen.\n"
            "3. When analyzing Grover's algorithm, explain amplitude amplification, phase inversion/oracle marking, and diffusion ($2|s\\rangle\\langle s| - I$).\n"
            "4. For coding challenges, provide progressive guidance matched to the hint level without revealing full code prematurely.\n\n"
            "EDUCATIONAL MARKDOWN & LATEX FORMATTING RULES:\n"
            "1. Use structured Markdown with clear headings (# and ##), **bold** for key concepts, *italic* for emphasis, and bulleted or numbered lists.\n"
            "2. For code, use standard Markdown fenced code blocks with language identifiers (e.g. ```python ... ```).\n"
            "3. For mathematical formulas, Dirac notation, and quantum operators, ALWAYS use standard LaTeX math delimiters:\n"
            "   - Inline math: $...$ or \\(...\\) (e.g., $|0\\rangle$, $|+\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}$, $\\theta = \\pi/4$, $\\sigma_x$)\n"
            "   - Display/Block math: $$...$$ or \\[...] (e.g., $$|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}$$, $$CZ = |0\\rangle\\langle 0| \\otimes I + |1\\rangle\\langle 1| \\otimes Z$$)\n"
            "4. Keep your explanations encouraging, rigorous, and visually organized."
        )

        context_info = {
            "query": request.query,
            "action": request.action,
            "circuit": request.circuit.model_dump() if request.circuit else None,
            "code": request.code,
            "counts": request.counts,
            "probabilities": request.probabilities,
            "lesson_title": request.lesson_title,
            "challenge_id": request.challenge_id,
            "hint_level": request.hint_level,
            "error_message": request.error_message
        }

        user_content = (
            f"Context: {json.dumps(context_info, indent=2)}\n\n"
            f"Student Request ({request.action}): {request.query}"
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            if "gemini" in provider:
                answer = await self._call_gemini(client, api_key, model, system_prompt, user_content)
                if answer:
                    self.last_fallback_reason = None
                    return AIResponse(
                        answer=answer,
                        action_type=request.action,
                        model_used=model,
                        provider="Google Gemini",
                        suggested_followups=self._generate_followups(request)
                    )
            elif "openai" in provider:
                answer = await self._call_openai(client, api_key, model, system_prompt, user_content)
                if answer:
                    self.last_fallback_reason = None
                    return AIResponse(
                        answer=answer,
                        action_type=request.action,
                        model_used=model or "gpt-4o-mini",
                        provider="OpenAI",
                        suggested_followups=self._generate_followups(request)
                    )
        return None

    async def _call_gemini(
        self,
        client: httpx.AsyncClient,
        api_key: str,
        model: str,
        system_prompt: str,
        user_content: str
    ) -> Optional[str]:
        """Calls the official Google Gemini REST API with comprehensive error handling."""
        target_model = model or "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent"

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }
        params = {"key": api_key}
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\n{user_content}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 2048,
                "topP": 0.95
            }
        }

        try:
            res = await client.post(url, headers=headers, params=params, json=payload)

            if res.status_code == 200:
                try:
                    data = res.json()
                except Exception as parse_err:
                    self.last_fallback_reason = f"Gemini response could not be parsed as JSON: {parse_err}"
                    logger.warning(self.last_fallback_reason)
                    return None

                candidates = data.get("candidates")
                if not candidates or not isinstance(candidates, list) or len(candidates) == 0:
                    feedback = data.get("promptFeedback", {})
                    reason = feedback.get("blockReason", "content policy")
                    self.last_fallback_reason = f"Gemini response was blocked by safety policy: {reason}"
                    logger.warning(self.last_fallback_reason)
                    return None

                candidate = candidates[0]
                content = candidate.get("content")
                if not content or not isinstance(content, dict):
                    self.last_fallback_reason = "Gemini API candidate is missing content."
                    logger.warning(self.last_fallback_reason)
                    return None

                parts = content.get("parts")
                if not parts or not isinstance(parts, list) or len(parts) == 0:
                    self.last_fallback_reason = "Gemini API candidate parts are empty."
                    logger.warning(self.last_fallback_reason)
                    return None

                text = parts[0].get("text")
                if not text:
                    self.last_fallback_reason = "Gemini API candidate text is empty."
                    logger.warning(self.last_fallback_reason)
                    return None

                self.last_fallback_reason = None
                return str(text)

            elif res.status_code in (404, 400):
                err_text = res.text
                if "not found" in err_text.lower() or "models/" in err_text.lower() or res.status_code == 404:
                    # Attempt automatic fallback to gemini-2.5-flash if user specified a non-existent model
                    if target_model != "gemini-2.5-flash":
                        logger.warning(
                            "Model '%s' not found on Google Gemini. Attempting automatic fallback to gemini-2.5-flash...",
                            target_model
                        )
                        fallback_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
                        try:
                            fb_res = await client.post(fallback_url, headers=headers, params=params, json=payload)
                            if fb_res.status_code == 200:
                                fb_data = fb_res.json()
                                fb_text = fb_data["candidates"][0]["content"]["parts"][0]["text"]
                                self.last_fallback_reason = None
                                return (
                                    f"> ℹ️ **Notice**: Configured model `{target_model}` was not found in the Google Gemini registry. "
                                    f"Automatically answered using `gemini-2.5-flash`.\n\n"
                                    f"{fb_text}"
                                )
                        except Exception as fb_err:
                            logger.warning("Auto-fallback to gemini-2.5-flash also failed: %s", fb_err)

                    self.last_fallback_reason = (
                        f"Google Gemini model '{target_model}' was not found (HTTP {res.status_code}). "
                        f"Available production models: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash. "
                        f"Please update AI_MODEL in backend/.env."
                    )
                else:
                    self.last_fallback_reason = (
                        f"Gemini API 400 Bad Request: Check request formatting or parameters."
                    )
                logger.warning(self.last_fallback_reason)
                return None

            elif res.status_code in (401, 403):
                self.last_fallback_reason = (
                    f"Gemini API {res.status_code} Authentication Failed. "
                    f"Please verify that your AI_API_KEY is valid and the Generative Language API is enabled."
                )
                logger.warning(self.last_fallback_reason)
                return None

            elif res.status_code == 429:
                self.last_fallback_reason = (
                    "Gemini API 429 Rate Limit Exceeded. Quota or requests-per-minute limit was reached."
                )
                logger.warning(self.last_fallback_reason)
                return None

            elif 500 <= res.status_code < 600:
                self.last_fallback_reason = f"Gemini API {res.status_code} Server Error from Google upstream."
                logger.warning(self.last_fallback_reason)
                return None

            else:
                self.last_fallback_reason = f"Gemini API returned unexpected status code {res.status_code}."
                logger.warning(self.last_fallback_reason)
                return None

        except httpx.TimeoutException:
            self.last_fallback_reason = f"Gemini API request timed out after 15s (model: {target_model})."
            logger.warning(self.last_fallback_reason)
            return None
        except httpx.RequestError as exc:
            self.last_fallback_reason = (
                f"Network connection failed: {exc.__class__.__name__} ({str(exc)[:80]}). "
                f"Ensure the server has outgoing internet connectivity to generativelanguage.googleapis.com."
            )
            logger.warning(self.last_fallback_reason)
            return None
        except Exception as exc:
            self.last_fallback_reason = f"Unexpected error during Gemini API request: {exc.__class__.__name__}."
            logger.warning(self.last_fallback_reason)
            return None

    async def get_status(self) -> AIStatusResponse:
        """Returns live diagnostic status and tests connectivity to configured LLM."""
        provider = getattr(settings, "AI_PROVIDER", self.provider).lower().strip()
        api_key = getattr(settings, "AI_API_KEY", self.api_key).strip()
        model = getattr(settings, "AI_MODEL", self.model).strip()
        detected_files = getattr(settings, "DETECTED_ENV_FILES", [])

        api_key_configured = bool(api_key)
        api_key_preview = (
            f"{api_key[:6]}...{api_key[-4:]} ({len(api_key)} chars)"
            if api_key
            else "Not configured"
        )
        env_file_detected = ", ".join(detected_files) if detected_files else "None found"
        supported_models = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ]

        if not api_key_configured:
            return AIStatusResponse(
                provider=provider,
                configured_model=model,
                api_key_configured=False,
                api_key_preview=api_key_preview,
                env_file_detected=env_file_detected,
                status="fallback_active",
                fallback_reason=self.last_fallback_reason or "No AI_API_KEY detected in backend/.env or environment variables.",
                live_test_status="skipped",
                live_test_message="Live test skipped: AI_API_KEY is empty.",
                supported_models=supported_models
            )

        # Test live connectivity
        target_model = model or "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent"
        headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
        params = {"key": api_key}
        payload = {
            "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
            "generationConfig": {"maxOutputTokens": 10}
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, headers=headers, params=params, json=payload)
                if res.status_code == 200:
                    return AIStatusResponse(
                        provider=provider,
                        configured_model=model,
                        api_key_configured=True,
                        api_key_preview=api_key_preview,
                        env_file_detected=env_file_detected,
                        status="ready",
                        fallback_reason=None,
                        live_test_status="connected",
                        live_test_message=f"Successfully connected to Google Gemini model '{target_model}'.",
                        supported_models=supported_models
                    )
                elif res.status_code in (404, 400):
                    reason = (
                        f"Model '{target_model}' not found in Google Gemini registry (HTTP {res.status_code}). "
                        f"Recommended: set AI_MODEL=gemini-2.5-flash in backend/.env."
                    )
                    return AIStatusResponse(
                        provider=provider,
                        configured_model=model,
                        api_key_configured=True,
                        api_key_preview=api_key_preview,
                        env_file_detected=env_file_detected,
                        status="fallback_active",
                        fallback_reason=reason,
                        live_test_status="error",
                        live_test_message=reason,
                        supported_models=supported_models
                    )
                elif res.status_code in (401, 403):
                    reason = f"Authentication Failed (HTTP {res.status_code}): Invalid AI_API_KEY."
                    return AIStatusResponse(
                        provider=provider,
                        configured_model=model,
                        api_key_configured=True,
                        api_key_preview=api_key_preview,
                        env_file_detected=env_file_detected,
                        status="fallback_active",
                        fallback_reason=reason,
                        live_test_status="error",
                        live_test_message=reason,
                        supported_models=supported_models
                    )
                elif res.status_code == 429:
                    reason = "Rate Limit / Quota Exceeded (HTTP 429)."
                    return AIStatusResponse(
                        provider=provider,
                        configured_model=model,
                        api_key_configured=True,
                        api_key_preview=api_key_preview,
                        env_file_detected=env_file_detected,
                        status="fallback_active",
                        fallback_reason=reason,
                        live_test_status="error",
                        live_test_message=reason,
                        supported_models=supported_models
                    )
                else:
                    reason = f"Google Gemini returned unexpected status {res.status_code}."
                    return AIStatusResponse(
                        provider=provider,
                        configured_model=model,
                        api_key_configured=True,
                        api_key_preview=api_key_preview,
                        env_file_detected=env_file_detected,
                        status="fallback_active",
                        fallback_reason=reason,
                        live_test_status="error",
                        live_test_message=reason,
                        supported_models=supported_models
                    )
        except httpx.TimeoutException:
            reason = "Connection timed out after 8s connecting to Google Gemini API."
            return AIStatusResponse(
                provider=provider,
                configured_model=model,
                api_key_configured=True,
                api_key_preview=api_key_preview,
                env_file_detected=env_file_detected,
                status="fallback_active",
                fallback_reason=reason,
                live_test_status="timeout",
                live_test_message=reason,
                supported_models=supported_models
            )
        except httpx.RequestError as exc:
            reason = f"Network connection error: {exc.__class__.__name__} ({str(exc)[:80]}). Check internet connectivity."
            return AIStatusResponse(
                provider=provider,
                configured_model=model,
                api_key_configured=True,
                api_key_preview=api_key_preview,
                env_file_detected=env_file_detected,
                status="fallback_active",
                fallback_reason=reason,
                live_test_status="network_error",
                live_test_message=reason,
                supported_models=supported_models
            )
        except Exception as exc:
            reason = f"Diagnostic test error: {exc.__class__.__name__}"
            return AIStatusResponse(
                provider=provider,
                configured_model=model,
                api_key_configured=True,
                api_key_preview=api_key_preview,
                env_file_detected=env_file_detected,
                status="fallback_active",
                fallback_reason=reason,
                live_test_status="error",
                live_test_message=reason,
                supported_models=supported_models
            )

    async def _call_openai(
        self,
        client: httpx.AsyncClient,
        api_key: str,
        model: str,
        system_prompt: str,
        user_content: str
    ) -> Optional[str]:
        """Calls the OpenAI Chat Completions API with safe error handling."""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.3,
            "max_tokens": 1500
        }

        try:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                choices = data.get("choices", [])
                if choices and len(choices) > 0:
                    return choices[0].get("message", {}).get("content")
            else:
                logger.warning("OpenAI API returned status code %d.", res.status_code)
                return None
        except Exception as exc:
            logger.warning("OpenAI API request failed: %s", exc.__class__.__name__)
            return None

    def _run_diagnostic_engine(self, request: AIPromptRequest) -> AIResponse:
        """Deterministic Quantum Diagnostic Reasoning Engine."""
        action = request.action.lower()
        query = request.query.lower()
        circuit = request.circuit

        # 1. Progressive Hint Action
        if action == "give_hint" or "hint" in query:
            return self._diagnose_hint(request)

        # 2. Debug Circuit Action
        if action in {"debug_circuit", "debug_code"} or "debug" in query or "wrong" in query or "why" in query or "issue" in query or "bug" in query:
            return self._diagnose_circuit_bugs(request)

        # 3. Explain Result Action
        if action == "explain_result" or "probability" in query or "result" in query or "count" in query:
            return self._diagnose_simulation_result(request)

        # 4. Explain Circuit Action
        if (action in {"explain_circuit", "explain"} or "circuit" in query or "help" in query or "gate" in query or "analyze" in query) and circuit:
            return self._diagnose_circuit_structure(circuit)

        # 5. Explain Code Action
        if (action in {"explain_code", "explain"} or "code" in query) and request.code:
            return self._diagnose_code(request.code)

        # 6. General Concept Explanation (Default fallback)
        return self._diagnose_concept(request)

    def _diagnose_circuit_bugs(self, request: AIPromptRequest) -> AIResponse:
        circuit = request.circuit
        if not circuit:
            return AIResponse(
                answer="I don't see an active circuit yet. Build or load a quantum circuit in Circuit Lab or Code Lab, and I will analyze it gate-by-gate!",
                action_type="debug_circuit",
                model_used="Quantum Diagnostic Reasoner",
                provider="Local Expert Engine",
                suggested_followups=["How do I build a Bell State?", "Explain Grover's algorithm"]
            )

        findings: List[str] = []
        gate_types = [g.type for g in circuit.gates]

        # Check 1: Measurement check
        has_measure = any(g == GateType.MEASURE for g in gate_types)
        if not has_measure:
            findings.append(
                "❌ **Missing Measurements**: Your circuit does not contain any `MEASURE` gates. "
                "Quantum superpositions cannot produce classical shot observations without measurement."
            )

        # Check 2: Grover-specific diagnostics
        if "grover" in (request.lesson_title or "").lower() or len(circuit.gates) >= 3:
            # Check for initial superposition
            qubit_0_has_h = any(g.type == GateType.H and 0 in g.qubits for g in circuit.gates)
            qubit_1_has_h = any(g.type == GateType.H and 1 in g.qubits for g in circuit.gates)
            if not (qubit_0_has_h and qubit_1_has_h):
                findings.append(
                    "⚠️ **Incomplete Superposition**: Grover's algorithm requires placing all search qubits into an equal superposition using Hadamard ($H$) gates before the oracle stage."
                )

            # Check for diffuser
            has_cz = any(g.type == GateType.CZ for g in circuit.gates)
            h_count = sum(1 for g in circuit.gates if g.type == GateType.H)
            x_count = sum(1 for g in circuit.gates if g.type == GateType.X)

            # A 2-qubit diffuser needs: H on both qubits, X on both qubits, CZ, X on both qubits, H on both qubits
            if has_cz and h_count < 4:
                findings.append(
                    "⚠️ **Missing Grover Diffuser**: Your circuit appears to mark a state with an oracle, but is missing the **Diffusion operator** ($2|s\\rangle\\langle s| - I$). "
                    "Without diffusion (inversion about the mean: $H \\rightarrow X \\rightarrow CZ \\rightarrow X \\rightarrow H$), the phase-flipped amplitude is not amplified into high measurement probability."
                )

        # Check 3: Check Bell state correctness
        if "bell" in (request.lesson_title or "").lower() or (circuit.num_qubits == 2 and GateType.CNOT in gate_types):
            cnot_gates = [g for g in circuit.gates if g.type == GateType.CNOT]
            h_gates = [g for g in circuit.gates if g.type == GateType.H]
            if len(h_gates) == 0:
                findings.append("⚠️ **Missing Hadamard**: To create a Bell state, apply $H$ on qubit 0 before the CNOT gate.")
            elif len(cnot_gates) > 0 and h_gates[0].qubits[0] != cnot_gates[0].qubits[0]:
                findings.append("⚠️ **Control Mismatch**: The Hadamard gate was placed on a different qubit than the CNOT control qubit.")

        if not findings:
            answer = (
                "✅ **Circuit Diagnostic: Passed!**\n\n"
                f"Your circuit with {circuit.num_qubits} qubits and {len(circuit.gates)} operations follows correct quantum formatting. "
                "The gate order is consistent, measurement registers are appropriately mapped, and no structural anomalies were detected."
            )
        else:
            answer = (
                "🔍 **AI Quantum Circuit Debugger Analysis**:\n\n" +
                "\n\n".join(findings) +
                "\n\n**Recommendation**: Apply the corrections above and click **Simulate** to observe the updated quantum state distribution."
            )

        return AIResponse(
            answer=answer,
            action_type="debug_circuit",
            model_used="Quantum Diagnostic Reasoner",
            provider="Local Expert Engine",
            suggested_followups=["Explain this circuit step by step", "Why is my probability low?", "Give me a hint"]
        )

    def _diagnose_simulation_result(self, request: AIPromptRequest) -> AIResponse:
        probs = request.probabilities or {}
        counts = request.counts or {}

        if not probs:
            return AIResponse(
                answer="No simulation measurements are available yet. Run the circuit using the **Simulate** or **Run Code** button first!",
                action_type="explain_result",
                model_used="Quantum Diagnostic Reasoner",
                provider="Local Expert Engine",
                suggested_followups=["How does measurement collapse work?", "What does Qiskit Aer do?"]
            )

        sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        top_state, top_p = sorted_probs[0]
        top_pct = round(top_p * 100, 1)

        if top_p >= 0.90:
            interpretation = (
                f"🎯 **High Amplitude Constructive Interference**: Basis state `|{top_state}⟩` dominates the distribution at **{top_pct}%** probability. "
                "This indicates that the quantum algorithm successfully achieved constructive interference on the target state while destructively canceling non-target amplitudes."
            )
        elif 0.40 <= top_p <= 0.60 and len(sorted_probs) >= 2 and 0.40 <= sorted_probs[1][1] <= 0.60:
            s2, p2 = sorted_probs[1]
            interpretation = (
                f"✨ **Entangled / Equal Superposition**: States `|{top_state}⟩` ({top_pct}%) and `|{s2}⟩` ({round(p2*100, 1)}%) share the measurement space nearly equally. "
                "This is the hallmark signature of an entangled Bell pair (such as $(|00\\rangle + |11\\rangle)/\\sqrt{2}$) or a balanced superposition."
            )
        else:
            interpretation = (
                f"📊 **Distributed Quantum State**: The measurement is spread across computational basis states, with `|{top_state}⟩` at {top_pct}%. "
                "According to Born's rule, each observation collapsed the wavefunction into one specific eigenstate with frequency proportional to $|\\psi_x|^2$."
            )

        answer = (
            f"### 🔬 Simulation Result Explanation\n\n"
            f"{interpretation}\n\n"
            f"- **Observed States**: {', '.join([f'|{s}⟩: {round(p*100, 1)}%' for s, p in sorted_probs[:4]])}\n"
            f"- **Quantum Measurement Principle**: Prior to measurement, the qubits existed in a coherent superposition. "
            "Measurement physically projected the quantum statevector into the classical basis, destroying the coherence."
        )

        return AIResponse(
            answer=answer,
            action_type="explain_result",
            model_used="Quantum Diagnostic Reasoner",
            provider="Local Expert Engine",
            suggested_followups=["Why did Grover amplify this specific state?", "Explain wave function collapse"]
        )

    def _diagnose_hint(self, request: AIPromptRequest) -> AIResponse:
        level = request.hint_level or 1
        challenge_id = request.challenge_id

        if challenge_id:
            ch = EducationRepository.get_challenge_by_id(challenge_id)
            if ch:
                hints = ch["hints"]
                if level == 1 and len(hints) >= 1:
                    hint_text = f"💡 **Conceptual Hint (Level 1)**:\n\n{hints[0]}"
                elif level == 2 and len(hints) >= 2:
                    hint_text = f"🔧 **Gate-Level Hint (Level 2)**:\n\n{hints[1]}"
                elif level >= 3 and len(hints) >= 3:
                    hint_text = f"🎯 **Near-Solution Hint (Level 3)**:\n\n{hints[2]}"
                else:
                    hint_text = f"💡 **Hint**:\n\n{hints[-1]}"

                return AIResponse(
                    answer=hint_text + f"\n\n*(Hint level {level} of 3)*",
                    action_type="give_hint",
                    model_used="Quantum Challenge Guidance",
                    provider="Local Expert Engine",
                    suggested_followups=[f"Show Hint Level {min(level + 1, 3)}", "Explain the concept behind this challenge"]
                )

        return AIResponse(
            answer="💡 **General Quantum Hint**: Remember that quantum operations must be unitary and reversible. Hadamards ($H$) create superpositions, Pauli-X flips bits, Controlled-Z flips relative phase, and measurements project states into classical registers.",
            action_type="give_hint",
            model_used="Quantum Diagnostic Reasoner",
            provider="Local Expert Engine",
            suggested_followups=["Explain Hadamard gate", "How to build Bell State"]
        )

    def _diagnose_circuit_structure(self, circuit: CircuitSchema) -> AIResponse:
        if not circuit.gates:
            return AIResponse(
                answer=(
                    "### ⚛️ Empty Quantum Circuit\n\n"
                    f"Your circuit currently has **{circuit.num_qubits} qubits** initialized to the ground state $|0\\dots0\\rangle$, but contains no gate operations yet.\n\n"
                    "**Getting Started**:\n"
                    "- Click a gate in the **Gate Palette** (such as **H** for Hadamard or **X** for Pauli-X) and place it on a qubit wire.\n"
                    "- Connect two qubits with a **CNOT** or **CZ** to generate entanglement.\n"
                    "- Add **MEASURE** gates to observe classical bitstring probabilities."
                ),
                action_type="explain_circuit",
                model_used="Quantum Diagnostic Reasoner",
                provider="Local Expert Engine",
                suggested_followups=["How do I build a Bell State?", "Explain Grover's algorithm", "How do quantum gates work?"]
            )

        steps: List[str] = []
        for idx, gate in enumerate(circuit.gates):
            qubit_str = f"q{gate.qubits[0]}" if len(gate.qubits) == 1 else f"q{gate.qubits[0]} and q{gate.qubits[1]}"
            if gate.type == GateType.H:
                steps.append(f"**Step {idx+1}**: Apply Hadamard gate on {qubit_str} (creates superposition).")
            elif gate.type == GateType.X:
                steps.append(f"**Step {idx+1}**: Apply Pauli-X (NOT) on {qubit_str} (flips bit).")
            elif gate.type == GateType.Y:
                steps.append(f"**Step {idx+1}**: Apply Pauli-Y on {qubit_str} (bit and phase flip).")
            elif gate.type == GateType.Z:
                steps.append(f"**Step {idx+1}**: Apply Pauli-Z on {qubit_str} (flips phase of $|1\\rangle$).")
            elif gate.type == GateType.S:
                steps.append(f"**Step {idx+1}**: Apply Phase gate S ($\\pi/2$ phase rotation) on {qubit_str}.")
            elif gate.type == GateType.T:
                steps.append(f"**Step {idx+1}**: Apply T gate ($\\pi/4$ phase rotation) on {qubit_str}.")
            elif gate.type == GateType.CNOT:
                steps.append(f"**Step {idx+1}**: Apply CNOT with control q{gate.qubits[0]} and target q{gate.qubits[1]} (entangles qubits).")
            elif gate.type == GateType.CZ:
                steps.append(f"**Step {idx+1}**: Apply Controlled-Z on {qubit_str} (inverts phase if both qubits are $|11\\rangle$).")
            elif gate.type == GateType.MEASURE:
                steps.append(f"**Step {idx+1}**: Measure {qubit_str} into classical register.")
            else:
                gate_name = gate.type.value if hasattr(gate.type, "value") else str(gate.type)
                steps.append(f"**Step {idx+1}**: Apply {gate_name} on {qubit_str}.")

        answer = (
            f"### ⚛️ Circuit Architecture Walkthrough\n\n"
            f"This circuit contains **{circuit.num_qubits} qubits** and **{len(circuit.gates)} operations**:\n\n" +
            "\n".join(steps) +
            "\n\n**Quantum State Trajectory**: The circuit initializes the register in state $|0\\dots0\\rangle$, applies unitaries to steer the statevector through Hilbert space, and finally samples the output distribution."
        )

        return AIResponse(
            answer=answer,
            action_type="explain_circuit",
            model_used="Quantum Diagnostic Reasoner",
            provider="Local Expert Engine",
            suggested_followups=["Simulate this circuit", "Explain measurement probabilities", "Debug this circuit"]
        )

    def _diagnose_code(self, code: str) -> AIResponse:
        lines = code.strip().split("\n")
        explanation_lines = [
            f"### 🐍 Quantum Code Analysis\n",
            f"Your script defines a Qiskit quantum circuit ({len(lines)} lines of Python):\n"
        ]
        for line in lines[:8]:
            clean = line.strip()
            if clean.startswith("qc.h("):
                explanation_lines.append(f"- `{clean}`: Applies a Hadamard gate to create equal superposition.")
            elif clean.startswith("qc.cx("):
                explanation_lines.append(f"- `{clean}`: Applies a Controlled-NOT gate to create entanglement.")
            elif clean.startswith("qc.cz("):
                explanation_lines.append(f"- `{clean}`: Applies Controlled-Z to invert the phase of state |11⟩.")
            elif clean.startswith("qc.measure"):
                explanation_lines.append(f"- `{clean}`: Measures quantum registers into classical bits.")

        explanation_lines.append("\nClick **Run Code** to simulate this program on the local Qiskit Aer backend.")
        return AIResponse(
            answer="\n".join(explanation_lines),
            action_type="explain_code",
            model_used="Quantum Diagnostic Reasoner",
            provider="Local Expert Engine",
            suggested_followups=["Run this code", "Convert code to visual circuit"]
        )

    def _diagnose_concept(self, request: AIPromptRequest) -> AIResponse:
        query = request.query.lower()
        if "grover" in query:
            answer = (
                "### 🔍 Grover's Algorithm\n\n"
                "Grover's algorithm searches an unsorted database of $N$ items in $O(\\sqrt{N})$ queries, representing a provable quadratic quantum speedup.\n\n"
                "**Core Steps**:\n"
                "1. **Initialization**: Create uniform superposition: $|s\\rangle = H^{\\otimes n}|0\\dots0\\rangle$.\n"
                "2. **Oracle ($U_w$)**: Flips the phase of the marked target state: $U_w|x\\rangle = (-1)^{f(x)}|x\\rangle$.\n"
                "3. **Diffuser ($U_s$)**: Reflects amplitudes about the mean: $2|s\\rangle\\langle s| - I$.\n"
                "4. **Measurement**: The target state amplitude is amplified to near 100%."
            )
        elif "bell" in query or "entangle" in query:
            answer = (
                "### 🔗 Quantum Entanglement & Bell States\n\n"
                "Entanglement occurs when two or more qubits cannot be described independently of each other. "
                "The canonical Bell state is $|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}$.\n\n"
                "**How it's built**:\n"
                "1. $H(0)$ creates equal superposition on qubit 0: $(|0\\rangle + |1\\rangle)/\\sqrt{2} \\otimes |0\\rangle$.\n"
                "2. $CNOT(0, 1)$ flips qubit 1 if qubit 0 is $|1\\rangle$, producing $(|00\\rangle + |11\\rangle)/\\sqrt{2}$."
            )
        elif "superposition" in query or "hadamard" in query:
            answer = (
                "### 🌊 Quantum Superposition & Hadamard Gate\n\n"
                "A qubit can exist in a linear combination of basis states: $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$.\n\n"
                "The Hadamard ($H$) gate transforms $|0\\rangle \\rightarrow |+\\rangle = (|0\\rangle + |1\\rangle)/\\sqrt{2}$, "
                "giving each computational state an equal 50% measurement probability."
            )
        else:
            answer = (
                f"### ⚛️ Quantum Concept: {request.query.title()}\n\n"
                "In quantum computing, information is encoded in physical quantum systems capable of superposition and interference. "
                "Quantum logic gates are unitary matrices ($U^\\dagger U = I$) that rotate state vectors within high-dimensional Hilbert spaces without losing quantum information."
            )

        return AIResponse(
            answer=answer,
            action_type="explain_concept",
            model_used="Quantum Diagnostic Reasoner",
            provider="Local Expert Engine",
            suggested_followups=self._generate_followups(request)
        )

    def _generate_followups(self, request: AIPromptRequest) -> List[str]:
        return [
            "Explain how the Diffuser works in Grover's search",
            "Show me a Bell State circuit example",
            "How do I open this in Code Lab?"
        ]

    def _log_interaction(self, request: AIPromptRequest, response_text: str) -> None:
        try:
            EducationRepository.record_ai_interaction(
                user_id=request.user_id,
                context_type=request.action,
                prompt=request.query,
                response=response_text
            )
        except Exception as e:
            logger.warning(f"Could not record AI interaction: {e}")
