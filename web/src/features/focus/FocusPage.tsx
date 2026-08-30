import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Brain,
  Clock,
  Sparkles,
  History,
  GraduationCap,
  ArrowRight,
  BarChart3,
  Timer as TimerIcon
} from "lucide-react";
import type {
  FocusSession,
  FocusLinkedType,
  FocusPhase,
  FocusSummaryResponse,
  FocusSessionStatus
} from "@lifeos/shared";
import { focusApi } from "./api/focusApi";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { FocusSummaryChart } from "./components/FocusSummaryChart";
import { SessionHistoryList } from "./components/SessionHistoryList";

export function FocusPage() {
  const [searchParams] = useSearchParams();
  const initialLinkedType = (searchParams.get("linkedType") as FocusLinkedType) || "none";
  const initialLinkedId = searchParams.get("linkedId") || null;
  const initialLinkedTitle = searchParams.get("linkedTitle") || "";

  // View navigation: "timer" | "analytics" | "history"
  const [activeTab, setActiveTab] = useState<"timer" | "analytics" | "history">("timer");

  // Timer & Session state
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Analytics summary state
  const [summaryRange, setSummaryRange] = useState<"day" | "week" | "month">("week");
  const [summaryData, setSummaryData] = useState<FocusSummaryResponse | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // History list filter state
  const [historySessions, setHistorySessions] = useState<FocusSession[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLimit] = useState(15);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [filterLinkedType, setFilterLinkedType] = useState<FocusLinkedType | "">("");
  const [filterStatus, setFilterStatus] = useState<FocusSessionStatus | "">("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Load active session and quick recent history
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const [activeRes, listRes] = await Promise.all([
        focusApi.getActiveSession(),
        focusApi.listSessions({ limit: 5 })
      ]);
      setActiveSession(activeRes.session);
      setRecentSessions(listRes.sessions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Load analytics summary
  const loadSummary = useCallback(async (range: "day" | "week" | "month") => {
    try {
      setIsSummaryLoading(true);
      const res = await focusApi.getFocusSummary({ range });
      setSummaryData(res);
    } catch {
      // ignore
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // Load history list with filters
  const loadHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const params: any = {
        page: historyPage,
        limit: historyLimit
      };
      if (filterLinkedType) params.linkedType = filterLinkedType;
      if (filterStatus) params.status = filterStatus;
      if (filterStartDate) params.startDate = new Date(filterStartDate).toISOString();
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setUTCHours(23, 59, 59, 999);
        params.endDate = end.toISOString();
      }

      const res = await focusApi.listSessions(params);
      setHistorySessions(res.sessions || []);
      setHistoryTotal(res.pagination?.total || 0);
      setHistoryTotalPages(res.pagination?.pages || 1);
    } catch {
      // ignore
    } finally {
      setIsHistoryLoading(false);
    }
  }, [historyPage, historyLimit, filterLinkedType, filterStatus, filterStartDate, filterEndDate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (activeTab === "analytics") {
      loadSummary(summaryRange);
    } else if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, summaryRange, loadSummary, loadHistory]);

  // Handlers for PomodoroTimer actions
  const handleStart = async (config: {
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
    linkedType: FocusLinkedType;
    linkedId: string | null;
    dndDuringFocus: boolean;
  }) => {
    try {
      const res = await focusApi.startSession(config);
      setActiveSession(res.session);
      toast.success("Focus session started! Stay in the zone.");
      loadSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to start session");
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    try {
      const res = await focusApi.pauseSession(activeSession.id);
      setActiveSession(res.session);
      toast.info("Timer paused. Take a quick moment.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to pause session");
    }
  };

  const handleResume = async () => {
    if (!activeSession) return;
    try {
      const res = await focusApi.resumeSession(activeSession.id);
      setActiveSession(res.session);
      toast.success("Timer resumed!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to resume session");
    }
  };

  const handleComplete = async () => {
    if (!activeSession) return;
    try {
      const res = await focusApi.completeSession(activeSession.id);
      setActiveSession(null);
      toast.success(`🎉 Session completed! +${res.session.totalFocusMinutes} mins of focus.`);
      loadSessions();
      if (activeTab === "analytics") loadSummary(summaryRange);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to complete session");
    }
  };

  const handleAbandon = async () => {
    if (!activeSession) return;
    try {
      const res = await focusApi.abandonSession(activeSession.id);
      setActiveSession(null);
      toast.warning(
        `Session ended early. Recorded ${res.session.totalFocusMinutes} mins of focus time.`
      );
      loadSessions();
      if (activeTab === "analytics") loadSummary(summaryRange);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to stop session");
    }
  };

  const handleIntervalComplete = async (completedPhase: FocusPhase, cycle: number) => {
    if (!activeSession) return;
    try {
      const res = await focusApi.intervalComplete(activeSession.id, {
        completedPhase,
        cycle
      });
      setActiveSession(res.session);
      if (completedPhase === "work") {
        toast.success(
          res.session.currentPhase === "long_break"
            ? "🎉 4 Cycles Completed! Take a 15-minute long break."
            : "☕ Work interval complete! Time for a 5-minute break."
        );
      } else {
        toast.info(`⚡ Break finished! Ready for Cycle ${res.session.currentCycle}.`);
      }
      loadSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to transition interval");
    }
  };

  // Aggregated Quick Stats for Today
  const totalFocusMinutesToday = recentSessions.reduce(
    (sum, s) => sum + (s.totalFocusMinutes || 0),
    0
  );
  const completedCountToday = recentSessions.filter(
    (s) => s.status === "completed"
  ).length;

  const handleClearFilters = () => {
    setFilterLinkedType("");
    setFilterStatus("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterSearch("");
    setHistoryPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f6f5f4] pb-16 pt-6 sm:pt-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#000000] tracking-tight">
              Focus & Pomodoro Timer
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0075de]/10 text-[#0075de] border border-[#0075de]/20">
              <Sparkles className="size-3" />
              Deep Work
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#615d59] mt-1">
            Structured intervals for distraction-free study and deep work execution.
          </p>
        </div>

        {/* Quick Study Navigation Link */}
        <Link
          to="/study"
          className="inline-flex items-center gap-2 text-xs text-[#0075de] font-semibold hover:underline bg-white px-3.5 py-2 rounded-lg border border-[#e6e6e6] shadow-2xs self-start sm:self-auto"
        >
          <GraduationCap className="size-4" />
          <span>Study Planner</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Main Tab Navigation */}
      <div className="inline-flex p-1 rounded-xl bg-white border border-[#e6e6e6] shadow-2xs mb-8">
        <button
          type="button"
          onClick={() => setActiveTab("timer")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "timer"
              ? "bg-[#0075de] text-white shadow-xs"
              : "text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4]"
          }`}
        >
          <TimerIcon className="size-3.5" />
          <span>Timer</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("analytics");
            loadSummary(summaryRange);
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "analytics"
              ? "bg-[#0075de] text-white shadow-xs"
              : "text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4]"
          }`}
        >
          <BarChart3 className="size-3.5" />
          <span>Summary & Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("history");
            loadHistory();
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "history"
              ? "bg-[#0075de] text-white shadow-xs"
              : "text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4]"
          }`}
        >
          <History className="size-3.5" />
          <span>History & Logs</span>
        </button>
      </div>

      {/* ─── TAB 1: TIMER VIEW ────────────────────────────────────────────── */}
      {activeTab === "timer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Column: Pomodoro Timer Component */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <PomodoroTimer
              session={activeSession}
              linkedType={initialLinkedType}
              linkedId={initialLinkedId}
              linkedTitle={initialLinkedTitle}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onComplete={handleComplete}
              onAbandon={handleAbandon}
              onIntervalComplete={handleIntervalComplete}
            />
          </div>

          {/* Right Column: Quick Stats & Recent Focus Sessions */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Daily Quick Stats Card */}
            <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-2xs p-5">
              <h2 className="text-xs font-semibold text-[#000000] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="size-3.5 text-[#0075de]" />
                Recent Productivity
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#f6f5f4] rounded-lg">
                  <span className="text-[11px] text-[#615d59] font-medium block">Total Focus</span>
                  <span className="text-xl font-bold text-[#000000] tabular-nums mt-0.5 block">
                    {Math.round(totalFocusMinutesToday)}
                    <span className="text-xs font-normal text-[#615d59] ml-1">mins</span>
                  </span>
                </div>
                <div className="p-3 bg-[#f6f5f4] rounded-lg">
                  <span className="text-[11px] text-[#615d59] font-medium block">Completed</span>
                  <span className="text-xl font-bold text-[#000000] tabular-nums mt-0.5 block">
                    {completedCountToday}
                    <span className="text-xs font-normal text-[#615d59] ml-1">sessions</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Focus History Card */}
            <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-2xs p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-[#000000] uppercase tracking-wider flex items-center gap-2">
                  <History className="size-3.5 text-[#615d59]" />
                  Recent Sessions
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="text-xs text-[#0075de] font-semibold hover:underline"
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-[#a39e98]">Loading history...</div>
              ) : recentSessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#a39e98]">
                  No recent focus sessions recorded yet. Start your first session above!
                </div>
              ) : (
                <div className="divide-y divide-[#f6f5f4]">
                  {recentSessions.slice(0, 5).map((s) => {
                    const dateStr = new Date(s.startedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <div key={s.id} className="py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Brain className="size-3 text-[#0075de] shrink-0" />
                            <p className="text-xs font-medium text-[#000000] truncate">
                              {s.linkedType !== "none" ? `${s.linkedType.toUpperCase()} session` : "Focus session"}
                            </p>
                          </div>
                          <p className="text-[11px] text-[#a39e98] mt-0.5">{dateStr}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-semibold text-[#000000] tabular-nums block">
                            {s.totalFocusMinutes} min
                          </span>
                          <span
                            className={`text-[10px] font-medium capitalize px-1.5 py-0.5 rounded ${
                              s.status === "completed"
                                ? "bg-[#1aae39]/10 text-[#1aae39]"
                                : s.status === "active"
                                  ? "bg-[#0075de]/10 text-[#0075de]"
                                  : s.status === "paused"
                                    ? "bg-[#615d59]/10 text-[#615d59]"
                                    : "bg-[#dd5b00]/10 text-[#dd5b00]"
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ANALYTICS & SUMMARY VIEW ───────────────────────────────── */}
      {activeTab === "analytics" && (
        <FocusSummaryChart
          data={summaryData}
          selectedRange={summaryRange}
          onRangeChange={(range) => {
            setSummaryRange(range);
            loadSummary(range);
          }}
          isLoading={isSummaryLoading}
        />
      )}

      {/* ─── TAB 3: SESSION HISTORY LIST VIEW ──────────────────────────────── */}
      {activeTab === "history" && (
        <SessionHistoryList
          sessions={historySessions}
          total={historyTotal}
          page={historyPage}
          limit={historyLimit}
          totalPages={historyTotalPages}
          isLoading={isHistoryLoading}
          selectedLinkedType={filterLinkedType}
          onSelectLinkedType={(t) => {
            setFilterLinkedType(t);
            setHistoryPage(1);
          }}
          selectedStatus={filterStatus}
          onSelectStatus={(st) => {
            setFilterStatus(st);
            setHistoryPage(1);
          }}
          startDate={filterStartDate}
          onSelectStartDate={(d) => {
            setFilterStartDate(d);
            setHistoryPage(1);
          }}
          endDate={filterEndDate}
          onSelectEndDate={(d) => {
            setFilterEndDate(d);
            setHistoryPage(1);
          }}
          search={filterSearch}
          onSearchChange={setFilterSearch}
          onPageChange={setHistoryPage}
          onClearFilters={handleClearFilters}
        />
      )}
    </div>
  );
}
