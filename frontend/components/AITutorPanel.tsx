"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CircuitSchema } from "@/lib/types/quantum";
import { askAITutor, fetchAIStatus, AIResponse, AIPromptPayload, AIStatusInfo } from "@/lib/api/education";
import {
  Sparkles,
  Send,
  Loader2,
  HelpCircle,
  Bug,
  Lightbulb,
  Maximize2,
  Minimize2,
  X,
  ChevronRight,
  Code2,
  Activity,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { MarkdownLatexRenderer } from "@/components/MarkdownLatexRenderer";

interface AITutorPanelProps {
  circuit?: CircuitSchema;
  code?: string;
  counts?: Record<string, number>;
  probabilities?: Record<string, number>;
  lessonTitle?: string;
  challengeId?: string;
  initialPrompt?: string;
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  model?: string;
  provider?: string;
  followups?: string[];
  fallback_reason?: string;
  timestamp: string;
}

export function AITutorPanel({
  circuit,
  code,
  counts,
  probabilities,
  lessonTitle,
  challengeId,
  initialPrompt,
  isOpen = true,
  onClose,
  inline = false,
}: AITutorPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m_welcome",
      sender: "ai",
      text: "👋 **Hello! I am your AI Quantum Tutor.**\n\nI can inspect your active circuit, analyze quantum code, debug Grover's algorithm or Bell states, explain simulation measurement statistics, and give you progressive hints.",
      model: "Quantum Diagnostic Engine",
      provider: "Local Expert Engine",
      followups: [
        "Explain this quantum circuit",
        "Debug my circuit for issues",
        "Explain how Grover amplification works",
      ],
      timestamp: "Just now",
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hintLevel, setHintLevel] = useState(1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatusInfo | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setShowStatusModal(true);
    try {
      const status = await fetchAIStatus();
      setAiStatus(status);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to connect to backend AI status endpoint";
      setAiStatus({
        provider: "Gemini",
        configured_model: "Unknown",
        api_key_configured: false,
        status: "error",
        fallback_reason: errorMsg,
        live_test_status: "error",
        live_test_message: errorMsg,
        supported_models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSendPrompt = useCallback(async (queryText: string, actionType: string = "ask") => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const payload: AIPromptPayload = {
        query: trimmed,
        action: actionType,
        circuit,
        code,
        counts,
        probabilities,
        lesson_title: lessonTitle,
        challenge_id: challengeId,
        hint_level: hintLevel,
      };

      const res: AIResponse = await askAITutor(payload);

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: res.answer,
        model: res.model_used,
        provider: res.provider,
        followups: res.suggested_followups,
        fallback_reason: res.fallback_reason,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "AI service temporarily unavailable.";
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "ai",
          text: `⚠️ **Notice**: ${errorText}\n\n*Your local Qiskit Aer simulations and circuit builders continue to work seamlessly.*`,
          model: "Fallback Diagnostic",
          provider: "Local Engine",
          fallback_reason: errorText,
          timestamp: "Just now",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, circuit, code, counts, probabilities, lessonTitle, challengeId, hintLevel]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const handledPromptRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialPrompt && initialPrompt !== handledPromptRef.current) {
      handledPromptRef.current = initialPrompt;
      const timer = setTimeout(() => {
        handleSendPrompt(initialPrompt, "ask");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, handleSendPrompt]);

  const requestHint = () => {
    const nextLevel = hintLevel < 3 ? hintLevel + 1 : 1;
    setHintLevel(nextLevel);
    handleSendPrompt(`Give me hint level ${hintLevel}`, "give_hint");
  };

  if (!isOpen) return null;

  const content = (
    <div
      className={`flex flex-col bg-white/95 backdrop-blur-md rounded-2xl border border-emerald-100 shadow-xl overflow-hidden ${
        isMinimized
          ? "h-auto"
          : inline
          ? "h-full min-h-[500px]"
          : "h-[620px] max-h-[calc(100vh-5rem)]"
      }`}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">AI Quantum Tutor</h3>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Ground Truth Engine
              </span>
              <button
                onClick={handleCheckStatus}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Check AI Tutor model & fallback diagnostics"
              >
                <Activity className="h-2.5 w-2.5 text-emerald-600" />
                <span>AI Diagnostics</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {circuit ? `${circuit.num_qubits} Qubits Active` : "Context-Aware Quantum Guidance"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!inline && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Action Badges */}
          <div className="shrink-0 flex items-center gap-1.5 p-2 bg-slate-50/70 border-b border-slate-100 overflow-x-auto text-xs scrollbar-none">
            <button
              onClick={() => handleSendPrompt("Explain this circuit step by step", "explain_circuit")}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-all shrink-0 font-medium disabled:opacity-50"
            >
              <HelpCircle className="h-3.5 w-3.5 text-emerald-600" />
              Explain Circuit
            </button>

            <button
              onClick={() => handleSendPrompt("Debug this circuit for missing gates or logic errors", "debug_circuit")}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-all shrink-0 font-medium disabled:opacity-50"
            >
              <Bug className="h-3.5 w-3.5 text-amber-500" />
              Debug Circuit
            </button>

            <button
              onClick={requestHint}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-sky-300 hover:text-sky-700 transition-all shrink-0 font-medium disabled:opacity-50"
            >
              <Lightbulb className="h-3.5 w-3.5 text-sky-500" />
              Get Hint (L{hintLevel})
            </button>

            {probabilities && (
              <button
                onClick={() => handleSendPrompt("Explain these simulation measurement probabilities", "explain_result")}
                disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700 transition-all shrink-0 font-medium disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                Explain Probabilities
              </button>
            )}

            {code && (
              <button
                onClick={() => handleSendPrompt("Explain my Qiskit Python code", "explain_code")}
                disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-teal-300 hover:text-teal-700 transition-all shrink-0 font-medium disabled:opacity-50"
              >
                <Code2 className="h-3.5 w-3.5 text-teal-600" />
                Explain Code
              </button>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3.5 text-sm scroll-smooth">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-xs ${
                    m.sender === "user"
                      ? "bg-emerald-600 text-white rounded-br-xs"
                      : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-bl-xs"
                  }`}
                >
                  <MarkdownLatexRenderer
                    content={m.text}
                    isUser={m.sender === "user"}
                  />

                  {m.sender === "ai" && m.model && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{m.model}</span>
                      <span>{m.timestamp}</span>
                    </div>
                  )}

                  {m.fallback_reason && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs shadow-2xs">
                      <div className="flex items-center justify-between gap-1.5 font-bold mb-1 text-amber-900">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>Fallback Reason</span>
                        </div>
                        <button
                          onClick={handleCheckStatus}
                          className="text-[10px] underline text-amber-800 hover:text-amber-950 font-medium cursor-pointer"
                        >
                          Diagnose / Re-test
                        </button>
                      </div>
                      <p className="text-slate-700 text-[11px] leading-relaxed font-sans">
                        {m.fallback_reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Followup suggestions */}
                {m.followups && m.followups.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                    {m.followups.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendPrompt(f)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 transition-colors flex items-center gap-1"
                      >
                        <ChevronRight className="h-2.5 w-2.5 text-emerald-600" />
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 w-fit">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span>AI Tutor is analyzing quantum circuit state...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(inputQuery);
            }}
            className="shrink-0 p-3 border-t border-slate-100 bg-white"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about Grover, Bell states, quantum gates, or results..."
                disabled={loading}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-transform active:scale-95"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </>
      )}

      {/* AI Diagnostic Status Modal */}
      {showStatusModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-900">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">AI Model & Fallback Diagnostics</h4>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {checkingStatus ? (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
                  <p className="text-slate-500 font-medium">Testing live Gemini connection & checking env...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Provider</span>
                      <p className="font-bold text-slate-800 uppercase text-xs">{aiStatus?.provider || "Gemini"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Configured Model</span>
                      <p className="font-bold font-mono text-emerald-800 text-xs truncate" title={aiStatus?.configured_model}>{aiStatus?.configured_model || "Not set"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">API Key</span>
                      <p className="font-mono text-slate-700 text-[11px] truncate">{aiStatus?.api_key_preview || "Missing"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
                      <span className={`inline-flex items-center gap-1 font-bold text-xs ${aiStatus?.status === "ready" ? "text-emerald-600" : "text-amber-600"}`}>
                        {aiStatus?.status === "ready" ? "● Ready" : "▲ Fallback Active"}
                      </span>
                    </div>
                  </div>

                  {aiStatus?.fallback_reason && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Reason for Fallback:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed font-sans text-slate-800">
                        {aiStatus.fallback_reason}
                      </p>
                    </div>
                  )}

                  {aiStatus?.live_test_message && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Test Ping: </span>
                      <span>{aiStatus.live_test_message}</span>
                    </div>
                  )}

                  {aiStatus?.env_file_detected && (
                    <div className="text-[10px] text-slate-500">
                      <span className="font-semibold">Detected File: </span>
                      <span className="font-mono text-slate-700">{aiStatus.env_file_detected}</span>
                    </div>
                  )}

                  {aiStatus?.supported_models && (
                    <div className="text-[10px] text-slate-500">
                      <span className="font-semibold">Supported Gemini Models: </span>
                      <span className="font-mono text-slate-700">{aiStatus.supported_models.join(", ")}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={handleCheckStatus}
                      disabled={checkingStatus}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${checkingStatus ? "animate-spin" : ""}`} />
                      <span>Re-test Connection</span>
                    </button>
                    <button
                      onClick={() => setShowStatusModal(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 w-96 sm:w-[440px] max-w-[calc(100vw-2.5rem)] shadow-2xl transition-all ${
        isMinimized ? "h-auto" : "h-[620px] max-h-[calc(100vh-5rem)]"
      }`}
    >
      {content}
    </div>
  );
}
