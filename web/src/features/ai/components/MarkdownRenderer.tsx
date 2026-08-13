import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  const renderBlocks = (text: string) => {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const parts: { type: "text" | "code"; content: string; language?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", language: match[1] || "", content: match[2].trim() });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return parts.map((part, index) => {
      if (part.type === "code") {
        return <CodeBlock key={index} language={part.language} code={part.content} />;
      }
      return <TextBlock key={index} text={part.content} />;
    });
  };

  return (
    <div className="markdown-content text-sm leading-relaxed text-[#31302e] space-y-2">
      {renderBlocks(content)}
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[#e6e6e6] bg-[#1e1e1e] text-slate-100 shadow-sm font-mono text-xs">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#2d2d2d] border-b border-[#3e3e3e] text-slate-400">
        <span className="text-[11px] font-medium lowercase">{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors text-[11px] font-medium"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TextBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!currentList) return;
    const ListTag = currentList.type === "ul" ? "ul" : "ol";
    const listClass =
      currentList.type === "ul"
        ? "list-disc pl-5 space-y-1.5 my-2 text-[#31302e]"
        : "list-decimal pl-5 space-y-1.5 my-2 text-[#31302e]";
    elements.push(
      <ListTag key={key} className={listClass}>
        {currentList.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {formatInlineText(item)}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList(`list_${idx}`);
      elements.push(<hr key={`hr_${idx}`} className="my-3 border-t border-[#e6e6e6]" />);
      return;
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      flushList(`list_${idx}`);
      elements.push(
        <h1
          key={`h1_${idx}`}
          className="text-lg font-bold text-[#000000] mt-4 mb-2 pb-1 border-b border-[#e6e6e6]"
        >
          {formatInlineText(trimmed.slice(2))}
        </h1>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushList(`list_${idx}`);
      elements.push(
        <h2 key={`h2_${idx}`} className="text-base font-bold text-[#000000] mt-3 mb-1.5">
          {formatInlineText(trimmed.slice(3))}
        </h2>
      );
      return;
    }
    if (trimmed.startsWith("### ")) {
      flushList(`list_${idx}`);
      elements.push(
        <h3 key={`h3_${idx}`} className="text-sm font-bold text-[#0075de] mt-2.5 mb-1">
          {formatInlineText(trimmed.slice(4))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("#### ")) {
      flushList(`list_${idx}`);
      elements.push(
        <h4
          key={`h4_${idx}`}
          className="text-xs font-bold text-[#615d59] uppercase tracking-wider mt-2 mb-1"
        >
          {formatInlineText(trimmed.slice(5))}
        </h4>
      );
      return;
    }

    // Blockquotes
    if (trimmed.startsWith("> ")) {
      flushList(`list_${idx}`);
      elements.push(
        <blockquote
          key={`bq_${idx}`}
          className="border-l-3 border-[#0075de] pl-3 py-1.5 bg-[#f6f5f4] italic text-[#31302e] my-2 rounded-r"
        >
          {formatInlineText(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Unordered List Items (- or * or +)
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList(`list_${idx}`);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[1]);
      return;
    }

    // Ordered List Items (1. or 2.)
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList(`list_${idx}`);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[1]);
      return;
    }

    // Empty Line
    if (!trimmed) {
      flushList(`list_${idx}`);
      return;
    }

    // Paragraph
    flushList(`list_${idx}`);
    elements.push(
      <p key={`p_${idx}`} className="mb-2 last:mb-0 leading-relaxed text-[#31302e]">
        {formatInlineText(line)}
      </p>
    );
  });

  flushList(`list_end`);

  return <>{elements}</>;
};

function formatInlineText(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|__.*?__|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Inline Code
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={i}
          className="font-mono bg-[#f6f5f4] text-[#0075de] text-[12px] px-1.5 py-0.5 rounded border border-[#e6e6e6]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
    ) {
      return (
        <strong key={i} className="font-semibold text-[#000000]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Link [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0075de] hover:underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}
