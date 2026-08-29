import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Sparkles, FileText, Edit3, Eye } from "lucide-react";
import { cn } from "../../lib/utils";
import type { OcrNoteDraft, OcrNoteLine } from "@lifeos/shared";

export interface OCRPreviewCardProps {
  draft: OcrNoteDraft;
  onTitleChange?: (title: string) => void;
  onBodyChange?: (bodyText: string) => void;
  className?: string;
}

export function OCRPreviewCard({
  draft,
  onTitleChange,
  onBodyChange,
  className
}: OCRPreviewCardProps) {
  const [title, setTitle] = useState(draft.title || "");
  const [bodyText, setBodyText] = useState(draft.bodyText || "");
  const [lines, setLines] = useState<OcrNoteLine[]>(draft.lines || []);
  const [activeTab, setActiveTab] = useState<"lines" | "full">("lines");

  useEffect(() => {
    setTitle(draft.title || "");
    setBodyText(draft.bodyText || "");
    setLines(draft.lines || []);
  }, [draft]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const handleBodyChange = (newBody: string) => {
    setBodyText(newBody);
    onBodyChange?.(newBody);

    // Update lines array representation
    const newLines = newBody.split("\n").filter((l) => l.trim().length > 0);
    setLines(
      newLines.map((text) => ({
        text,
        isLowConfidence: false
      }))
    );
  };

  const handleLineTextChange = (index: number, newText: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], text: newText };
    setLines(updated);

    const fullText = updated.map((l) => l.text).join("\n");
    setBodyText(fullText);
    onBodyChange?.(fullText);
  };

  const lowConfidenceCount = lines.filter((l) => l.isLowConfidence).length;
  const confidencePercent =
    typeof draft.overallConfidence === "number"
      ? Math.round(draft.overallConfidence * 100)
      : null;

  const isEmpty = !bodyText.trim() && lines.length === 0;

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e6e6e6] bg-[#f6f5f4] p-8 text-center",
          className
        )}
      >
        <FileText className="mb-2 size-10 text-[#a39e98]" />
        <h4 className="text-sm font-semibold text-[#000000]">No Text Detected</h4>
        <p className="mt-1 max-w-sm text-xs text-[#615d59]">
          The OCR engine could not recognize readable text in this image. You can try capturing a
          clearer photo with better lighting or start a blank note.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-xs",
        className
      )}
    >
      {/* Header Badges & Confidence Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6e6e6] pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f5f4] px-2.5 py-1 text-[11px] font-semibold text-[#31302e] border border-[#e6e6e6]">
            <Sparkles className="size-3 text-[#0075de]" />
            OCR Draft
          </span>

          {confidencePercent !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                confidencePercent >= 80
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : confidencePercent >= 50
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
              )}
            >
              {confidencePercent >= 80 ? (
                <CheckCircle2 className="size-3 text-emerald-600" />
              ) : (
                <AlertCircle className="size-3 text-amber-600" />
              )}
              {confidencePercent}% Confidence
            </span>
          )}

          <span className="text-[11px] text-[#a39e98] capitalize">
            via {draft.source === "server_fallback" ? "Server OCR" : "On-Device ML"}
          </span>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-[#f6f5f4] p-0.5 border border-[#e6e6e6]">
          <button
            type="button"
            onClick={() => setActiveTab("lines")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              activeTab === "lines"
                ? "bg-white text-[#0075de] shadow-xs"
                : "text-[#615d59] hover:text-[#000000]"
            )}
          >
            <Eye className="size-3" />
            Line Review
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("full")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              activeTab === "full"
                ? "bg-white text-[#0075de] shadow-xs"
                : "text-[#615d59] hover:text-[#000000]"
            )}
          >
            <Edit3 className="size-3" />
            Plain Text
          </button>
        </div>
      </div>

      {/* Low-confidence Warning Cue */}
      {lowConfidenceCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">
              {lowConfidenceCount} line{lowConfidenceCount > 1 ? "s" : ""} flagged for review
            </span>
            <span className="text-[11px] text-amber-800/90">
              Highlighted in amber below. Please check highlighted words for OCR mistranscriptions.
            </span>
          </div>
        </div>
      )}

      {/* Editable Title */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#615d59]">
          Title (Heuristic Pre-fill)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title..."
          maxLength={300}
          className="w-full rounded-md border border-[#e6e6e6] bg-[#f6f5f4] px-3 py-2 text-sm font-bold text-[#000000] placeholder:text-[#a39e98] focus:border-[#0075de] focus:bg-white focus:outline-none"
        />
      </div>

      {/* Content Section: Line-by-line review vs Full Text */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#615d59]">
          Extracted Content ({lines.length} lines)
        </label>

        {activeTab === "lines" ? (
          <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "group relative flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
                  line.isLowConfidence
                    ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50"
                    : "border-[#e6e6e6] bg-white hover:border-[#a39e98]"
                )}
              >
                <span className="w-5 shrink-0 text-right font-mono text-[10px] text-[#a39e98]">
                  {idx + 1}
                </span>

                <input
                  type="text"
                  value={line.text}
                  onChange={(e) => handleLineTextChange(idx, e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-xs text-[#31302e] focus:outline-none"
                />

                {line.isLowConfidence && (
                  <span
                    title={`Low confidence score: ${Math.round((line.confidence ?? 0) * 100)}%`}
                    aria-label={`Low confidence line (${Math.round((line.confidence ?? 0) * 100)}% confidence)`}
                    className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300"
                  >
                    <AlertCircle className="size-2.5 text-amber-700" />
                    Check
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <textarea
            value={bodyText}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="Extracted note text..."
            rows={8}
            className="w-full rounded-md border border-[#e6e6e6] bg-white p-3 text-xs leading-relaxed text-[#31302e] placeholder:text-[#a39e98] focus:border-[#0075de] focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
