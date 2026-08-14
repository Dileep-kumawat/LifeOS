import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Calendar,
  Activity,
  Target,
  Wallet,
  Plus,
  ArrowUpRight
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useTodaySummary } from "../ai/hooks/useDailySummary";
import { DailySummaryCard } from "../ai/components/DailySummaryCard";
import { StatCard } from "./components/StatCard";
import { TodayScheduleWidget } from "./components/TodayScheduleWidget";
import { TodayHabitsWidget } from "./components/TodayHabitsWidget";
import { GoalsOverviewWidget } from "./components/GoalsOverviewWidget";
import { FinanceSnapshotWidget } from "./components/FinanceSnapshotWidget";
import { RecentNotesWidget } from "./components/RecentNotesWidget";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { financeApi } from "../finance/api";
import { dayRange } from "../calendar/lib/rangeMath";
import { useCalendarEvents } from "../calendar/hooks/useCalendarEvents";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { data: summaryData, isLoading: isSummaryLoading, isError: isSummaryError, refetch } = useTodaySummary();

  // Determine greeting based on local time
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Quick stats queries
  const todayRange = dayRange(new Date());
  const { data: todayEvents = [] } = useCalendarEvents(todayRange.start, todayRange.end, "day");

  const { data: habits = [] } = useQuery<any[]>({
    queryKey: ["habits"],
    queryFn: async () => {
      const res = await apiClient.get("/habits");
      return res.data;
    }
  });

  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await apiClient.get("/goals");
      return res.data;
    }
  });

  const { data: financeSummaryData } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: () => financeApi.getSummary()
  });

  const activeGoalsCount = goals.filter((g: any) => g.status === "active").length;
  const netBalance = financeSummaryData?.monthlyTotals?.net ?? 0;
  const netBalanceFormatted = `$${netBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const quickPrompts = [
    "Summarize my week's progress",
    "What should I prioritize today?",
    "Analyze my spending habits",
    "Suggest a goal milestone break-down"
  ];

  // Formatted date string for header
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="w-full flex flex-col">
      {/* 1. EXECUTIVE HERO HEADER */}
      <section className="w-full bg-[#213183] text-white px-6 lg:px-10 py-12 lg:py-16 flex flex-col gap-6 relative overflow-hidden">
        {/* Decorative subtle glow in background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0075de] rounded-full blur-[100px] opacity-20 pointer-events-none" />

        <div className="flex items-center gap-3 z-10">
          <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium flex items-center gap-2 backdrop-blur-sm shadow-[0_0_15px_rgba(151,165,254,0.3)]">
            <div className="size-2 rounded-full bg-[#97a5fe] animate-pulse" />
            LifeOS Executive Hub
          </div>
          <span className="text-white/70">|</span>
          <span className="text-white/90 text-xs font-medium">{formattedDate}</span>
        </div>

        <div className="max-w-3xl z-10">
          <h1 className="text-3xl lg:text-5xl font-bold tracking-[-1.875px] mb-4 text-white">
            {greeting}, {user?.name || "Explorer"}{" "}
            <span className="inline-block hover:rotate-12 transition-transform cursor-pointer">👋</span>
          </h1>
          <p className="text-base lg:text-lg text-white/80 max-w-2xl">
            Here is your daily command center across tasks, habits, finances, and goals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 z-10">
          {/* Quick Actions */}
          <Link
            to="/notes"
            className="px-4 py-2 rounded-full bg-white text-[#1a1c1c] text-xs font-semibold flex items-center gap-2 hover:bg-[#faf9f8] transition-colors shadow-xs"
          >
            <Plus className="size-3.5 text-amber-600" />
            Note
          </Link>
          <Link
            to="/habits"
            className="px-4 py-2 rounded-full bg-white text-[#1a1c1c] text-xs font-semibold flex items-center gap-2 hover:bg-[#faf9f8] transition-colors shadow-xs"
          >
            <Plus className="size-3.5 text-emerald-600" />
            Habit
          </Link>
          <Link
            to="/goals"
            className="px-4 py-2 rounded-full bg-white text-[#1a1c1c] text-xs font-semibold flex items-center gap-2 hover:bg-[#faf9f8] transition-colors shadow-xs"
          >
            <Plus className="size-3.5 text-purple-600" />
            Goal
          </Link>
          <Link
            to="/finance"
            className="px-4 py-2 rounded-full bg-white text-[#1a1c1c] text-xs font-semibold flex items-center gap-2 hover:bg-[#faf9f8] transition-colors shadow-xs"
          >
            <Plus className="size-3.5 text-blue-600" />
            Expense
          </Link>

          {/* Primary CTA */}
          <Link
            to="/chat"
            className="sm:ml-auto px-6 py-2.5 rounded-lg bg-[#005db2] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#00468a] hover:-translate-y-0.5 transition-all shadow-lg shadow-[#005db2]/30"
          >
            <Sparkles className="size-4" />
            AI Assistant
          </Link>
        </div>
      </section>

      {/* Main Content Overlapping Wrapper */}
      <div className="px-6 lg:px-10 py-8 flex flex-col gap-6 max-w-7xl mx-auto w-full -mt-8 z-20">
        {/* 2. AI DAILY BRIEFING CARD */}
        <DailySummaryCard
          isLoading={isSummaryLoading}
          isError={isSummaryError}
          onRetry={() => refetch()}
          generated={summaryData?.generated}
          deliveryTime={summaryData?.deliveryTime}
          summary={summaryData?.summary}
        />

        {/* 3. QUICK KPI STAT GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Schedule"
            value={`${todayEvents.length} Event${todayEvents.length === 1 ? "" : "s"}`}
            subtitle={todayEvents.length > 0 ? "Upcoming agenda" : "Free day"}
            icon={Calendar}
            colorVariant="blue"
            href="/calendar"
            badgeText="View"
          />

          <StatCard
            title="Active Habits"
            value={habits.length}
            subtitle="Daily routine"
            icon={Activity}
            colorVariant="emerald"
            href="/habits"
            badgeText="Track"
          />

          <StatCard
            title="Active Goals"
            value={activeGoalsCount}
            subtitle="Key objectives"
            icon={Target}
            colorVariant="purple"
            href="/goals"
            badgeText="Focus"
          />

          <StatCard
            title="Net Cashflow"
            value={netBalanceFormatted}
            subtitle="Current Month"
            icon={Wallet}
            colorVariant="amber"
            href="/finance"
            badgeText="Budget"
          />
        </div>

        {/* 4. MAIN CONTENT (7:5 Ratio Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
          {/* LEFT COLUMN (7/12) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <TodayScheduleWidget />
            <TodayHabitsWidget />
            <GoalsOverviewWidget />
          </div>

          {/* RIGHT COLUMN (5/12) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <FinanceSnapshotWidget />
            <RecentNotesWidget />

            {/* AI Quick Assistant Card */}
            <div className="bg-white rounded-xl border border-[#e6e6e6] p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-5 text-[#005db2]" />
                <h3 className="text-[20px] font-bold text-[#1a1c1c]">Ask LifeOS AI</h3>
              </div>
              <p className="text-xs text-[#717784] mb-4">
                Ask your AI copilot to synthesize your schedule, plan goals, or offer habit coaching:
              </p>
              <div className="flex flex-col gap-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/chat?prompt=${encodeURIComponent(prompt)}`)}
                    className="group flex items-center justify-between rounded-lg border border-[#e3e2e1] bg-[#faf9f8] px-3 py-2.5 text-xs font-medium text-[#1a1c1c] transition-all hover:bg-white hover:border-[#005db2]/40 text-left"
                  >
                    <span className="truncate">{prompt}</span>
                    <ArrowUpRight className="size-3.5 text-[#717784] group-hover:text-[#005db2] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


