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
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-slate-50/50 text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900 relative">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none" />
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-emerald-100/80 bg-white/70 backdrop-blur-sm py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-800">SIH 2026</span>
              <span>— AI-Based Interactive Quantum Algorithm Learning Platform</span>
            </div>
            <div className="text-slate-500 font-mono text-[11px]">Powered by FastAPI + Qiskit Aer + Next.js</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
