import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Calendar,
  Activity,
  Target,
  Wallet,
  Plus,
  MessageSquare,
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

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/80 backdrop-blur-sm border border-border p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              LifeOS Executive Hub
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric"
              })}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {greeting}, {user?.name || "Explorer"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here is your daily command center across tasks, habits, finances, and goals.
          </p>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/notes"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:shadow-xs"
          >
            <Plus className="size-3.5 text-amber-500" />
            Note
          </Link>
          <Link
            to="/habits"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:shadow-xs"
          >
            <Plus className="size-3.5 text-emerald-500" />
            Habit
          </Link>
          <Link
            to="/goals"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:shadow-xs"
          >
            <Plus className="size-3.5 text-purple-500" />
            Goal
          </Link>
          <Link
            to="/finance"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-accent hover:shadow-xs"
          >
            <Plus className="size-3.5 text-blue-500" />
            Expense
          </Link>
          <Link
            to="/chat"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            <MessageSquare className="size-3.5" />
            AI Assistant
          </Link>
        </div>
      </div>

      

      {/* AI Daily Briefing Banner */}
      <DailySummaryCard
        isLoading={isSummaryLoading}
        isError={isSummaryError}
        onRetry={() => refetch()}
        generated={summaryData?.generated}
        deliveryTime={summaryData?.deliveryTime}
        summary={summaryData?.summary}
      />


      {/* Quick KPI Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* 2-Column Responsive Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Primary Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <TodayScheduleWidget />
          <TodayHabitsWidget />
          <GoalsOverviewWidget />
        </div>

        {/* Right Secondary Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* AI Quick Assistant Card */}
          <div className="flex flex-col rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Ask LifeOS AI</h3>
                <p className="text-[11px] text-muted-foreground">Instant smart productivity answers</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Ask your AI copilot to synthesize your schedule, plan goals, or offer habit coaching:
            </p>

            <div className="flex flex-col gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(`/chat?prompt=${encodeURIComponent(prompt)}`)}
                  className="group flex items-center justify-between rounded-xl border border-border/50 bg-background/80 px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-accent hover:border-primary/40 text-left"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <FinanceSnapshotWidget />
          <RecentNotesWidget />
        </div>
      </div>
    </div>
  );
}
