"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { checkBackendHealth } from "@/lib/api/simulation";
import {
  Atom,
  BookOpen,
  Cpu,
  Sparkles,
  Menu,
  X,
  Terminal,
  Trophy,
  ClipboardCheck,
  LayoutDashboard,
  Bot
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const isHealthy = await checkBackendHealth();
      if (mounted) setBackendOnline(isHealthy);
    };

    check();
    const interval = setInterval(check, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Home", icon: Atom },
    { href: "/lessons/gates", label: "Gates", icon: BookOpen },
    { href: "/circuit-lab", label: "Circuit Lab", icon: Cpu },
    { href: "/code-lab", label: "Code Lab", icon: Terminal },
    { href: "/lessons/grover", label: "Grover", icon: Sparkles },
    { href: "/challenges", label: "Challenges", icon: Trophy },
    { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/ai-tutor", label: "AI Tutor", icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-100/80 bg-white/85 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-500/15 group-hover:scale-105 transition-transform">
            <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center">
              <Atom className="h-5 w-5 text-emerald-600 animate-spin-slow" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">QuantumLab</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                SIH 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block">Interactive Quantum Learning</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 font-semibold shadow-xs border border-emerald-100"
                    : "text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Backend Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline === true
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                : backendOnline === false
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <span className="text-emerald-900 font-mono text-[11px] font-medium">
            {backendOnline === true
              ? "Qiskit Aer Online"
              : backendOnline === false
              ? "Simulator Offline"
              : "Checking Aer..."}
          </span>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-emerald-100 bg-white/98 px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-5 w-5 text-emerald-600" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 flex items-center gap-2 text-xs text-slate-600 px-3">
            <span
              className={`h-2 w-2 rounded-full ${
                backendOnline ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span>{backendOnline ? "Aer Simulator Ready" : "FastAPI Backend Offline"}</span>
          </div>
        </div>
      )}
    </header>
  );
}
