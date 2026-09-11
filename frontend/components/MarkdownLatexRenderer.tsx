"use client";

import React, { useState, useMemo } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownLatexRendererProps {
  content: string;
  isUser?: boolean;
  className?: string;
}

declare global {
  interface Window {
    katex?: {
      renderToString: (tex: string, options?: { displayMode?: boolean; throwOnError?: boolean }) => string;
    };
  }
}

/**
 * Renders a code block with language header and copy-to-clipboard functionality.
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="uppercase tracking-wider font-semibold text-emerald-400">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-xs sm:text-[13px] font-mono overflow-x-auto leading-relaxed text-emerald-100/90 bg-slate-950">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Mathematical LaTeX parser with KaTeX support and pure-React fallback.
 */
function MathExpression({ math, displayMode }: { math: string; displayMode: boolean }) {
  const katexHtml = useMemo(() => {
    if (typeof window !== "undefined" && window.katex) {
      try {
        return window.katex.renderToString(math.trim(), {
          displayMode,
          throwOnError: false,
        });
      } catch {
        return null;
      }
    }
    return null;
  }, [math, displayMode]);

  if (katexHtml) {
    return (
      <span
        className={displayMode ? "block my-2 text-center overflow-x-auto py-1" : "inline-block mx-0.5"}
        dangerouslySetInnerHTML={{ __html: katexHtml }}
      />
    );
  }

  return (
    <span
      className={displayMode ? "block my-2 text-center overflow-x-auto py-1" : "inline-block mx-0.5"}
    >
      <FallbackMath math={math} displayMode={displayMode} />
    </span>
  );
}

/**
 * Formats LaTeX mathematical syntax into readable mathematical HTML.
 */
function FallbackMath({ math, displayMode }: { math: string; displayMode: boolean }) {
  // Parse fractions: \frac{a}{b}
  const formatFraction = (expr: string): React.ReactNode => {
    const fracRegex = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = fracRegex.exec(expr)) !== null) {
      if (match.index > lastIndex) {
        parts.push(formatSymbols(expr.slice(lastIndex, match.index)));
      }
      const num = match[1];
      const den = match[2];
      parts.push(
        <span
          key={match.index}
          className="inline-flex flex-col items-center align-middle mx-1 text-[0.88em] leading-none"
        >
          <span className="border-b border-current pb-0.5 px-0.5 text-center font-medium">
            {formatSymbols(num)}
          </span>
          <span className="pt-0.5 px-0.5 text-center font-medium">
            {formatSymbols(den)}
          </span>
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < expr.length) {
      parts.push(formatSymbols(expr.slice(lastIndex)));
    }

    return parts.length === 0 ? formatSymbols(expr) : parts;
  };

  // Replace common LaTeX symbols, Dirac bra-kets, Greek letters, and operators
  const formatSymbols = (text: string): React.ReactNode => {
    let s = text;

    // Dirac notation
    s = s.replace(/\|0\\rangle/g, "|0⟩");
    s = s.replace(/\|1\\rangle/g, "|1⟩");
    s = s.replace(/\|\\psi\\rangle/g, "|ψ⟩");
    s = s.replace(/\|\\phi\\rangle/g, "|φ⟩");
    s = s.replace(/\|\\Phi\^\\\+\\rangle/g, "|Φ⁺⟩");
    s = s.replace(/\|\\Phi\^\\-\\rangle/g, "|Φ⁻⟩");
    s = s.replace(/\|\\Psi\^\\\+\\rangle/g, "|Ψ⁺⟩");
    s = s.replace(/\|\\Psi\^\\-\\rangle/g, "|Ψ⁻⟩");
    s = s.replace(/\\rangle/g, "⟩");
    s = s.replace(/\\langle/g, "⟨");

    // Square root
    s = s.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");
    s = s.replace(/\\sqrt\s*(\d+)/g, "√$1");

    // Greek letters
    s = s.replace(/\\alpha/g, "α");
    s = s.replace(/\\beta/g, "β");
    s = s.replace(/\\gamma/g, "γ");
    s = s.replace(/\\delta/g, "δ");
    s = s.replace(/\\epsilon/g, "ε");
    s = s.replace(/\\theta/g, "θ");
    s = s.replace(/\\lambda/g, "λ");
    s = s.replace(/\\pi/g, "π");
    s = s.replace(/\\sigma/g, "σ");
    s = s.replace(/\\phi/g, "φ");
    s = s.replace(/\\psi/g, "ψ");
    s = s.replace(/\\omega/g, "ω");
    s = s.replace(/\\Phi/g, "Φ");
    s = s.replace(/\\Psi/g, "Ψ");
    s = s.replace(/\\Omega/g, "Ω");

    // Operators
    s = s.replace(/\\otimes/g, " ⊗ ");
    s = s.replace(/\\oplus/g, " ⊕ ");
    s = s.replace(/\\dagger/g, "†");
    s = s.replace(/\\approx/g, " ≈ ");
    s = s.replace(/\\neq/g, " ≠ ");
    s = s.replace(/\\le/g, " ≤ ");
    s = s.replace(/\\ge/g, " ≥ ");
    s = s.replace(/\\pm/g, " ± ");
    s = s.replace(/\\cdot/g, " · ");
    s = s.replace(/\\times/g, " × ");
    s = s.replace(/\\sum/g, "∑");
    s = s.replace(/\\to|\\rightarrow/g, " → ");
    s = s.replace(/\\infty/g, "∞");
    s = s.replace(/\\quad/g, "  ");
    s = s.replace(/\\,/g, " ");

    // Parse superscripts and subscripts
    const tokenRegex = /(\^\{[^}]+\}|\^[0-9a-zA-Z\+\-]+|_\{[^}]+\}|_[0-9a-zA-Z])/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = tokenRegex.exec(s)) !== null) {
      if (m.index > last) {
        parts.push(s.slice(last, m.index));
      }
      const tok = m[0];
      if (tok.startsWith("^")) {
        const val = tok.startsWith("^{") ? tok.slice(2, -1) : tok.slice(1);
        parts.push(<sup key={m.index} className="text-[0.8em]">{val}</sup>);
      } else if (tok.startsWith("_")) {
        const val = tok.startsWith("_{") ? tok.slice(2, -1) : tok.slice(1);
        parts.push(<sub key={m.index} className="text-[0.8em]">{val}</sub>);
      }
      last = m.index + tok.length;
    }

    if (last < s.length) {
      parts.push(s.slice(last));
    }

    return parts.length === 0 ? s : parts;
  };

  const content = formatFraction(math.trim());

  if (displayMode) {
    return (
      <div className="my-2.5 p-2 bg-emerald-50/40 border border-emerald-100/60 rounded-xl text-center font-serif text-sm sm:text-base text-slate-800 overflow-x-auto shadow-2xs">
        {content}
      </div>
    );
  }

  return (
    <span className="inline-block px-1 py-0.2 mx-0.5 rounded bg-emerald-50/60 text-emerald-950 font-serif font-medium text-[0.95em]">
      {content}
    </span>
  );
}

/**
 * Parses inline text for bold, italic, code, links, and LaTeX math.
 */
function renderInlineText(text: string, isUser = false): React.ReactNode[] {
  // Tokenize for:
  // 1. Math block: $$...$$ or \[...\]
  // 2. Inline math: $...$ or \(...\)
  // 3. Inline code: `...`
  // 4. Bold: **...** or __...__
  // 5. Italic: *...* or _..._
  // 6. Links: [text](url)

  const tokenRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]+?\$|\\\([\s\S]*?\\\)|\`[^`]+?\`|\*\*[^*]+?\*\*|\*[^*]+?\*|\[[^\]]+\]\([^)]+\))/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `inline_${match.index}`;

    if (token.startsWith("$$") && token.endsWith("$$")) {
      const math = token.slice(2, -2);
      elements.push(<MathExpression key={key} math={math} displayMode={true} />);
    } else if (token.startsWith("\\[") && token.endsWith("\\]")) {
      const math = token.slice(2, -2);
      elements.push(<MathExpression key={key} math={math} displayMode={true} />);
    } else if (token.startsWith("$") && token.endsWith("$")) {
      const math = token.slice(1, -1);
      elements.push(<MathExpression key={key} math={math} displayMode={false} />);
    } else if (token.startsWith("\\(") && token.endsWith("\\)")) {
      const math = token.slice(2, -2);
      elements.push(<MathExpression key={key} math={math} displayMode={false} />);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const code = token.slice(1, -1);
      elements.push(
        <code
          key={key}
          className={`px-1.5 py-0.5 rounded text-[12px] font-mono ${
            isUser
              ? "bg-emerald-700/60 text-white"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
          }`}
        >
          {code}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      const inner = token.slice(2, -2);
      elements.push(
        <strong key={key} className={isUser ? "font-bold text-white" : "font-bold text-slate-900"}>
          {inner}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const inner = token.slice(1, -1);
      elements.push(<em key={key} className="italic">{inner}</em>);
    } else if (token.startsWith("[") && token.includes("](")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-600 underline font-medium hover:text-emerald-700"
          >
            {linkMatch[1]}
          </a>
        );
      }
    } else {
      elements.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length === 0 ? [text] : elements;
}

/**
 * Complete Markdown + LaTeX component for rendering educational content.
 */
export function MarkdownLatexRenderer({
  content,
  isUser = false,
  className = "",
}: MarkdownLatexRendererProps) {
  const blocks = useMemo(() => {
    if (!content) return [];

    const lines = content.split("\n");
    const parsedBlocks: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = "";
    let codeBuffer: string[] = [];
    let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
    let quoteBuffer: string[] = [];

    const flushList = () => {
      if (!listBuffer) return;
      if (listBuffer.type === "ul") {
        parsedBlocks.push(
          <ul key={`ul_${parsedBlocks.length}`} className="my-2 space-y-1 pl-4 list-disc text-slate-700">
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed pl-0.5">
                {renderInlineText(item, isUser)}
              </li>
            ))}
          </ul>
        );
      } else {
        parsedBlocks.push(
          <ol key={`ol_${parsedBlocks.length}`} className="my-2 space-y-1 pl-4 list-decimal text-slate-700">
            {listBuffer.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed pl-0.5">
                {renderInlineText(item, isUser)}
              </li>
            ))}
          </ol>
        );
      }
      listBuffer = null;
    };

    const flushQuote = () => {
      if (quoteBuffer.length === 0) return;
      parsedBlocks.push(
        <blockquote
          key={`quote_${parsedBlocks.length}`}
          className="border-l-3 border-emerald-500 bg-emerald-50/50 pl-3 py-1.5 my-2 rounded-r-lg text-slate-700 italic text-xs sm:text-sm"
        >
          {quoteBuffer.map((q, idx) => (
            <p key={idx}>{renderInlineText(q, isUser)}</p>
          ))}
        </blockquote>
      );
      quoteBuffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Fenced Code Block handling
      if (trimmed.startsWith("```")) {
        if (inCodeBlock) {
          // Closing fence
          parsedBlocks.push(
            <CodeBlock
              key={`code_${parsedBlocks.length}`}
              code={codeBuffer.join("\n")}
              language={codeLanguage}
            />
          );
          codeBuffer = [];
          inCodeBlock = false;
          codeLanguage = "";
        } else {
          // Opening fence
          flushList();
          flushQuote();
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Display math blocks $$ ... $$
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
        flushList();
        flushQuote();
        const math = trimmed.slice(2, -2);
        parsedBlocks.push(
          <MathExpression key={`math_${parsedBlocks.length}`} math={math} displayMode={true} />
        );
        continue;
      }

      // Headings
      if (trimmed.startsWith("# ")) {
        flushList();
        flushQuote();
        parsedBlocks.push(
          <h1
            key={`h1_${parsedBlocks.length}`}
            className="text-base sm:text-lg font-bold text-slate-900 border-b border-emerald-100 pb-1 mt-3 mb-1.5"
          >
            {renderInlineText(trimmed.slice(2), isUser)}
          </h1>
        );
        continue;
      }

      if (trimmed.startsWith("## ")) {
        flushList();
        flushQuote();
        parsedBlocks.push(
          <h2
            key={`h2_${parsedBlocks.length}`}
            className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-0.5 mt-2.5 mb-1"
          >
            {renderInlineText(trimmed.slice(3), isUser)}
          </h2>
        );
        continue;
      }

      if (trimmed.startsWith("### ")) {
        flushList();
        flushQuote();
        parsedBlocks.push(
          <h3
            key={`h3_${parsedBlocks.length}`}
            className="text-xs sm:text-sm font-bold text-slate-800 mt-2 mb-0.5"
          >
            {renderInlineText(trimmed.slice(4), isUser)}
          </h3>
        );
        continue;
      }

      // Blockquotes
      if (trimmed.startsWith("> ")) {
        flushList();
        quoteBuffer.push(trimmed.slice(2));
        continue;
      } else if (quoteBuffer.length > 0) {
        flushQuote();
      }

      // Horizontal rules
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        flushList();
        parsedBlocks.push(<hr key={`hr_${parsedBlocks.length}`} className="my-3 border-slate-200" />);
        continue;
      }

      // Unordered list items: - or *
      if (/^[-*]\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^[-*]\s+/, "");
        if (!listBuffer || listBuffer.type !== "ul") {
          flushList();
          listBuffer = { type: "ul", items: [itemText] };
        } else {
          listBuffer.items.push(itemText);
        }
        continue;
      }

      // Ordered list items: 1. 2. etc.
      if (/^\d+\.\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s+/, "");
        if (!listBuffer || listBuffer.type !== "ol") {
          flushList();
          listBuffer = { type: "ol", items: [itemText] };
        } else {
          listBuffer.items.push(itemText);
        }
        continue;
      }

      // Blank line -> flush active list/quote
      if (trimmed === "") {
        flushList();
        flushQuote();
        continue;
      }

      // Standard paragraph
      flushList();
      parsedBlocks.push(
        <p key={`p_${parsedBlocks.length}`} className="leading-relaxed my-1">
          {renderInlineText(line, isUser)}
        </p>
      );
    }

    // Flush any remaining buffers
    if (inCodeBlock && codeBuffer.length > 0) {
      parsedBlocks.push(
        <CodeBlock
          key={`code_${parsedBlocks.length}`}
          code={codeBuffer.join("\n")}
          language={codeLanguage}
        />
      );
    }
    flushList();
    flushQuote();

    return parsedBlocks;
  }, [content, isUser]);

  if (!content || typeof content !== "string" || !content.trim()) {
    return null;
  }

  return (
    <div className={`leading-relaxed text-xs sm:text-sm font-sans ${className}`}>
      {blocks.length > 0 ? (
        blocks
      ) : (
        <p className="whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}
