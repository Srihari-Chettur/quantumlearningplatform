import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SIH 2026 — Interactive Quantum Algorithm Learning Platform",
  description: "Learn quantum computing by building and simulating circuits interactively with Qiskit Aer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-white/10 bg-slate-950/50 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>SIH 2026 — AI-Based Interactive Quantum Algorithm Learning Platform</div>
            <div className="text-slate-400 font-mono text-[11px]">Powered by FastAPI + Qiskit Aer + Next.js</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
