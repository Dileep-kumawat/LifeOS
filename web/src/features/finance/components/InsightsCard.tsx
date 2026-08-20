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
    <div className="p-6 bg-gradient-to-br from-[#ffffff] via-[#f6f5f4] to-[#ffffff] border border-[#e6e6e6] rounded-xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#0075de]/10 text-[#0075de] rounded-lg">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#000000]">
              Financial Insights & Recommendations
            </h3>
            <p className="text-xs text-[#615d59]">
              AI-driven analysis grounded in your logged transaction and budget data
            </p>
          </div>
        </div>

        {(retrying || data?.fallbackOccurred) && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">
            <Cpu className="size-3.5 animate-pulse" />
            <span>Retrying with backup model</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={focusArea}
          onChange={(e) => setFocusArea(e.target.value)}
          placeholder="Optional focus (e.g. dining out, saving more)..."
          className="flex-1 px-3.5 py-2 text-sm bg-white border border-[#e6e6e6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0075de]/20"
          disabled={loading}
        />
        <button
          onClick={handleGetInsights}
          disabled={loading}
          className="px-4 py-2 bg-[#0075de] text-white text-sm font-medium rounded-full hover:bg-[#005bab] disabled:opacity-50 transition-colors flex items-center gap-2"
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
        <div className="p-6 bg-white border border-[#e6e6e6] rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#0075de] font-medium">
            <RefreshCw className="size-4 animate-spin" />
            <span>Analyzing category totals, budget statuses, and multi-month trends...</span>
          </div>
          <div className="h-3 bg-gray-100 rounded w-5/6 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-4/6 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-3/6 animate-pulse" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleGetInsights}
            className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data?.insights && (
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-lg space-y-2 text-sm text-[#31302e] leading-relaxed">
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
