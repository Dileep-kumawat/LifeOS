import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Clock, CheckCircle2, AlertCircle, Sparkles, Brain, GraduationCap, Flag, CheckSquare } from "lucide-react";
import type { FocusSummaryResponse, FocusLinkedType } from "@lifeos/shared";

interface FocusSummaryChartProps {
  data?: FocusSummaryResponse | null;
  selectedRange: "day" | "week" | "month";
  onRangeChange?: (range: "day" | "week" | "month") => void;
  isLoading?: boolean;
}

const LINKED_TYPE_CONFIG: Record<
  FocusLinkedType,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  topic: { label: "Study Topics", color: "#0075de", icon: GraduationCap },
  goal: { label: "Goals", color: "#2a9d99", icon: Flag },
  task: { label: "Tasks", color: "#dd5b00", icon: CheckSquare },
  none: { label: "Unlinked", color: "#a39e98", icon: Brain }
};

export const FocusSummaryChart: React.FC<FocusSummaryChartProps> = ({
  data,
  selectedRange,
  onRangeChange,
  isLoading
}) => {
  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00Z");
      return d.toLocaleDateString(undefined, {
        timeZone: "UTC",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const totalFocus = data?.totalFocusMinutes ?? 0;
  const completedCount = data?.completedSessionsCount ?? 0;
  const abandonedCount = data?.abandonedSessionsCount ?? 0;
  const avgMinutes = data?.averageSessionMinutes ?? 0;
  const trendData = data?.trend ?? [];
  const breakdownData = (data?.linkedTypeBreakdown ?? []).filter((b) => b.totalMinutes > 0);

  const pieChartData = breakdownData.map((item) => ({
    name: LINKED_TYPE_CONFIG[item.linkedType]?.label || item.linkedType,
    value: item.totalMinutes,
    linkedType: item.linkedType,
    percentage: item.percentage
  }));

  const hasAnySessions = totalFocus > 0 || (data?.totalSessionsCount ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Header & Range Pill Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#000000] tracking-tight flex items-center gap-2">
            <Clock className="size-5 text-[#0075de]" />
            <span>Focus Time Analytics</span>
          </h2>
          <p className="text-xs text-[#615d59] mt-0.5">
            Aggregated Pomodoro focus minutes and productivity trends
          </p>
        </div>

        {onRangeChange && (
          <div className="inline-flex p-1 rounded-xl bg-white border border-[#e6e6e6] shadow-2xs">
            {(["day", "week", "month"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  selectedRange === r
                    ? "bg-[#0075de] text-white shadow-xs"
                    : "text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4]"
                }`}
              >
                {r === "day" ? "Today" : r === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Focus Time */}
        <div className="p-4 bg-white rounded-xl border border-[#e6e6e6] shadow-2xs">
          <div className="flex items-center justify-between text-[#615d59] mb-1">
            <span className="text-xs font-medium">Total Focus</span>
            <Clock className="size-3.5 text-[#0075de]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#000000] tabular-nums">
            {formatMinutes(totalFocus)}
          </p>
          <span className="text-[11px] text-[#a39e98] mt-0.5 block">
            {totalFocus} total minutes
          </span>
        </div>

        {/* Completed Sessions */}
        <div className="p-4 bg-white rounded-xl border border-[#e6e6e6] shadow-2xs">
          <div className="flex items-center justify-between text-[#615d59] mb-1">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="size-3.5 text-[#1aae39]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#1aae39] tabular-nums">
            {completedCount}
          </p>
          <span className="text-[11px] text-[#a39e98] mt-0.5 block">
            full cycles finished
          </span>
        </div>

        {/* Abandoned Sessions */}
        <div className="p-4 bg-white rounded-xl border border-[#e6e6e6] shadow-2xs">
          <div className="flex items-center justify-between text-[#615d59] mb-1">
            <span className="text-xs font-medium">Stopped Early</span>
            <AlertCircle className="size-3.5 text-[#dd5b00]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#dd5b00] tabular-nums">
            {abandonedCount}
          </p>
          <span className="text-[11px] text-[#a39e98] mt-0.5 block">
            partial time saved
          </span>
        </div>

        {/* Avg Session Length */}
        <div className="p-4 bg-white rounded-xl border border-[#e6e6e6] shadow-2xs">
          <div className="flex items-center justify-between text-[#615d59] mb-1">
            <span className="text-xs font-medium">Avg Duration</span>
            <Sparkles className="size-3.5 text-[#2a9d99]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#000000] tabular-nums">
            {avgMinutes}m
          </p>
          <span className="text-[11px] text-[#a39e98] mt-0.5 block">
            per focus session
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 bg-white rounded-2xl border border-[#e6e6e6] text-center shadow-2xs">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="size-8 rounded-full bg-[#f6f5f4]" />
            <div className="h-4 w-48 bg-[#f6f5f4] rounded" />
          </div>
        </div>
      ) : !hasAnySessions ? (
        /* Empty / No Sessions State */
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-[#e6e6e6] text-center shadow-2xs">
          <div className="size-12 rounded-full bg-[#f6f5f4] flex items-center justify-center mb-3">
            <Clock className="size-6 text-[#a39e98]" />
          </div>
          <h3 className="text-base font-semibold text-[#000000]">No focus sessions in this period</h3>
          <p className="text-xs text-[#615d59] mt-1 max-w-sm">
            Start a Pomodoro session on any Study Topic, Goal, or Task above to track your deep work progress.
          </p>
        </div>
      ) : (
        /* Charts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Trend Bar Chart */}
          <div className="lg:col-span-8 p-5 bg-white rounded-2xl border border-[#e6e6e6] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#000000]">Focus Duration Trend</h3>
                <p className="text-[11px] text-[#615d59]">Minutes spent in deep work per day</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-[#f6f5f4] text-[#0075de] rounded-full border border-[#e6e6e6]">
                {data?.period?.label || "Selected Range"}
              </span>
            </div>

            {/* Screen Reader Accessible Table */}
            <div className="sr-only">
              <h4>Daily Focus Summary</h4>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Focus Minutes</th>
                    <th scope="col">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {trendData.map((t) => (
                    <tr key={t.date}>
                      <td>{t.date}</td>
                      <td>{t.totalMinutes} mins</td>
                      <td>{t.completedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recharts Bar Chart */}
            <div className="w-full h-64" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f6f5f4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#615d59"
                    fontSize={11}
                    tickFormatter={formatShortDate}
                  />
                  <YAxis
                    stroke="#615d59"
                    fontSize={11}
                    tickFormatter={(val: number) => `${val}m`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} mins`, "Focus Time"]}
                    labelFormatter={formatShortDate}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      borderColor: "#e6e6e6",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      fontSize: "12px"
                    }}
                  />
                  <Bar
                    dataKey="totalMinutes"
                    fill="#0075de"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Linked Type Breakdown Donut Chart */}
          <div className="lg:col-span-4 p-5 bg-white rounded-2xl border border-[#e6e6e6] shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#000000]">Time Allocation</h3>
              <p className="text-[11px] text-[#615d59]">Focus breakdown by entity</p>
            </div>

            {pieChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#a39e98] text-center">
                No categorized sessions yet
              </div>
            ) : (
              <div className="w-full h-64" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry) => (
                        <Cell
                          key={`cell-${entry.linkedType}`}
                          fill={LINKED_TYPE_CONFIG[entry.linkedType]?.color || "#0075de"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val} mins`, "Time"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        borderColor: "#e6e6e6",
                        fontSize: "12px"
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val: any, entry: any) => (
                        <span className="text-xs text-[#31302e] font-medium">
                          {val} ({entry.payload.percentage}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
