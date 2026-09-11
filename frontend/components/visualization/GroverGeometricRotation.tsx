"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Sparkles, ChevronRight, ChevronLeft, ArrowDownUp } from "lucide-react";

interface GroverGeometricRotationProps {
  className?: string;
}

export function GroverGeometricRotation({ className = "" }: GroverGeometricRotationProps) {
  const [qubitMode, setQubitMode] = useState<2 | 3>(3); // Default to 3 qubits to directly show user request
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Smooth animation interpolation
  const animAngleRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Constants
  const N = qubitMode === 2 ? 4 : 8;
  const initialHalfThetaRad = Math.asin(1 / Math.sqrt(N)); // ~30.0° for N=4, ~20.7° for N=8
  const thetaRad = 2 * initialHalfThetaRad;               // ~60.0° for N=4, ~41.4° for N=8

  // 2-Qubit Steps (N=4)
  const steps2Q = [
    {
      id: 0,
      title: "Initial Superposition |ψ₀⟩",
      angleRad: initialHalfThetaRad,
      prevAngleRad: null,
      desc: "All 4 states begin with equal amplitude (0.5). Initial angle θ/2 = 30.0°. Target probability = sin²(30°) = 25.0%.",
      targetProb: 0.25,
      amplitude: 0.5,
      type: "init" as const,
      stage: "Initialization",
    },
    {
      id: 1,
      title: "Iteration 1: Oracle Phase Reversal (Ow)",
      angleRad: -initialHalfThetaRad,
      prevAngleRad: initialHalfThetaRad,
      desc: "The Oracle marks |w⟩ with a negative sign (-1), reflecting the state vector across the horizontal non-target axis |w^⊥⟩ to -30.0°.",
      targetProb: 0.25,
      amplitude: -0.5,
      type: "reversal" as const,
      stage: "Oracle Phase Reversal",
    },
    {
      id: 2,
      title: "Iteration 1: Diffusion Amplification (D)",
      angleRad: initialHalfThetaRad + thetaRad, // 30° + 60° = 90°
      prevAngleRad: -initialHalfThetaRad,
      desc: "The Diffusion operator reflects the vector across |ψ₀⟩ (+30°). Since the angle to |ψ₀⟩ was 60°, reflection adds +60°, rotating the vector straight up to 90°!",
      targetProb: 1.0,
      amplitude: 1.0,
      type: "amplification" as const,
      stage: "Diffusion Amplification",
    },
    {
      id: 3,
      title: "Measurement Alignment: 100% Certainty",
      angleRad: Math.PI / 2,
      prevAngleRad: Math.PI / 2,
      desc: "The state vector is now perfectly perpendicular to |w^⊥⟩ and completely parallel to |w⟩. Measurement yields the target with 100% probability!",
      targetProb: 1.0,
      amplitude: 1.0,
      type: "final" as const,
      stage: "100% Target Alignment",
    },
  ];

  // 3-Qubit Steps (N=8): Showing both Reversing and Amplification for each iteration!
  const steps3Q = [
    {
      id: 0,
      title: "Initial Superposition |ψ₀⟩ (N=8)",
      angleRad: initialHalfThetaRad, // ~20.7°
      prevAngleRad: null,
      desc: "8 states with equal amplitude 1/√8 ≈ 0.354. Starting angle is θ/2 = 20.7°. Initial target probability = sin²(20.7°) = 12.5%.",
      targetProb: 0.125,
      amplitude: 0.354,
      type: "init" as const,
      stage: "Initialization",
    },
    {
      id: 1,
      title: "Iteration 1: Oracle Phase Reversal (Ow)",
      angleRad: -initialHalfThetaRad, // -20.7°
      prevAngleRad: initialHalfThetaRad,
      desc: "REVERSING: The Oracle inverts the relative phase of the marked state |w⟩, reflecting the vector across the horizontal axis |w^⊥⟩ to -20.7° (amplitude becomes -0.354).",
      targetProb: 0.125,
      amplitude: -0.354,
      type: "reversal" as const,
      stage: "Iter 1 • Phase Reversal",
    },
    {
      id: 2,
      title: "Iteration 1: Diffusion Amplification (D)",
      angleRad: initialHalfThetaRad + thetaRad, // 20.7° + 41.4° = 62.1°
      prevAngleRad: -initialHalfThetaRad,
      desc: "AMPLIFICATION: Diffusion reflects the vector across the initial state |ψ₀⟩ (+20.7°). This adds a net forward rotation of +θ = +41.4°, propelling the angle to 62.1°! Target probability jumps to 78.3%.",
      targetProb: 0.783,
      amplitude: 0.885,
      type: "amplification" as const,
      stage: "Iter 1 • Amplification",
    },
    {
      id: 3,
      title: "Iteration 2: Oracle Phase Reversal (Ow)",
      angleRad: -(initialHalfThetaRad + thetaRad), // -62.1°
      prevAngleRad: initialHalfThetaRad + thetaRad,
      desc: "REVERSING: For the second iteration, the Oracle flips the sign of |w⟩ again, reflecting the vector across the horizontal axis from +62.1° to -62.1°.",
      targetProb: 0.783,
      amplitude: -0.885,
      type: "reversal" as const,
      stage: "Iter 2 • Phase Reversal",
    },
    {
      id: 4,
      title: "Iteration 2: Diffusion Amplification (Optimal Peak)",
      angleRad: initialHalfThetaRad + 2 * thetaRad, // 20.7° + 82.8° = 103.5°
      prevAngleRad: -(initialHalfThetaRad + thetaRad),
      desc: "AMPLIFICATION: Diffusion reflects across |ψ₀⟩ (+20.7°), adding another +41.4°. The angle reaches 103.5° (just 13.5° past 90°)! Target probability peaks at 94.5% (optimal stop for N=8)!",
      targetProb: 0.945,
      amplitude: 0.972,
      type: "amplification" as const,
      stage: "Iter 2 • Optimal Peak (94.5%)",
    },
    {
      id: 5,
      title: "Iteration 3: Over-rotation / Overcooking Warning",
      angleRad: initialHalfThetaRad + 3 * thetaRad, // 103.5° + 41.4° = 144.9°
      prevAngleRad: initialHalfThetaRad + 2 * thetaRad,
      desc: "CAUTION: Applying a 3rd iteration rotates the vector further away from |w⟩ to 144.9°. Probability plunges back down to 33.3%! This demonstrates why Grover iterations must stop at ⌊(π/4)√N⌋.",
      targetProb: 0.333,
      amplitude: 0.577,
      type: "warning" as const,
      stage: "Over-rotation Warning",
    },
  ];

  const steps = qubitMode === 2 ? steps2Q : steps3Q;
  const activeStepData = steps[Math.min(currentStep, steps.length - 1)];

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // Canvas drawing loop
  useEffect(() => {
    let animId: number;
    const targetAngle = activeStepData.angleRad;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Smooth interpolation toward target angle
      animAngleRef.current += (targetAngle - animAngleRef.current) * 0.15;

      const dpr = window.devicePixelRatio || 1;
      const width = 380;
      const height = 360;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Coordinate center
      const originX = 120;
      const originY = 200;
      const radius = 135;

      // 1. Light background unit circle sector
      ctx.fillStyle = "rgba(236, 253, 245, 0.55)";
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.arc(originX, originY, radius, -Math.PI / 2 - 0.5, Math.PI / 2 + 0.3);
      ctx.closePath();
      ctx.fill();

      // Unit circle boundary
      ctx.beginPath();
      ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.arc(originX, originY, radius, -Math.PI / 2 - 0.5, Math.PI / 2 + 0.3);
      ctx.stroke();

      // 2. Axes
      // Horizontal Axis: |w^⊥⟩ (All Non-target States)
      const isReversalStep = activeStepData.type === "reversal";
      ctx.beginPath();
      ctx.strokeStyle = isReversalStep ? "#f59e0b" : "#475569"; // Highlight in amber during reversal!
      ctx.lineWidth = isReversalStep ? 2.8 : 2;
      ctx.moveTo(originX - 40, originY);
      ctx.lineTo(originX + radius + 40, originY);
      ctx.stroke();

      // Horizontal Arrow
      ctx.beginPath();
      ctx.fillStyle = isReversalStep ? "#d97706" : "#475569";
      ctx.moveTo(originX + radius + 45, originY);
      ctx.lineTo(originX + radius + 35, originY - 5);
      ctx.lineTo(originX + radius + 35, originY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillStyle = isReversalStep ? "#b45309" : "#1e293b";
      ctx.fillText("|w^⊥⟩ (Non-target)", originX + radius - 75, originY + 18);

      if (isReversalStep) {
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#d97706";
        ctx.fillText("▲ Reflection Line (Ow)", originX + 25, originY - 8);
      }

      // Vertical Axis: |w⟩ (Marked Target State)
      ctx.beginPath();
      ctx.strokeStyle = "#059669"; // emerald-600
      ctx.lineWidth = 2.2;
      ctx.moveTo(originX, originY + 120);
      ctx.lineTo(originX, originY - radius - 25);
      ctx.stroke();

      // Vertical Arrow
      ctx.beginPath();
      ctx.fillStyle = "#059669";
      ctx.moveTo(originX, originY - radius - 30);
      ctx.lineTo(originX - 5, originY - radius - 20);
      ctx.lineTo(originX + 5, originY - radius - 20);
      ctx.closePath();
      ctx.fill();

      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillStyle = "#065f46";
      ctx.fillText("|w⟩ (Target State)", originX - 45, originY - radius - 15);

      // 3. Initial Superposition Reference Line |ψ₀⟩
      const isAmplificationStep = activeStepData.type === "amplification";
      const initX = originX + radius * Math.cos(-initialHalfThetaRad);
      const initY = originY + radius * Math.sin(-initialHalfThetaRad);

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isAmplificationStep ? "#059669" : "rgba(100, 116, 139, 0.7)";
      ctx.lineWidth = isAmplificationStep ? 2.4 : 1.5;
      ctx.moveTo(originX, originY);
      ctx.lineTo(initX, initY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "bold 10px monospace";
      ctx.fillStyle = isAmplificationStep ? "#047857" : "#64748b";
      ctx.fillText("|ψ₀⟩", initX + 6, initY - 2);

      if (isAmplificationStep) {
        ctx.fillStyle = "#047857";
        ctx.fillText("▲ Diffusion Reflection Axis", initX - 70, initY - 14);
      }

      // 4. Ghost vector showing previous state before reflection
      if (activeStepData.prevAngleRad !== null) {
        const prevRad = activeStepData.prevAngleRad;
        const prevX = originX + radius * Math.cos(-prevRad);
        const prevY = originY + radius * Math.sin(-prevRad);

        ctx.beginPath();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
        ctx.lineWidth = 1.8;
        ctx.moveTo(originX, originY);
        ctx.lineTo(prevX, prevY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = "10px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("prev", prevX + 6, prevY - 2);
      }

      // 5. Current Rotating State Vector |ψ⟩
      const currentRad = animAngleRef.current;
      const vx = originX + radius * Math.cos(-currentRad);
      const vy = originY + radius * Math.sin(-currentRad);

      // Angle arc
      if (Math.abs(currentRad) > 0.04) {
        ctx.beginPath();
        ctx.strokeStyle = currentRad >= 0 ? "rgba(5, 150, 105, 0.5)" : "rgba(244, 63, 94, 0.5)";
        ctx.lineWidth = 2;
        const arcRadius = 45;
        if (currentRad >= 0) {
          ctx.arc(originX, originY, arcRadius, 0, -currentRad, true);
        } else {
          ctx.arc(originX, originY, arcRadius, 0, -currentRad, false);
        }
        ctx.stroke();

        const deg = Math.round((currentRad * 180) / Math.PI);
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = currentRad >= 0 ? "#047857" : "#e11d48";
        ctx.fillText(`${deg}°`, originX + arcRadius + 8, originY - (currentRad > 0 ? 12 : -18));
      }

      // Drop lines to axes
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
      ctx.lineWidth = 1;
      ctx.moveTo(vx, vy);
      ctx.lineTo(originX, vy); // to vertical axis
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx, originY); // to horizontal axis
      ctx.stroke();
      ctx.setLineDash([]);

      // Main Vector Line
      ctx.beginPath();
      ctx.strokeStyle =
        activeStepData.type === "reversal"
          ? "#e11d48" // Rose for negative reversed phase
          : activeStepData.type === "warning"
          ? "#ea580c" // Orange for overcooking
          : "#059669"; // Emerald for positive amplitude
      ctx.lineWidth = 3.6;
      ctx.moveTo(originX, originY);
      ctx.lineTo(vx, vy);
      ctx.stroke();

      // Arrowhead
      const vAngle = Math.atan2(vy - originY, vx - originX);
      const arrowSize = 9;
      ctx.beginPath();
      ctx.fillStyle =
        activeStepData.type === "reversal"
          ? "#be123c"
          : activeStepData.type === "warning"
          ? "#c2410c"
          : "#047857";
      ctx.moveTo(vx, vy);
      ctx.lineTo(
        vx - arrowSize * Math.cos(vAngle - Math.PI / 6),
        vy - arrowSize * Math.sin(vAngle - Math.PI / 6)
      );
      ctx.lineTo(
        vx - arrowSize * Math.cos(vAngle + Math.PI / 6),
        vy - arrowSize * Math.sin(vAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Glowing tip bead
      ctx.beginPath();
      ctx.arc(vx, vy, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle =
        activeStepData.type === "reversal"
          ? "#fb7185"
          : activeStepData.type === "warning"
          ? "#fb923c"
          : "#10b981";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // State label
      ctx.font = "bold 12px monospace";
      ctx.fillStyle =
        activeStepData.type === "reversal"
          ? "#881337"
          : activeStepData.type === "warning"
          ? "#7c2d12"
          : "#064e3b";
      ctx.fillText("|ψ⟩", vx + 10, vy - 4);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeStepData, initialHalfThetaRad]);

  const currentDeg = Math.round((activeStepData.angleRad * 180) / Math.PI);
  const probPercent = (activeStepData.targetProb * 100).toFixed(1);

  return (
    <div className={`p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-6 ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-50">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            2D Grover Subspace Geometric Simulation
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            Step-by-Step Reversing & Amplification Dynamics
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Watch each Grover iteration unfold into its two fundamental geometric reflections:
            <strong> 1. Oracle Phase Reversal</strong> across the horizontal axis followed by
            <strong> 2. Diffusion Amplification</strong> across $|ψ₀⟩$.
          </p>
        </div>

        {/* Qubit Space Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
          <button
            onClick={() => {
              setQubitMode(2);
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              qubitMode === 2
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2 Qubits (N=4)
          </button>
          <button
            onClick={() => {
              setQubitMode(3);
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              qubitMode === 3
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            3 Qubits (N=8)
          </button>
        </div>
      </div>

      {/* Main Studio: Canvas + Interactive Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Canvas 2D Rotation Visualization */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/70 border border-emerald-100 relative">
          <canvas
            ref={canvasRef}
            style={{ width: 380, height: 360 }}
            className="rounded-xl select-none"
          />

          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 border border-emerald-100 text-[10px] text-slate-600 font-mono shadow-xs flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Vertical: Target |w⟩</span>
            <span className="text-slate-300">|</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Horizontal: Non-target |w^⊥⟩</span>
          </div>
        </div>

        {/* Right: Step Telemetry & Mathematical Breakdown */}
        <div className="lg:col-span-6 space-y-4">
          {/* Current Stage Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shadow-xs ${
                activeStepData.type === "reversal"
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : activeStepData.type === "amplification"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : activeStepData.type === "warning"
                  ? "bg-orange-50 border-orange-300 text-orange-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              {activeStepData.type === "reversal" ? "↩ " : activeStepData.type === "amplification" ? "▲ " : ""}
              {activeStepData.stage}
            </span>
            <span className="text-xs font-bold text-slate-400">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          <div>
            <h4 className="text-lg font-black text-slate-900 leading-tight">
              {activeStepData.title}
            </h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {activeStepData.desc}
            </p>
          </div>

          {/* Probability & Amplitude Telemetry Box */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-950">Target Probability P(|w⟩) = sin²(θ):</span>
              <span className="text-emerald-800 font-mono text-sm">{probPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeStepData.targetProb >= 0.9
                    ? "bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    : activeStepData.targetProb > 0.5
                    ? "bg-teal-500"
                    : activeStepData.type === "reversal"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
                style={{ width: `${Math.max(5, Math.min(100, activeStepData.targetProb * 100))}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono pt-1">
              <div>
                State Angle: <strong className={currentDeg < 0 ? "text-amber-700" : "text-emerald-800"}>{currentDeg}°</strong>
              </div>
              <div className="text-right">
                Target Amplitude: <strong className={activeStepData.amplitude < 0 ? "text-rose-600" : "text-emerald-800"}>{activeStepData.amplitude >= 0 ? `+${activeStepData.amplitude}` : activeStepData.amplitude}</strong>
              </div>
            </div>
          </div>

          {/* Reflection Mechanics Callout */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
            <div className="text-emerald-800 font-bold flex items-center gap-1">
              <ArrowDownUp className="h-3 w-3" /> Geometric Reflection Rules:
            </div>
            <div className="text-[10px] text-slate-600">
              • <strong>Oracle (Ow)</strong>: Inverts vertical sign: (x, y) → (x, -y) [Angle: α → -α]
            </div>
            <div className="text-[10px] text-slate-600">
              • <strong>Diffusion (D)</strong>: Reflects across |ψ₀⟩: Angle advances by +θ (+{qubitMode === 2 ? "60.0°" : "41.4°"})!
            </div>
          </div>

          {/* Interactive Step Slider & Play Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep((s) => Math.max(0, s - 1));
                }}
                disabled={currentStep === 0}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 cursor-pointer shadow-xs"
                title="Previous Step"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                {isPlaying ? "Pause" : "Auto Play"}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep((s) => Math.min(steps.length - 1, s + 1));
                }}
                disabled={currentStep === steps.length - 1}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 cursor-pointer shadow-xs"
                title="Next Step"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep(0);
                }}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer shadow-xs"
                title="Reset to Step 0"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Step Buttons */}
            <div className="flex items-center gap-1">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep(idx);
                  }}
                  className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    currentStep === idx
                      ? s.type === "reversal"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                  title={s.title}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
