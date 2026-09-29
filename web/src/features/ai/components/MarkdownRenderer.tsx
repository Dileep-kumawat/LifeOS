import React, { useState, useMemo, createContext, useContext } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";

/**
 * Preprocesses markdown text to handle common LLM formatting quirks before parsing.
 *
 * 1. Code fence preservation: Tracks code fence boundaries (``` or ~~~) so that
 *    code blocks and their internal spacing/pipes are never modified.
 * 2. Collapsing blank lines between table rows: Some LLMs insert empty lines between
 *    markdown table rows, breaking GFM table parsing. This detects blank lines between
 *    lines that begin with '|' (ignoring leading whitespace) and collapses them.
 */
export function preprocessMarkdown(text: string): string {
  if (!text) return "";

  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  let inCodeBlock = false;
  let pendingBlankLines: string[] = [];
  let lastWasTableRow = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for code fence start/end (``` or ~~~)
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      // Flush any pending blanks before code block
      if (pendingBlankLines.length > 0) {
        result.push(...pendingBlankLines);
        pendingBlankLines = [];
      }
      result.push(line);
      lastWasTableRow = false;
      continue;
    }

    // Inside code fences: preserve all lines exactly as they are
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    const isTableRow = trimmed.startsWith("|");

    if (trimmed === "") {
      if (lastWasTableRow) {
        // Collect blank line to see if the next non-blank line is also a table row
        pendingBlankLines.push(line);
      } else {
        result.push(line);
      }
    } else if (isTableRow) {
      if (lastWasTableRow && pendingBlankLines.length > 0) {
        // Collapses blank lines between consecutive table rows
        pendingBlankLines = [];
      } else if (pendingBlankLines.length > 0) {
        // If previous wasn't a table row, flush pending blanks
        result.push(...pendingBlankLines);
        pendingBlankLines = [];
      }
      result.push(line);
      lastWasTableRow = true;
    } else {
      // Non-table, non-blank line: flush any pending blank lines and push line
      if (pendingBlankLines.length > 0) {
        result.push(...pendingBlankLines);
        pendingBlankLines = [];
      }
      result.push(line);
      lastWasTableRow = false;
    }
  }

  // Flush any remaining trailing blank lines
  if (pendingBlankLines.length > 0) {
    result.push(...pendingBlankLines);
  }

  return result.join("\n");
}

/**
 * Recursively extracts plain text from React nodes for clipboard copying.
 */
function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return "";
}

/**
 * Extracts language identifier from code child element's className (e.g. language-typescript -> typescript)
 */
function extractLanguage(children: React.ReactNode): string {
  if (React.isValidElement<{ className?: string }>(children)) {
    const className = children.props?.className;
    if (className) {
      const match = /language-([a-zA-Z0-9_-]+)/.exec(className);
      if (match) return match[1];
    }
  }
  return "code";
}

/** Context to distinguish between inline code and code blocks inside <pre> */
const PreContext = createContext(false);

/**
 * PreBlock renders a code block with language header, copy button, and horizontal scrolling.
 */
const PreBlock: React.FC<React.ComponentPropsWithoutRef<"pre"> & ExtraProps> = ({
  node: _node,
  children,
  className,
  ...props
}) => {
  const [copied, setCopied] = useState(false);

  const codeText = extractText(children).replace(/\n$/, "");
  const language = extractLanguage(children);

  const handleCopy = () => {
    if (!codeText) return;
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group/code relative my-3 rounded-lg overflow-hidden border border-[#e5e5e5] dark:border-neutral-800 bg-[#1e1e1e] text-slate-100 shadow-2xs font-mono text-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#2d2d2d] border-b border-[#3e3e3e] text-slate-400">
        <span className="text-[11px] font-medium lowercase tracking-wide">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors text-[11px] font-medium cursor-pointer"
          title="Copy code"
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
      <pre
        className={clsx(
          "p-3.5 overflow-x-auto leading-relaxed bg-[#1e1e1e] text-slate-100",
          className
        )}
        {...props}
      >
        {children}
      </pre>
    </div>
  );
};

/**
 * Static mapping of HTML elements to custom styled Tailwind components.
 */
const markdownComponents: Components = {
  // Tables: horizontal scroll wrapper, rounded border, shaded header, top-aligned padded cells
  table: ({ node: _node, children, className, ...props }) => (
    <div className="my-3 w-full overflow-x-auto rounded-lg border border-[#e5e5e5] dark:border-neutral-800 shadow-2xs">
      <table
        className={clsx(
          "w-full min-w-[320px] border-collapse text-left text-xs sm:text-sm text-[#0d0d0d] dark:text-neutral-200",
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ node: _node, children, className, ...props }) => (
    <thead
      className={clsx(
        "bg-[#f6f5f4] dark:bg-neutral-800/80 border-b border-[#e5e5e5] dark:border-neutral-800 text-[#0d0d0d] dark:text-neutral-100 font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  ),
  tbody: ({ node: _node, children, className, ...props }) => (
    <tbody
      className={clsx(
        "divide-y divide-[#e5e5e5] dark:divide-neutral-800 bg-white dark:bg-neutral-900",
        className
      )}
      {...props}
    >
      {children}
    </tbody>
  ),
  tr: ({ node: _node, children, className, ...props }) => (
    <tr
      className={clsx(
        "hover:bg-[#fbfbfa] dark:hover:bg-neutral-800/40 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ node: _node, children, className, ...props }) => (
    <th
      className={clsx(
        "px-3.5 py-2.5 sm:px-4 sm:py-3 text-left font-semibold align-top text-[#0d0d0d] dark:text-neutral-100 whitespace-nowrap",
        className
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ node: _node, children, className, ...props }) => (
    <td
      className={clsx(
        "px-3.5 py-2.5 sm:px-4 sm:py-3 align-top leading-relaxed text-[#31302e] dark:text-neutral-300",
        className
      )}
      {...props}
    >
      {children}
    </td>
  ),

  // Paragraphs
  p: ({ node: _node, children, className, ...props }) => (
    <p
      className={clsx(
        "mb-2.5 last:mb-0 leading-relaxed text-[#31302e] dark:text-neutral-200",
        className
      )}
      {...props}
    >
      {children}
    </p>
  ),

  // Lists
  ul: ({ node: _node, children, className, ...props }) => {
    const isTaskList = className?.includes("contains-task-list");
    return (
      <ul
        className={clsx(
          "my-2 space-y-1.5 text-[#31302e] dark:text-neutral-200",
          isTaskList ? "list-none pl-0" : "list-disc pl-5",
          className
        )}
        {...props}
      >
        {children}
      </ul>
    );
  },
  ol: ({ node: _node, children, className, ...props }) => (
    <ol
      className={clsx(
        "my-2 list-decimal pl-5 space-y-1.5 text-[#31302e] dark:text-neutral-200",
        className
      )}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ node: _node, children, className, ...props }) => {
    const isTaskItem = className?.includes("task-list-item");
    return (
      <li
        className={clsx(
          "leading-relaxed",
          isTaskItem && "list-none flex items-start gap-2",
          className
        )}
        {...props}
      >
        {children}
      </li>
    );
  },

  // Task list checkboxes
  input: ({ node: _node, type, checked, className, ...props }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          disabled
          className={clsx(
            "mr-2 mt-1 h-3.5 w-3.5 rounded border-[#d1d5db] dark:border-neutral-600 text-[#0075de] accent-[#0075de] cursor-default shrink-0",
            className
          )}
          {...props}
        />
      );
    }
    return <input type={type} className={className} {...props} />;
  },

  // Strong
  strong: ({ node: _node, children, className, ...props }) => (
    <strong
      className={clsx("font-semibold text-[#0d0d0d] dark:text-white", className)}
      {...props}
    >
      {children}
    </strong>
  ),

  // Links: open in new tab with security attributes
  a: ({ node: _node, href, children, className, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "text-[#0075de] dark:text-[#62aef0] hover:underline font-medium break-all",
        className
      )}
      {...props}
    >
      {children}
    </a>
  ),

  // Pre and Code
  pre: ({ node: _node, children, ...props }) => (
    <PreContext.Provider value={true}>
      <PreBlock {...props}>{children}</PreBlock>
    </PreContext.Provider>
  ),
  code: ({ node: _node, children, className, ...props }) => {
    const isInsidePre = useContext(PreContext);
    if (isInsidePre) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className={clsx(
          "font-mono bg-[#f6f5f4] dark:bg-neutral-800 text-[#0075de] dark:text-[#62aef0] text-[12px] px-1.5 py-0.5 rounded border border-[#e6e6e6] dark:border-neutral-700",
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  },

  // Headings
  h1: ({ node: _node, children, className, ...props }) => (
    <h1
      className={clsx(
        "text-lg font-bold text-[#0d0d0d] dark:text-white mt-4 mb-2 pb-1 border-b border-[#e5e5e5] dark:border-neutral-800",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ node: _node, children, className, ...props }) => (
    <h2
      className={clsx(
        "text-base font-bold text-[#0d0d0d] dark:text-white mt-3 mb-1.5",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node: _node, children, className, ...props }) => (
    <h3
      className={clsx(
        "text-sm font-bold text-[#0075de] dark:text-[#62aef0] mt-2.5 mb-1",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ node: _node, children, className, ...props }) => (
    <h4
      className={clsx(
        "text-xs font-bold text-[#615d59] dark:text-neutral-400 uppercase tracking-wider mt-2 mb-1",
        className
      )}
      {...props}
    >
      {children}
    </h4>
  ),

  // Blockquote
  blockquote: ({ node: _node, children, className, ...props }) => (
    <blockquote
      className={clsx(
        "border-l-3 border-[#0075de] pl-3 py-1.5 bg-[#f6f5f4] dark:bg-neutral-800/50 italic text-[#31302e] dark:text-neutral-300 my-2 rounded-r",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Horizontal Rule
  hr: ({ node: _node, className, ...props }) => (
    <hr
      className={clsx("my-3 border-t border-[#e5e5e5] dark:border-neutral-800", className)}
      {...props}
    />
  )
};

/** Static plugins array to prevent re-creation on renders */
const remarkPlugins = [remarkGfm];

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Safeguard ErrorBoundary to prevent streaming syntax quirks from crashing the UI
 */
class MarkdownErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Markdown rendering error caught by boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface MarkdownRendererProps {
  content: string;
}

/**
 * MarkdownRenderer component using react-markdown and remark-gfm.
 * Renders GitHub-flavored markdown with full table, code block, list, and link support.
 * Wrapped in React.memo to prevent unnecessary re-parsing while new tokens stream.
 */
const MarkdownRendererComponent: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  const processed = useMemo(() => preprocessMarkdown(content), [content]);

  return (
    <MarkdownErrorBoundary
      fallback={
        <div className="whitespace-pre-wrap break-words text-sm text-[#31302e] dark:text-neutral-200">
          {content}
        </div>
      }
    >
      <div className="markdown-content text-sm leading-relaxed text-[#31302e] dark:text-neutral-200">
        <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
          {processed}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
};

export const MarkdownRenderer = React.memo(MarkdownRendererComponent);
