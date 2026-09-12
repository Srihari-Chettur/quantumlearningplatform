from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from app.schemas.circuit import CircuitSchema


class AIPromptRequest(BaseModel):
    """Contextual prompt request payload for the AI Quantum Tutor."""
    query: str = Field(..., description="Student question or request")
    action: str = Field(
        default="ask",
        description="Action category: explain_concept, explain_circuit, explain_code, debug_circuit, debug_code, explain_result, give_hint, generate_code, simplify"
    )
    circuit: Optional[CircuitSchema] = Field(default=None, description="Current Circuit JSON if available")
    code: Optional[str] = Field(default=None, description="Current code snippet if available")
    counts: Optional[Dict[str, int]] = Field(default=None, description="Observed measurement counts")
    probabilities: Optional[Dict[str, float]] = Field(default=None, description="Observed state probabilities")
    lesson_title: Optional[str] = Field(default=None, description="Current active lesson")
    challenge_id: Optional[str] = Field(default=None, description="Current active coding challenge")
    hint_level: Optional[int] = Field(default=1, ge=1, le=4, description="Progressive hint level (1=concept, 2=gate, 3=near-solution, 4=solution)")
    error_message: Optional[str] = Field(default=None, description="Runtime or validation error message")
    user_id: str = Field(default="student_demo", description="Student ID")


class AIResponse(BaseModel):
    """Structured response from the AI Quantum Tutor."""
    answer: str
    action_type: str
    model_used: str
    provider: str
    suggested_followups: List[str] = Field(default_factory=list)
    diagnostic_details: Optional[Dict[str, Any]] = None
    fallback_reason: Optional[str] = Field(
        default=None,
        description="Reason why the system fell back to the Quantum Diagnostic Engine, if applicable"
    )


class AIStatusResponse(BaseModel):
    """Diagnostic status of the AI Tutor integration."""
    provider: str
    configured_model: str
    api_key_configured: bool
    api_key_preview: Optional[str] = None
    env_file_detected: Optional[str] = None
    status: str = Field(description="'ready' if LLM is active, 'fallback_active' if using deterministic engine")
    fallback_reason: Optional[str] = None
    live_test_status: Optional[str] = None
    live_test_message: Optional[str] = None
    supported_models: List[str] = Field(default_factory=list)
