import React, { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, Cpu } from "lucide-react";
import type { FinanceInsightsResponse } from "../types";
import { financeApi } from "../api";
import { MarkdownRenderer } from "../../ai/components/MarkdownRenderer";

interface InsightsCardProps {
  initialData?: FinanceInsightsResponse | null;
  initialLoading?: boolean;
  initialError?: string | null;
  initialRetrying?: boolean;
  onFetchInsights?: (focusArea?: string) => Promise<FinanceInsightsResponse>;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({
  initialData = null,
  initialLoading = false,
  initialError = null,
  initialRetrying = false,
  onFetchInsights
}) => {
  const [data, setData] = useState<FinanceInsightsResponse | null>(initialData);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(initialError);
  const [retrying, setRetrying] = useState<boolean>(initialRetrying);
  const [focusArea, setFocusArea] = useState<string>("");

  const handleGetInsights = async () => {
    setLoading(true);
    setError(null);
    setRetrying(false);

    try {
      const result = onFetchInsights
        ? await onFetchInsights(focusArea.trim() || undefined)
        : await financeApi.getInsights(focusArea.trim() || undefined);

      setData(result);
      if (result.fallbackOccurred) {
        setRetrying(true);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Failed to generate financial insights."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-[#ffffff] via-[#f6f5f4] to-[#ffffff] border border-[#e6e6e6] rounded-xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 bg-[#0075de]/10 text-[#0075de] rounded-lg shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-[#000000] leading-snug">
              Financial Insights & Recommendations
            </h3>
            <p className="text-xs text-[#615d59] mt-0.5">
              AI-driven analysis grounded in your logged transaction and budget data
            </p>
          </div>
        </div>

        {(retrying || data?.fallbackOccurred) && (
          <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200 shrink-0">
            <Cpu className="size-3.5 animate-pulse" />
            <span>Retrying with backup model</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <input
          type="text"
          value={focusArea}
          onChange={(e) => setFocusArea(e.target.value)}
          placeholder="Optional focus (e.g. dining out, saving more)..."
          className="flex-1 min-w-0 w-full px-3.5 py-2 text-sm bg-white border border-[#e6e6e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0075de]/20 transition-all text-[#31302e] placeholder:text-[#a39e98]"
          disabled={loading}
        />
        <button
          onClick={handleGetInsights}
          disabled={loading}
          className="w-full sm:w-auto shrink-0 px-4 py-2 bg-[#0075de] text-white text-sm font-medium rounded-full hover:bg-[#005bab] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-xs active:scale-[0.98]"
        >
          {loading ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              <span>Get Insights</span>
            </>
          )}
        </button>
      </div>

      {loading && (
        <div className="p-4 sm:p-6 bg-white border border-[#e6e6e6] rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#0075de] font-medium">
            <RefreshCw className="size-4 animate-spin shrink-0" />
            <span className="leading-snug">Analyzing category totals, budget statuses, and multi-month trends...</span>
          </div>
          <div className="h-3 bg-gray-100 rounded w-5/6 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-4/6 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-3/6 animate-pulse" />
        </div>
      )}

      {error && (
        <div className="p-3.5 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="size-5 shrink-0 text-red-500" />
            <span className="break-words">{error}</span>
          </div>
          <button
            onClick={handleGetInsights}
            className="self-end sm:self-auto px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded hover:bg-red-200 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data?.insights && (
        <div className="p-4 sm:p-5 bg-white border border-[#e6e6e6] rounded-lg space-y-2 text-sm text-[#31302e] leading-relaxed overflow-hidden">
          {data.providerServed && (
            <div className="text-xs text-[#a39e98] font-mono mb-2">
              Served by {data.providerServed} {data.fallbackOccurred ? "(via backup fallback)" : ""}
            </div>
          )}
          <MarkdownRenderer content={data.insights} />
        </div>
      )}
    </div>
  );
};
