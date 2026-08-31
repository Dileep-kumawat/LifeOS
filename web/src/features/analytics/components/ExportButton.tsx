import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { analyticsApi } from "../api/analyticsApi";

export type ExportState = "idle" | "loading" | "success" | "error";

export interface ExportButtonProps {
  defaultType?: "productivity" | "finance";
  startDate: string;
  endDate: string;
  className?: string;
  /** For Storybook visual testing override */
  forcedState?: ExportState;
  forcedMessage?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  defaultType = "productivity",
  startDate,
  endDate,
  className = "",
  forcedState,
  forcedMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalState, setInternalState] = useState<ExportState>("idle");
  const [internalMessage, setInternalMessage] = useState<string | null>(null);

  const state = forcedState || internalState;
  const message = forcedMessage || internalMessage;

  const handleExport = async (format: "csv" | "pdf", type: "productivity" | "finance") => {
    setIsOpen(false);
    setInternalState("loading");
    setInternalMessage(`Generating ${format.toUpperCase()} report...`);

    try {
      const { filename } = await analyticsApi.exportAnalytics({
        type,
        format,
        startDate,
        endDate
      });
      setInternalState("success");
      setInternalMessage(`Downloaded ${filename}`);

      setTimeout(() => {
        setInternalState("idle");
        setInternalMessage(null);
      }, 4000);
    } catch (err: any) {
      setInternalState("error");
      const errorMsg =
        err?.response?.status === 429
          ? "Export rate limit exceeded (20 req/hr). Please try again later."
          : err?.response?.data?.message || err?.message || "Failed to generate export file.";
      setInternalMessage(errorMsg);

      setTimeout(() => {
        setInternalState("idle");
        setInternalMessage(null);
      }, 5000);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} data-testid="export-action-container">
      {state === "loading" ? (
        <button
          type="button"
          disabled
          className="px-3.5 py-2 rounded-lg bg-[#f6f5f4] border border-[#e6e6e6] text-xs font-semibold text-[#0075de] flex items-center gap-2 cursor-wait"
          aria-label="Exporting analytics report"
        >
          <Loader2 className="size-4 animate-spin text-[#0075de]" />
          <span>Exporting...</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3.5 py-2 rounded-lg bg-white border border-[#e6e6e6] text-xs font-semibold text-[#000000] hover:bg-[#faf9f8] hover:border-[#0075de]/40 active:scale-95 transition-all flex items-center gap-2 shadow-xs"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Download className="size-3.5 text-[#0075de]" />
          <span>Export Report</span>
          <ChevronDown className={`size-3 text-[#615d59] transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Dropdown Options */}
      {isOpen && state === "idle" && (
        <div
          className="absolute right-0 mt-1.5 w-56 bg-white border border-[#e6e6e6] rounded-xl shadow-lg z-50 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
          role="menu"
        >
          <div className="px-2.5 py-1 text-[11px] font-semibold text-[#615d59] uppercase tracking-wider">
            {defaultType === "productivity" ? "Productivity Report" : "Finance Report"}
          </div>

          <button
            type="button"
            onClick={() => handleExport("csv", defaultType)}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-[#000000] hover:bg-[#f6f5f4] rounded-lg transition-colors text-left"
            role="menuitem"
          >
            <div className="size-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="size-3.5" />
            </div>
            <div>
              <div className="font-semibold">CSV Spreadsheet</div>
              <div className="text-[10px] text-[#615d59]">Tabular raw metrics & data</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleExport("pdf", defaultType)}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-[#000000] hover:bg-[#f6f5f4] rounded-lg transition-colors text-left"
            role="menuitem"
          >
            <div className="size-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center">
              <FileText className="size-3.5" />
            </div>
            <div>
              <div className="font-semibold">PDF Document</div>
              <div className="text-[10px] text-[#615d59]">Styled executive report</div>
            </div>
          </button>
        </div>
      )}

      {/* Transient Status Feedback Pill */}
      {state === "success" && (
        <div
          className="absolute right-0 top-full mt-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          role="status"
        >
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span>{message || "Report downloaded!"}</span>
        </div>
      )}

      {state === "error" && (
        <div
          className="absolute right-0 top-full mt-1.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          role="alert"
        >
          <AlertCircle className="size-3.5 text-rose-600 shrink-0" />
          <span>{message || "Export failed"}</span>
        </div>
      )}
    </div>
  );
};
