import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Activity, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { analyticsApi } from "./api/analyticsApi";
import { DateRangePicker, computePresetRange, type DateRangeValue } from "./components/DateRangePicker";
import { ExportButton } from "./components/ExportButton";
import { ProductivityAnalyticsSection } from "./components/ProductivityAnalyticsSection";
import { FinanceAnalyticsSection } from "./components/FinanceAnalyticsSection";

export function AnalyticsPage() {
  // Shared Date Range State (defaults to 'this_month')
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    ...computePresetRange("this_month"),
    preset: "this_month"
  });

  // Active Tab View: "productivity" | "finance"
  const [activeTab, setActiveTab] = useState<"productivity" | "finance">("productivity");

  // Query 1: Productivity Analytics
  const {
    data: productivityData,
    isLoading: isProductivityLoading,
    isError: isProductivityError,
    error: productivityError,
    refetch: refetchProductivity
  } = useQuery({
    queryKey: ["analytics", "productivity", dateRange.startDate, dateRange.endDate],
    queryFn: () => analyticsApi.getProductivityAnalytics(dateRange.startDate, dateRange.endDate),
    staleTime: 60 * 1000
  });

  // Query 2: Finance Analytics
  const {
    data: financeData,
    isLoading: isFinanceLoading,
    isError: isFinanceError,
    error: financeError,
    refetch: refetchFinance
  } = useQuery({
    queryKey: ["analytics", "finance", dateRange.startDate, dateRange.endDate],
    queryFn: () => analyticsApi.getFinanceAnalytics(dateRange.startDate, dateRange.endDate),
    staleTime: 60 * 1000
  });

  const handleRefresh = () => {
    refetchProductivity();
    refetchFinance();
  };

  const isCurrentTabError = activeTab === "productivity" ? isProductivityError : isFinanceError;
  const currentTabError = activeTab === "productivity" ? productivityError : financeError;

  return (
    <div className="w-full flex flex-col" data-testid="analytics-page">
      {/* 1. Header Banner */}
      <section className="w-full bg-[#213183] text-white px-4 sm:px-6 lg:px-10 py-8 sm:py-10 flex flex-col gap-4 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0075de] rounded-full blur-[90px] opacity-20 pointer-events-none" />

        <div className="flex items-center justify-between flex-wrap gap-3 z-10">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium flex items-center gap-2 backdrop-blur-sm shadow-[0_0_15px_rgba(151,165,254,0.3)]">
              <Sparkles className="size-3.5 text-[#97a5fe]" />
              Executive Analytics & Reports
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/20"
            title="Refresh analytics data"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="max-w-3xl z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Analytics & Performance Insights
          </h1>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Consolidated metrics across focus sessions, daily habit consistency, cashflow trends, and
            budget adherence over custom time windows.
          </p>
        </div>
      </section>

      {/* 2. Main Content Canvas */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 flex flex-col gap-6 max-w-7xl mx-auto w-full -mt-4 z-20">
        {/* Controls Bar: Domain Switcher + DateRangePicker + ExportButton */}
        <div className="p-4 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Domain Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[#f6f5f4] rounded-lg border border-[#e6e6e6] self-start">
            <button
              type="button"
              onClick={() => setActiveTab("productivity")}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
                activeTab === "productivity"
                  ? "bg-white text-[#0075de] shadow-xs border border-[#e6e6e6]"
                  : "text-[#615d59] hover:text-[#000000]"
              }`}
              data-testid="tab-productivity"
            >
              <Activity className="size-4" />
              <span>Productivity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("finance")}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
                activeTab === "finance"
                  ? "bg-white text-[#0075de] shadow-xs border border-[#e6e6e6]"
                  : "text-[#615d59] hover:text-[#000000]"
              }`}
              data-testid="tab-finance"
            >
              <Wallet className="size-4" />
              <span>Finance</span>
            </button>
          </div>

          {/* Date Picker + Export Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <ExportButton
              defaultType={activeTab}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
        </div>

        {/* 3. Error Fallback State */}
        {isCurrentTabError && (
          <div
            className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center justify-between gap-4"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-rose-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold">Failed to load {activeTab} analytics</h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  {(currentTabError as any)?.response?.data?.message ||
                    (currentTabError as any)?.message ||
                    "An unexpected error occurred while fetching analytics."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* 4. Active Tab Content View */}
        {activeTab === "productivity" ? (
          <ProductivityAnalyticsSection
            data={productivityData}
            isLoading={isProductivityLoading}
          />
        ) : (
          <FinanceAnalyticsSection
            data={financeData}
            isLoading={isFinanceLoading}
          />
        )}
      </div>
    </div>
  );
}
