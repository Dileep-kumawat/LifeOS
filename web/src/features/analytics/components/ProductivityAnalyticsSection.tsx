import React from "react";
import {
  Timer,
  CheckCircle2,
  Flame,
  Activity,
  Target,
  BookOpen,
  Award
} from "lucide-react";
import type { ProductivityAnalytics } from "@lifeos/shared";
import { AnalyticsChart } from "./AnalyticsChart";

interface ProductivityAnalyticsSectionProps {
  data?: ProductivityAnalytics;
  isLoading?: boolean;
}

export const ProductivityAnalyticsSection: React.FC<ProductivityAnalyticsSectionProps> = ({
  data,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse" role="status" aria-label="Loading productivity metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-[#e6e6e6] rounded-xl p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-80 bg-white border border-[#e6e6e6] rounded-xl p-6" />
          <div className="lg:col-span-4 h-80 bg-white border border-[#e6e6e6] rounded-xl p-6" />
        </div>
      </div>
    );
  }

  const hasData =
    data &&
    (data.habits.totalExpected > 0 ||
      data.focus.totalSessionsCount > 0 ||
      data.habitConsistency.length > 0 ||
      data.trend.some((t) => t.focusMinutes > 0 || t.habitsCompleted > 0));

  if (!data || !hasData) {
    return (
      <div
        className="p-12 bg-white border border-[#e6e6e6] rounded-2xl text-center shadow-xs flex flex-col items-center justify-center"
        data-testid="productivity-empty-state"
      >
        <div className="size-14 rounded-2xl bg-[#f6f5f4] border border-[#e6e6e6] flex items-center justify-center text-[#0075de] mb-4">
          <Activity className="size-7" />
        </div>
        <h3 className="text-lg font-bold text-[#000000] mb-2">No Productivity Data Yet</h3>
        <p className="text-sm text-[#615d59] max-w-md leading-relaxed mb-6">
          Track your daily habits, start a Pomodoro focus timer session, or adjust your selected date
          range to begin seeing productivity trends.
        </p>
      </div>
    );
  }

  // Format hours and minutes from total focus minutes
  const totalMinutes = data.focus.totalFocusMinutes || 0;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  const formattedFocusTime =
    hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;

  const habitRatePercent = Math.round((data.habits.completionRate || 0) * 100);
  const sessionSuccessPercent =
    data.focus.totalSessionsCount > 0
      ? Math.round(
          (data.focus.completedSessionsCount / data.focus.totalSessionsCount) * 100
        )
      : 0;

  // Polymorphic breakdown icon helper
  const getLinkedTypeIcon = (type: string) => {
    switch (type) {
      case "topic":
        return <BookOpen className="size-3.5 text-[#0075de]" />;
      case "goal":
        return <Target className="size-3.5 text-purple-600" />;
      case "task":
        return <CheckCircle2 className="size-3.5 text-emerald-600" />;
      default:
        return <Timer className="size-3.5 text-[#615d59]" />;
    }
  };

  const getLinkedTypeLabel = (type: string) => {
    switch (type) {
      case "topic":
        return "Study Topics";
      case "goal":
        return "Key Goals";
      case "task":
        return "Tasks";
      default:
        return "General Focus";
    }
  };

  return (
    <div className="flex flex-col gap-6" data-testid="productivity-analytics-section">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Focus Time Card */}
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Total Focus Time
            </span>
            <div className="size-7 rounded-lg bg-[#0075de]/10 text-[#0075de] flex items-center justify-center">
              <Timer className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#000000]">{formattedFocusTime}</div>
            <p className="text-xs text-[#615d59] mt-1">
              {data.focus.completedSessionsCount} sessions completed (avg{" "}
              {Math.round(data.focus.averageSessionMinutes)}m)
            </p>
          </div>
        </div>

        {/* Habits Completion Rate Card */}
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Habit Consistency
            </span>
            <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#000000]">{habitRatePercent}%</span>
              <span className="text-xs text-emerald-600 font-semibold">
                {data.habits.totalCompleted} / {data.habits.totalExpected} done
              </span>
            </div>
            <p className="text-xs text-[#615d59] mt-1">Scheduled vs logged check-ins</p>
          </div>
        </div>

        {/* Focus Session Completion Ratio */}
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Session Success
            </span>
            <div className="size-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Target className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#000000]">{sessionSuccessPercent}%</span>
              <span className="text-xs text-[#615d59]">
                {data.focus.completedSessionsCount} of {data.focus.totalSessionsCount}
              </span>
            </div>
            <p className="text-xs text-[#615d59] mt-1">
              {data.focus.abandonedSessionsCount} session(s) abandoned early
            </p>
          </div>
        </div>

        {/* Tracked Habits Count */}
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Active Habits
            </span>
            <div className="size-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#000000]">
              {data.habitConsistency.length}
            </div>
            <p className="text-xs text-[#615d59] mt-1">
              Max streak:{" "}
              {Math.max(...data.habitConsistency.map((h) => h.longestStreak), 0)} days
            </p>
          </div>
        </div>
      </div>

      {/* 2. Charts Row: Daily Trend + Focus Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Contiguous Daily Trend Chart */}
        <div className="lg:col-span-8">
          <AnalyticsChart
            type="bar"
            title="Daily Productivity Trend"
            subtitle="Contiguous daily focus time and habits completed over range"
            xKey="date"
            series={[
              { dataKey: "focusMinutes", name: "Focus Minutes", color: "#0075de" },
              { dataKey: "habitsCompleted", name: "Habits Done", color: "#1aae39" }
            ]}
            data={data.trend}
            xAxisFormatter={(val: string) => {
              if (!val) return "";
              // Format YYYY-MM-DD to Mon DD
              const parts = val.split("-");
              if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
              return val;
            }}
            yAxisFormatter={(val: number) => `${val}`}
            tooltipFormatter={(val: any, name: string) => [
              name === "Focus Minutes" ? `${val} mins` : `${val} habits`,
              name
            ]}
          />
        </div>

        {/* Focus Type Breakdown Card */}
        <div className="lg:col-span-4 p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#000000] mb-1">Focus Distribution</h3>
            <p className="text-xs text-[#615d59] mb-4">Minutes allocated by linked objective</p>

            {data.focus.linkedTypeBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#615d59]">
                No linked focus sessions in this range.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {data.focus.linkedTypeBreakdown.map((item) => {
                  return (
                    <div key={item.linkedType} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-medium text-[#000000]">
                          {getLinkedTypeIcon(item.linkedType)}
                          <span>{getLinkedTypeLabel(item.linkedType)}</span>
                        </div>
                        <span className="font-semibold text-[#31302e]">
                          {item.totalMinutes}m ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#f6f5f4] rounded-full h-2 overflow-hidden border border-[#e6e6e6]">
                        <div
                          className="bg-[#0075de] h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#e6e6e6] text-xs text-[#615d59] flex items-center justify-between">
            <span>Total Logged Sessions</span>
            <span className="font-bold text-[#000000]">{data.focus.totalSessionsCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Habit Consistency Table / Cards */}
      <div className="p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#000000]">Habit Consistency & Streaks</h3>
            <p className="text-xs text-[#615d59] mt-0.5">
              Individual habit performance and streaks across selected period
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#615d59]">
            <Award className="size-4 text-amber-600" />
            <span>Streaks Live</span>
          </div>
        </div>

        {data.habitConsistency.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#615d59]">
            No habits active during this date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e6e6e6] text-[#615d59] uppercase tracking-wider font-semibold">
                  <th className="pb-3 pr-4 font-semibold">Habit</th>
                  <th className="pb-3 px-4 font-semibold">Frequency</th>
                  <th className="pb-3 px-4 font-semibold">Current Streak</th>
                  <th className="pb-3 px-4 font-semibold">Best Streak</th>
                  <th className="pb-3 px-4 font-semibold">Range Progress</th>
                  <th className="pb-3 pl-4 font-semibold text-right">Adherence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e6e6]/60">
                {data.habitConsistency.map((habit) => {
                  const rate = Math.round(habit.rangeCompletionRate * 100);
                  return (
                    <tr key={habit.habitId} className="hover:bg-[#faf9f8] transition-colors">
                      <td className="py-3.5 pr-4 font-semibold text-[#000000]">{habit.title}</td>
                      <td className="py-3.5 px-4 text-[#615d59] capitalize">
                        {habit.frequency.type}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-semibold text-amber-600">
                          <Flame className="size-3.5" />
                          <span>{habit.currentStreak}d</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#615d59]">{habit.longestStreak}d</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#f6f5f4] rounded-full h-1.5 overflow-hidden border border-[#e6e6e6]">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-[#615d59]">
                            {habit.rangeCompleted}/{habit.rangeExpected}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            rate >= 80
                              ? "bg-emerald-50 text-emerald-700"
                              : rate >= 50
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
