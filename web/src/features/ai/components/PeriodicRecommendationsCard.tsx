import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Calendar,
  ArrowRight,
  TrendingUp,
  Activity,
  Wallet,
  CheckCircle2
} from "lucide-react";
import type { Recommendation, RecommendationItem, RecommendationPeriod } from "@lifeos/shared";
import { Skeleton } from "../../../components/ui/Skeleton";

export interface PeriodicRecommendationsCardProps {
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  generated?: boolean;
  period?: RecommendationPeriod;
  onPeriodChange?: (period: RecommendationPeriod) => void;
  recommendation?: Recommendation | null;
}

export function PeriodicRecommendationsCard({
  isLoading = false,
  isError = false,
  onRetry,
  generated = true,
  period = "weekly",
  onPeriodChange,
  recommendation
}: PeriodicRecommendationsCardProps) {
  const [internalPeriod, setInternalPeriod] = useState<RecommendationPeriod>(period);
  const activePeriod = onPeriodChange ? period : internalPeriod;

  const handlePeriodClick = (p: RecommendationPeriod) => {
    if (onPeriodChange) {
      onPeriodChange(p);
    } else {
      setInternalPeriod(p);
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case "finance":
        return <Wallet className="size-3.5 text-[#0075de]" />;
      case "habits":
        return <CheckCircle2 className="size-3.5 text-[#1aae39]" />;
      case "productivity":
        return <Activity className="size-3.5 text-[#dd5b00]" />;
      default:
        return <TrendingUp className="size-3.5 text-[#213183]" />;
    }
  };

  const getImpactBadgeClass = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    );
  }

  // 2. Error Fallback State
  if (isError) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-rose-200 bg-rose-50/60 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 shrink-0">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-900">
                Could not load {activePeriod} recommendations
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                An error occurred while fetching or generating recommendations for this period.
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-50 shadow-2xs self-start sm:self-auto"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Scheduled / Not Yet Generated State
  if (!generated || !recommendation) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[#e6e6e6] bg-[#f6f5f4] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#0075de]/10 text-[#0075de] shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#000000]">
                  {activePeriod === "weekly" ? "Weekly" : "Monthly"} AI Recommendations
                </h3>
                <span className="inline-flex items-center rounded-full bg-white border border-[#e6e6e6] px-2.5 py-0.5 text-[11px] font-semibold text-[#615d59]">
                  Scheduled Cadence
                </span>
              </div>
              <p className="text-xs text-[#615d59] mt-1 leading-relaxed">
                {activePeriod === "weekly"
                  ? "Generated automatically every Sunday at 08:00 evaluating your past 7 completed days."
                  : "Generated automatically on the 1st of every month at 08:00 evaluating the completed month."}
              </p>
            </div>
          </div>

          {/* Period Toggle in empty state */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-full border border-[#e6e6e6] self-start md:self-auto">
            <button
              type="button"
              onClick={() => handlePeriodClick("weekly")}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                activePeriod === "weekly"
                  ? "bg-[#0075de] text-white shadow-2xs"
                  : "text-[#615d59] hover:text-[#000000]"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => handlePeriodClick("monthly")}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                activePeriod === "monthly"
                  ? "bg-[#0075de] text-white shadow-2xs"
                  : "text-[#615d59] hover:text-[#000000]"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { recommendations, periodStart, periodEnd } = recommendation;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-xs flex flex-col gap-5"
      data-testid="periodic-recommendations-card"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e6e6] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#0075de]/10 text-[#0075de] shrink-0">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#000000] tracking-tight">
                AI Performance Recommendations
              </h2>
            </div>
            <p className="text-xs text-[#615d59] mt-0.5">
              Grounded suggestions derived from your completed {activePeriod} metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period Toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-[#f6f5f4] rounded-full border border-[#e6e6e6]">
            <button
              type="button"
              onClick={() => handlePeriodClick("weekly")}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                activePeriod === "weekly"
                  ? "bg-white text-[#0075de] shadow-2xs border border-[#e6e6e6]"
                  : "text-[#615d59] hover:text-[#000000]"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => handlePeriodClick("monthly")}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                activePeriod === "monthly"
                  ? "bg-white text-[#0075de] shadow-2xs border border-[#e6e6e6]"
                  : "text-[#615d59] hover:text-[#000000]"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Date range pill */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6f5f4] border border-[#e6e6e6] px-3 py-1 text-xs font-semibold text-[#31302e]">
            <Calendar className="size-3.5 text-[#0075de]" />
            {periodStart} → {periodEnd}
          </span>
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      {recommendations.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#615d59] italic">
          No specific recommendations recorded for this period.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((item: RecommendationItem, index: number) => (
            <div
              key={item.id || index}
              className="flex flex-col justify-between rounded-xl border border-[#e6e6e6] bg-[#f6f5f4]/50 p-4 transition-all hover:bg-white hover:shadow-xs group"
            >
              <div className="flex flex-col gap-2.5">
                {/* Meta Row: Domain + Category + Impact */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {getDomainIcon(item.domain)}
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#615d59]">
                      {item.category || item.domain}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-bold capitalize ${getImpactBadgeClass(
                      item.impact
                    )}`}
                  >
                    {item.impact} impact
                  </span>
                </div>

                {/* Title & Message */}
                <div>
                  <h3 className="text-sm font-bold text-[#000000] group-hover:text-[#0075de] transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#31302e] mt-1.5 leading-relaxed">{item.message}</p>
                </div>
              </div>

              {/* Actionable Step & Grounded Metric Box */}
              <div className="mt-3.5 pt-3 border-t border-[#e6e6e6] flex flex-col gap-2">
                <div className="bg-white border border-[#e6e6e6] rounded-lg p-2.5 flex items-start gap-2 shadow-2xs">
                  <ArrowRight className="size-3.5 text-[#0075de] shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-[#000000] leading-snug">
                    {item.actionableStep}
                  </p>
                </div>

                {item.metricGrounded && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#615d59] px-1">
                    <span>Grounded Metric:</span>
                    <span className="font-semibold text-[#000000] truncate max-w-[170px]">
                      {item.metricGrounded}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
