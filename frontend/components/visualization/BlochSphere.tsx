"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { RotateCcw, ZoomIn, ZoomOut, Compass } from "lucide-react";

export interface BlochState {
  name?: string;
  theta: number; // Polar angle in radians [0, PI]
  phi: number;   // Azimuthal angle in radians [0, 2*PI)
}

export const BLOCH_PRESETS: Record<string, BlochState> = {
  "|0⟩": { name: "|0⟩ (Ground)", theta: 0, phi: 0 },
  "|1⟩": { name: "|1⟩ (Excited)", theta: Math.PI, phi: 0 },
  "|+⟩": { name: "|+⟩ (Superposition)", theta: Math.PI / 2, phi: 0 },
  "|-⟩": { name: "|-⟩ (Minus Phase)", theta: Math.PI / 2, phi: Math.PI },
  "|+i⟩": { name: "|+i⟩ (Circular Y+)", theta: Math.PI / 2, phi: Math.PI / 2 },
  "|-i⟩": { name: "|-i⟩ (Circular Y-)", theta: Math.PI / 2, phi: (3 * Math.PI) / 2 },
};

interface BlochSphereProps {
  state?: BlochState;
  onStateChange?: (state: BlochState) => void;
  title?: string;
  interactive?: boolean;
  showPresets?: boolean;
  showCoordinates?: boolean;
  size?: number; // Canvas display size (px)
  className?: string;
}

export function BlochSphere({
  state = BLOCH_PRESETS["|0⟩"],
  onStateChange,
  title = "Bloch Sphere",
  interactive = true,
  showPresets = true,
  showCoordinates = true,
  size = 340,
  className = "",
}: BlochSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera angles in radians
  const [yaw, setYaw] = useState<number>(-0.65);  // Azimuth orbit
  const [pitch, setPitch] = useState<number>(0.35); // Elevation orbit
  const [zoom, setZoom] = useState<number>(1.0);

  // Smooth animation interpolation for theta & phi
  const currentThetaRef = useRef<number>(state.theta);
  const currentPhiRef = useRef<number>(state.phi);
  const targetThetaRef = useRef<number>(state.theta);
  const targetPhiRef = useRef<number>(state.phi);

  useEffect(() => {
    targetThetaRef.current = state.theta;
    targetPhiRef.current = state.phi;
  }, [state.theta, state.phi]);

  // Mouse / touch drag state
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setYaw((prev) => prev + dx * 0.012);
    setPitch((prev) => Math.max(-1.4, Math.min(1.4, prev + dy * 0.012)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch handlers for mobile/tablet
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePosRef.current.x;
    const dy = e.touches[0].clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    setYaw((prev) => prev + dx * 0.012);
    setPitch((prev) => Math.max(-1.4, Math.min(1.4, prev + dy * 0.012)));
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.7, Math.min(1.8, prev - e.deltaY * 0.001)));
  };

  const resetCamera = () => {
    setYaw(-0.65);
    setPitch(0.35);
    setZoom(1.0);
  };

  // 3D vector rotation and 2D projection
  const projectPoint = useCallback(
    (x: number, y: number, z: number, sphereRadius: number, cx: number, cy: number) => {
      // 1. Rotate around Z axis (Yaw)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x1 = x * cosY - y * sinY;
      const y1 = x * sinY + y * cosY;
      const z1 = z;

      // 2. Rotate around tilted X axis (Pitch)
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const x2 = x1;
      const y2 = y1 * cosP - z1 * sinP;
      const z2 = y1 * sinP + z1 * cosP;

      // 3. Project to canvas coordinates (Z-up, Y into screen, X right)
      const scale = sphereRadius * zoom;
      const u = cx + x2 * scale;
      const v = cy - z2 * scale;

      return { u, v, depth: y2 };
    },
    [yaw, pitch, zoom]
  );

  // Main rendering loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Smoothly interpolate current angles toward target
      const lerpSpeed = 0.15;
      currentThetaRef.current += (targetThetaRef.current - currentThetaRef.current) * lerpSpeed;

      // Ensure shortest angular interpolation for phi
      let phiDiff = targetPhiRef.current - currentPhiRef.current;
      while (phiDiff < -Math.PI) phiDiff += 2 * Math.PI;
      while (phiDiff > Math.PI) phiDiff -= 2 * Math.PI;
      currentPhiRef.current += phiDiff * lerpSpeed;

      const dpr = window.devicePixelRatio || 1;
      const w = size;
      const h = size;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const radius = (Math.min(w, h) / 2) * 0.72;

      // 1. Draw subtle background glow & sphere silhouette
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.05);
      grad.addColorStop(0, "rgba(236, 253, 245, 0.95)"); // light emerald-50
      grad.addColorStop(0.7, "rgba(209, 250, 229, 0.5)"); // emerald-100
      grad.addColorStop(1, "rgba(167, 243, 208, 0.2)");  // emerald-200
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * zoom, 0, 2 * Math.PI);
      ctx.fill();

      // Sphere outline
      ctx.strokeStyle = "rgba(16, 185, 129, 0.35)"; // emerald-500
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Helper function to draw projected 3D wireframe rings
      const drawRing = (
        getPoint: (t: number) => [number, number, number],
        color: string,
        lineW: number,
        isDashed = false
      ) => {
        ctx.beginPath();
        if (isDashed) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;

        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * 2 * Math.PI;
          const [x, y, z] = getPoint(t);
          const p = projectPoint(x, y, z, radius, cx, cy);
          if (i === 0) ctx.moveTo(p.u, p.v);
          else ctx.lineTo(p.u, p.v);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // 2. Wireframe circles
      // Equator (XY plane, z = 0) in emerald
      drawRing((t) => [Math.cos(t), Math.sin(t), 0], "rgba(5, 150, 105, 0.55)", 1.6);

      // Prime Meridian (XZ plane, y = 0)
      drawRing((t) => [Math.cos(t), 0, Math.sin(t)], "rgba(16, 185, 129, 0.3)", 1.2, true);

      // YZ Meridian (x = 0)
      drawRing((t) => [0, Math.cos(t), Math.sin(t)], "rgba(16, 185, 129, 0.2)", 1.0, true);

      // 3. Coordinate Axes
      const drawAxis = (
        start: [number, number, number],
        end: [number, number, number],
        color: string,
        label: string,
        labelOffset = { x: 0, y: 0 }
      ) => {
        const p1 = projectPoint(start[0], start[1], start[2], radius, cx, cy);
        const p2 = projectPoint(end[0], end[1], end[2], radius, cx, cy);

        // Axis line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.moveTo(p1.u, p1.v);
        ctx.lineTo(p2.u, p2.v);
        ctx.stroke();

        // Arrow head on positive end
        const angle = Math.atan2(p2.v - p1.v, p2.u - p1.u);
        const arrowSize = 6;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(p2.u, p2.v);
        ctx.lineTo(
          p2.u - arrowSize * Math.cos(angle - Math.PI / 6),
          p2.v - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          p2.u - arrowSize * Math.cos(angle + Math.PI / 6),
          p2.v - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = color;
        ctx.fillText(label, p2.u + labelOffset.x, p2.v + labelOffset.y);
      };

      // X-Axis (Red/Rose)
      drawAxis([-1.2, 0, 0], [1.25, 0, 0], "#e11d48", "+X |+⟩", { x: 6, y: 4 });
      // Y-Axis (Teal/Emerald)
      drawAxis([0, -1.2, 0], [0, 1.25, 0], "#0d9488", "+Y |+i⟩", { x: 6, y: -4 });
      // Z-Axis (Blue/Indigo, Up is |0⟩)
      drawAxis([0, 0, -1.2], [0, 0, 1.3], "#0284c7", "+Z |0⟩", { x: -20, y: -8 });

      // Label south pole |-1⟩
      const southP = projectPoint(0, 0, -1.05, radius, cx, cy);
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#0284c7";
      ctx.fillText("-Z |1⟩", southP.u - 15, southP.v + 15);

      // Label negative X |-⟩
      const negXP = projectPoint(-1.15, 0, 0, radius, cx, cy);
      ctx.fillStyle = "#e11d48";
      ctx.fillText("-X |-⟩", negXP.u - 36, negXP.v + 4);

      // 4. Current State Vector (|ψ⟩)
      const theta = currentThetaRef.current;
      const phi = currentPhiRef.current;

      const sx = Math.sin(theta) * Math.cos(phi);
      const sy = Math.sin(theta) * Math.sin(phi);
      const sz = Math.cos(theta);

      const centerP = projectPoint(0, 0, 0, radius, cx, cy);
      const stateP = projectPoint(sx, sy, sz, radius, cx, cy);

      // Draw projection drop lines to equator plane
      const projEquator = projectPoint(sx, sy, 0, radius, cx, cy);
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.45)"; // slate-400
      ctx.lineWidth = 1.2;
      ctx.moveTo(stateP.u, stateP.v);
      ctx.lineTo(projEquator.u, projEquator.v);
      ctx.lineTo(centerP.u, centerP.v);
      ctx.stroke();
      ctx.setLineDash([]);

      // State vector line (Vibrant Emerald)
      ctx.beginPath();
      ctx.strokeStyle = "#059669"; // emerald-600
      ctx.lineWidth = 3.5;
      ctx.moveTo(centerP.u, centerP.v);
      ctx.lineTo(stateP.u, stateP.v);
      ctx.stroke();

      // State vector arrowhead
      const vAngle = Math.atan2(stateP.v - centerP.v, stateP.u - centerP.u);
      const vArrow = 10;
      ctx.beginPath();
      ctx.fillStyle = "#047857";
      ctx.moveTo(stateP.u, stateP.v);
      ctx.lineTo(
        stateP.u - vArrow * Math.cos(vAngle - Math.PI / 6),
        stateP.v - vArrow * Math.sin(vAngle - Math.PI / 6)
      );
      ctx.lineTo(
        stateP.u - vArrow * Math.cos(vAngle + Math.PI / 6),
        stateP.v - vArrow * Math.sin(vAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // State tip glowing bead
      ctx.beginPath();
      ctx.arc(stateP.u, stateP.v, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // State Label badge
      const labelText = state.name ? state.name.split(" ")[0] : "|ψ⟩";
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = "#064e3b";
      ctx.fillText(labelText, stateP.u + 10, stateP.v - 10);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [projectPoint, size, state.name, zoom]);

  // Compute Ket Equation coefficients for state formula
  const cosHalfTheta = Math.cos(state.theta / 2).toFixed(3);
  const sinHalfTheta = Math.sin(state.theta / 2).toFixed(3);
  const phiDeg = Math.round((state.phi * 180) / Math.PI);

  return (
    <div
      className={`relative flex flex-col items-center bg-white/95 rounded-2xl border border-emerald-100 shadow-sm p-5 text-slate-800 backdrop-blur-sm ${className}`}
    >
      {/* Top Header */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-emerald-50">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">{title}</h4>
            <p className="text-[11px] text-emerald-700 font-medium">Single-Qubit State Vector Space</p>
          </div>
        </div>

        {/* Orbit & Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
          <button
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={resetCamera}
            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded transition-colors cursor-pointer"
            title="Reset Camera Orientation"
            aria-label="Reset camera"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive 3D Canvas */}
      <div className="relative my-2 cursor-grab active:cursor-grabbing select-none">
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="rounded-xl touch-none"
        />

        {/* Floating helper hint */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-white/80 border border-emerald-100 text-[10px] text-slate-500 font-medium pointer-events-none shadow-xs">
          Drag to orbit • Scroll to zoom
        </div>
      </div>

      {/* Mathematical State Formula Display */}
      {showCoordinates && (
        <div className="w-full mt-2 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center font-mono text-xs">
          <div className="font-bold text-emerald-950 text-sm">
            |ψ⟩ = {cosHalfTheta}|0⟩ + e^{`{i(${phiDeg}°)}`}·{sinHalfTheta}|1⟩
          </div>
          <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-emerald-800">
            <span>
              Polar angle θ = <strong>{(state.theta / Math.PI).toFixed(2)}π</strong> (
              {Math.round((state.theta * 180) / Math.PI)}°)
            </span>
            <span>
              Phase φ = <strong>{(state.phi / Math.PI).toFixed(2)}π</strong> ({phiDeg}°)
            </span>
          </div>
        </div>
      )}

      {/* Basis State Preset Buttons */}
      {showPresets && interactive && (
        <div className="w-full mt-4 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
            Educational Basis States:
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {Object.entries(BLOCH_PRESETS).map(([key, preset]) => {
              const isSelected =
                Math.abs(state.theta - preset.theta) < 0.05 &&
                Math.abs(state.phi - preset.phi) < 0.05;

              return (
                <button
                  key={key}
                  onClick={() => onStateChange?.(preset)}
                  className={`py-1.5 px-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-sm scale-102"
                      : "bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 text-slate-700 hover:text-emerald-900"
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
