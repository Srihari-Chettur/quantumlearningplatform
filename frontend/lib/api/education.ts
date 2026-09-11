import { CircuitSchema } from "../types/quantum";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ----------------- Code Lab Types & API -----------------
export interface CodeExecutionResponse {
  success: boolean;
  stdout: string;
  circuit_ascii?: string;
  circuit?: CircuitSchema;
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  execution_time_ms: number;
  backend: string;
  error?: string;
}

export async function runCode(
  code: string,
  language: string = "qiskit",
  shots: number = 1024
): Promise<CodeExecutionResponse> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/code/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language, shots, user_id: "student_demo" }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Code execution failed (${res.status})`);
  }
  return res.json();
}

export async function convertCodeToCircuit(code: string, language: string = "qiskit"): Promise<{ success: boolean; circuit?: CircuitSchema; error?: string }> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/code/to-circuit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language }),
  });
  return res.json();
}

export async function convertCircuitToCode(circuit: CircuitSchema, language: string = "qiskit"): Promise<{ code: string; language: string }> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/code/to-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ circuit, language }),
  });
  if (!res.ok) throw new Error("Circuit to code conversion failed.");
  return res.json();
}

// ----------------- AI Tutor Types & API -----------------
export interface AIResponse {
  answer: string;
  action_type: string;
  model_used: string;
  provider: string;
  suggested_followups: string[];
  diagnostic_details?: Record<string, unknown>;
  fallback_reason?: string;
}

export interface AIStatusInfo {
  provider: string;
  configured_model: string;
  api_key_configured: boolean;
  api_key_preview?: string;
  env_file_detected?: string;
  status: string;
  fallback_reason?: string;
  live_test_status?: string;
  live_test_message?: string;
  supported_models: string[];
}

export async function fetchAIStatus(): Promise<AIStatusInfo> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/ai/status`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch AI tutor status.");
  return res.json();
}

export interface AIPromptPayload {
  query: string;
  action?: string;
  circuit?: CircuitSchema;
  code?: string;
  counts?: Record<string, number>;
  probabilities?: Record<string, number>;
  lesson_title?: string;
  challenge_id?: string;
  hint_level?: number;
  error_message?: string;
  user_id?: string;
}

export async function askAITutor(payload: AIPromptPayload): Promise<AIResponse> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, user_id: payload.user_id || "student_demo" }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `AI Tutor service error (${res.status})`);
  }
  return res.json();
}

// ----------------- Lessons Types & API -----------------
export interface Lesson {
  id: string;
  slug: string;
  title: string;
  category: string;
  order_index: number;
  description: string;
  content_markdown: string;
  prerequisites: string[];
  user_status: string;
}

export async function fetchLessons(): Promise<Lesson[]> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/lessons?user_id=student_demo`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch lessons.");
  const data = await res.json();
  return data.lessons;
}

export async function fetchLessonById(id: string): Promise<Lesson> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/lessons/${id}?user_id=student_demo`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load lesson ${id}`);
  return res.json();
}

export async function completeLesson(id: string): Promise<void> {
  await fetch(`${BACKEND_BASE_URL}/api/lessons/${id}/complete?user_id=student_demo`, {
    method: "POST",
  });
}

// ----------------- Assessments Types & API -----------------
export interface AssessmentQuestion {
  id: string;
  topic: string;
  type: string;
  question: string;
  options: string[];
  explanation: string;
  prerequisite_lesson_id?: string;
}

export interface AssessmentResult {
  question_id: string;
  is_correct: boolean;
  correct_answer: string;
  selected_answer: string;
  explanation: string;
  lesson_review_url?: string;
}

export async function fetchAssessmentQuestions(topic?: string): Promise<AssessmentQuestion[]> {
  const url = topic && topic !== "all"
    ? `${BACKEND_BASE_URL}/api/assessments?topic=${encodeURIComponent(topic)}`
    : `${BACKEND_BASE_URL}/api/assessments`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load assessments.");
  return res.json();
}

export async function submitAssessment(questionId: string, selectedAnswer: string): Promise<AssessmentResult> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/assessments/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer, user_id: "student_demo" }),
  });
  if (!res.ok) throw new Error("Failed to submit assessment answer.");
  return res.json();
}

// ----------------- Challenges Types & API -----------------
export interface CodingChallenge {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  topic: string;
  description: string;
  objective: string;
  starter_code: string;
  starter_circuit?: CircuitSchema;
  expected_behavior: Record<string, unknown>;
  hints: string[];
  passed: boolean;
  high_score: number;
}

export interface ChallengeResult {
  challenge_id: string;
  passed: boolean;
  score: number;
  feedback: string;
  probabilities: Record<string, number>;
  counts: Record<string, number>;
  circuit_ascii?: string;
  error?: string;
}

export async function fetchChallenges(): Promise<CodingChallenge[]> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/challenges?user_id=student_demo`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load coding challenges.");
  return res.json();
}

export async function fetchChallengeById(id: string): Promise<CodingChallenge> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/challenges/${id}?user_id=student_demo`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Challenge ${id} not found.`);
  return res.json();
}

export async function submitChallenge(
  challengeId: string,
  code?: string,
  circuit?: CircuitSchema
): Promise<ChallengeResult> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/challenges/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge_id: challengeId, code, circuit, user_id: "student_demo" }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to evaluate challenge.");
  }
  return res.json();
}

// ----------------- Dashboard & Recommendations -----------------
export interface TopicMastery {
  topic: string;
  mastery_level: string;
  quiz_avg_score: number;
  challenges_completed: number;
  simulations_run: number;
}

export interface DashboardSummary {
  user_id: string;
  completed_lessons: number;
  completed_challenges: number;
  avg_quiz_score: number;
  simulations_run: number;
  overall_progress_pct: number;
  topics_progress: TopicMastery[];
  recent_activities: Array<{
    type: string;
    label: string;
    score: number;
    passed: boolean;
    timestamp: string;
  }>;
}

export async function fetchDashboardData(): Promise<DashboardSummary> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/dashboard?user_id=student_demo`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load dashboard metrics.");
  return res.json();
}

export async function resetStudentProgress(): Promise<void> {
  await fetch(`${BACKEND_BASE_URL}/api/progress/reset?user_id=student_demo`, {
    method: "POST",
  });
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  category: string;
  action_label: string;
  action_url: string;
  priority: "High" | "Medium" | "Low";
}

export async function fetchRecommendations(): Promise<Recommendation[]> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/recommendations?user_id=student_demo`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load recommendations.");
  const data = await res.json();
  return data.recommendations;
}
