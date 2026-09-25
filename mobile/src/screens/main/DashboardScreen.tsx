import { useEffect, useState, useCallback, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, RefreshControl, StatusBar } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Sparkles,
  FileText,
  Receipt,
  PlusCircle,
  Pin,
  Wallet,
  Droplets,
  BookOpen,
  Dumbbell,
  Bell,
  ChevronRight
} from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { DailySummaryCard } from "../../components/ai/DailySummaryCard";

import { apiClient } from "../../services/apiClient";
import { aiChatService, type DailySummaryResponse } from "../../services/aiChatService";
import { notificationApiService } from "../../services/notificationApiService";
import { NotificationModal } from "../../components/notifications/NotificationModal";
import { syncEngine } from "../../services/syncEngine";
import { eventRepo } from "../../db/repositories/eventRepo";
import { habitRepo } from "../../db/repositories/habitRepo";
import { financeRepo, type FinanceSummaryData } from "../../db/repositories/financeRepo";
import { noteRepo } from "../../db/repositories/noteRepo";
import { radius, spacing } from "../../theme";
import type { LocalEvent, LocalHabit, LocalNote } from "../../db/schema";

// Stitch Design Color Tokens
const STITCH_COLORS = {
  primary: "#005db2",
  primaryContainer: "#0075de",
  primaryContainerSoft: "rgba(0, 117, 222, 0.12)",
  secondary: "#465f88",
  secondaryContainerSoft: "rgba(70, 95, 136, 0.12)",
  tertiaryContainer: "#c15600",
  tertiaryContainerSoft: "rgba(193, 86, 0, 0.12)",
  aiPurple: "#773200",
  aiPurpleSoft: "rgba(119, 50, 0, 0.10)",
  surfaceLowest: "#ffffff",
  surfaceLow: "#f1f3fc",
  surfaceHighest: "#e0e2eb",
  paperBorder: "#e6e6e6",
  textOnSurface: "#181c22",
  textVariant: "#414753"
};

export function DashboardScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const isOnline = useSyncStore((state) => state.isOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [todayEvents, setTodayEvents] = useState<LocalEvent[]>([]);
  const [habits, setHabits] = useState<LocalHabit[]>([]);
  const [habitCheckInsMap, setHabitCheckInsMap] = useState<Record<string, string[]>>({});
  const [todayCheckInsCount, setTodayCheckInsCount] = useState(0);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummaryData>({
    totalExpense: 0,
    totalIncome: 0,
    netSavings: 0,
    savingsRate: 0,
    categoryBreakdown: [],
    monthlyTrends: []
  });
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState<number>(0);
  const [pinnedNote, setPinnedNote] = useState<LocalNote | null>(null);

  // Daily Summary State
  const [dailySummaryState, setDailySummaryState] = useState<DailySummaryResponse>({
    generated: false,
    reason: null,
    deliveryTime: "07:00",
    summary: null
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSummaryError, setIsSummaryError] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split("T")[0];

  // Format past 4 dates for streak circles [today-3, today-2, today-1, today]
  const recent4Days = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - (3 - i));
      return d.toISOString().split("T")[0];
    });
  }, [todayStr]);

  const loadDailySummary = useCallback(async () => {
    if (!isOnline) return;
    setIsSummaryLoading(true);
    setIsSummaryError(false);
    try {
      const res = await aiChatService.getTodaySummary();
      setDailySummaryState(res);
    } catch {
      setIsSummaryError(true);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [isOnline]);

  const handleGenerateNow = async () => {
    if (!isOnline) return;
    setIsGeneratingSummary(true);
    try {
      const res = await aiChatService.getTodaySummary();
      setDailySummaryState(res);
    } catch {
      setIsSummaryError(true);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    // 1. FIRST: Instant load from local SQLite (Offline-First / Zero Latency)
    try {
      const allEvents = await eventRepo.listEvents(user.id);
      const filteredEvents = allEvents
        .filter((e) => {
          if (!e.startTime) return false;
          const eventDate = new Date(e.startTime);
          const isSameDay =
            eventDate.getFullYear() === todayDate.getFullYear() &&
            eventDate.getMonth() === todayDate.getMonth() &&
            eventDate.getDate() === todayDate.getDate();
          return isSameDay || e.startTime.startsWith(todayStr);
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setTodayEvents(filteredEvents);

      const allHabits = await habitRepo.listHabits(user.id);
      setHabits(allHabits);

      const userCheckIns = await habitRepo.getCheckInsForUser(user.id);
      const checkInsByHabit: Record<string, string[]> = {};
      userCheckIns.forEach((ci) => {
        if (!checkInsByHabit[ci.habitId]) {
          checkInsByHabit[ci.habitId] = [];
        }
        checkInsByHabit[ci.habitId].push(ci.date);
      });
      setHabitCheckInsMap(checkInsByHabit);

      const todayCheckIns = userCheckIns.filter((ci) => ci.date === todayStr);
      setTodayCheckInsCount(todayCheckIns.length);

      const summary = await financeRepo.getFinanceSummary(user.id);
      setFinanceSummary(summary);

      const budgets = await financeRepo.listBudgets(user.id);
      const totalBudget = budgets.reduce((acc, b) => acc + (b.limit || 0), 0);
      setMonthlyBudgetLimit(totalBudget);

      const allNotes = await noteRepo.listNotes(user.id);
      if (allNotes.length > 0) {
        const pinned = allNotes.find((n) => {
          try {
            const tags = JSON.parse(n.tags || "[]");
            return Array.isArray(tags) && tags.some((t: string) => t.toLowerCase() === "pinned");
          } catch {
            return false;
          }
        });
        setPinnedNote(pinned || allNotes[0]);
      } else {
        setPinnedNote(null);
      }
    } catch (localErr) {
      console.warn("[Dashboard] Error reading local SQLite:", localErr);
    }

    // 2. SECOND: When online, fetch LIVE ACTUAL DATA directly from the server database
    if (isOnline) {
      try {
        const startOfDay = new Date(todayDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(todayDate);
        endOfDay.setHours(23, 59, 59, 999);

        const [eventsRes, habitsRes, financeRes, budgetsRes, notesRes] = await Promise.allSettled([
          apiClient.get<{ events: any[] }>("/calendar/events", {
            params: {
              rangeStart: startOfDay.toISOString(),
              rangeEnd: endOfDay.toISOString(),
              view: "day"
            }
          }),
          apiClient.get<any[]>("/habits"),
          apiClient.get<{
            monthlyTotals?: { income?: number; expense?: number; net?: number };
            categoryBreakdown?: Array<{ category: string; amount: number }>;
          }>("/finance/summary"),
          apiClient.get<{ budgets: any[] }>("/finance/budgets"),
          apiClient.get<{ notes: any[] }>("/notes", { params: { limit: 10 } })
        ]);

        // A. Calendar Events from Server
        if (eventsRes.status === "fulfilled" && Array.isArray(eventsRes.value.data?.events)) {
          const rawServerEvents = eventsRes.value.data.events;
          const mappedEvents: LocalEvent[] = rawServerEvents.map((e: any) => ({
            id: e.eventId || e.occurrenceId || e.id || e._id,
            userId: user.id,
            title: e.title || "Untitled Event",
            description: e.description || "",
            location: e.location || "",
            startTime: e.startTime,
            endTime: e.endTime,
            timezone: e.timezone || "UTC",
            isAllDay: e.isAllDay ? 1 : 0,
            recurrenceRule: e.recurrenceRule || null,
            recurrenceEndDate: e.recurrenceEndDate || null,
            exceptions: "[]",
            reminderLeadMinutes: e.reminderLeadMinutes ?? null,
            reminderJobId: null,
            isOverride: e.isOverridden ? 1 : 0,
            parentEventId: null,
            syncStatus: "synced",
            lastModifiedAt: Date.now(),
            createdAt: e.createdAt || new Date().toISOString(),
            updatedAt: e.updatedAt || new Date().toISOString()
          }));
          setTodayEvents(mappedEvents);
        }

        // B. Habits from Server
        if (habitsRes.status === "fulfilled" && Array.isArray(habitsRes.value.data)) {
          const rawHabits = habitsRes.value.data;
          const mappedHabits: LocalHabit[] = rawHabits.map((h: any) => ({
            id: h._id || h.id,
            userId: user.id,
            title: h.title,
            frequency:
              typeof h.frequency === "object" ? JSON.stringify(h.frequency) : h.frequency || "{}",
            reminderTime: h.reminderTime || null,
            reminderEnabled: h.reminderEnabled ? 1 : 0,
            currentStreak: h.currentStreak || 0,
            longestStreak: h.longestStreak || 0,
            completionRate: h.completionRate || 0,
            lastCheckInDate: h.lastCheckInDate || null,
            syncStatus: "synced",
            lastModifiedAt: Date.now(),
            createdAt: h.createdAt || new Date().toISOString(),
            updatedAt: h.updatedAt || new Date().toISOString()
          }));
          setHabits(mappedHabits);

          // Fetch recent check-ins for the active habits from server
          try {
            const checkInPromises = mappedHabits.slice(0, 5).map(async (h) => {
              const res = await apiClient.get<any[]>(`/habits/${h.id}/check-ins`, {
                params: {
                  startDate: recent4Days[0],
                  endDate: recent4Days[3]
                }
              });
              return {
                habitId: h.id,
                dates: (res.data || []).filter((c: any) => c.completed).map((c: any) => c.date)
              };
            });

            const checkInResults = await Promise.allSettled(checkInPromises);
            const serverCheckInsMap: Record<string, string[]> = {};
            let todayCount = 0;

            checkInResults.forEach((result) => {
              if (result.status === "fulfilled" && result.value) {
                serverCheckInsMap[result.value.habitId] = result.value.dates;
                if (result.value.dates.includes(todayStr)) {
                  todayCount++;
                }
              }
            });

            setHabitCheckInsMap((prev) => ({ ...prev, ...serverCheckInsMap }));
            if (todayCount > 0) {
              setTodayCheckInsCount(todayCount);
            }
          } catch {}
        }

        // C. Finance Summary & Budgets from Server
        let serverExpense = 0;
        let serverIncome = 0;
        let serverBreakdown: Array<{ category: string; amount: number; percentage?: number }> = [];

        if (financeRes.status === "fulfilled" && financeRes.value.data) {
          const data = financeRes.value.data;
          serverExpense = data.monthlyTotals?.expense || 0;
          serverIncome = data.monthlyTotals?.income || 0;
          serverBreakdown = data.categoryBreakdown || [];

          const totalSpendAmt = serverBreakdown.reduce((sum, c) => sum + (c.amount || 0), 0);
          const formattedBreakdown = serverBreakdown.map((c) => ({
            category: c.category,
            amount: c.amount,
            percentage:
              totalSpendAmt > 0
                ? Math.round((c.amount / totalSpendAmt) * 100)
                : c.percentage || 0
          }));

          setFinanceSummary({
            totalExpense: serverExpense,
            totalIncome: serverIncome,
            netSavings: serverIncome - serverExpense,
            savingsRate:
              serverIncome > 0
                ? Math.max(0, Math.round(((serverIncome - serverExpense) / serverIncome) * 100))
                : 0,
            categoryBreakdown: formattedBreakdown,
            monthlyTrends: []
          });
        }

        if (budgetsRes.status === "fulfilled" && budgetsRes.value.data?.budgets) {
          const budgets = budgetsRes.value.data.budgets;
          const totalLimit = budgets.reduce((acc: number, b: any) => acc + (b.limit || 0), 0);
          setMonthlyBudgetLimit(totalLimit);
        }

        // D. Notes from Server
        if (notesRes.status === "fulfilled" && Array.isArray(notesRes.value.data?.notes)) {
          const serverNotes = notesRes.value.data.notes;
          if (serverNotes.length > 0) {
            const mappedNotes: LocalNote[] = serverNotes.map((n: any) => ({
              id: n._id || n.id,
              userId: user.id,
              title: n.title,
              content: typeof n.content === "object" ? JSON.stringify(n.content) : n.content || "",
              contentText: n.contentText || "",
              folderId: n.folderId || null,
              tags: Array.isArray(n.tags) ? JSON.stringify(n.tags) : n.tags || "[]",
              syncStatus: "synced",
              lastModifiedAt: Date.now(),
              createdAt: n.createdAt || new Date().toISOString(),
              updatedAt: n.updatedAt || new Date().toISOString()
            }));

            const pinned = mappedNotes.find((n) => {
              try {
                const tags = JSON.parse(n.tags || "[]");
                return (
                  Array.isArray(tags) && tags.some((t: string) => t.toLowerCase() === "pinned")
                );
              } catch {
                return false;
              }
            });
            setPinnedNote(pinned || mappedNotes[0]);
          } else {
            setPinnedNote(null);
          }
        }

        // Also trigger background syncEngine to reconcile local SQLite mirror
        syncEngine.syncNow().catch(() => {});
      } catch (serverErr) {
        console.warn("[Dashboard] Error fetching from server API, using local SQLite:", serverErr);
      }
    }
  }, [user?.id, todayStr, todayDate, isOnline, recent4Days]);

  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!isOnline) return;
    try {
      const count = await notificationApiService.getUnreadCount();
      setUnreadNotificationCount(count);
    } catch {}
  }, [isOnline]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (isOnline) {
        await syncEngine.syncNow().catch(() => {});
      }
      await Promise.all([loadDashboardData(), loadDailySummary(), loadUnreadCount()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Reload when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      loadDailySummary();
      loadUnreadCount();
    }, [loadDashboardData, loadDailySummary, loadUnreadCount])
  );

  // Background sync on mount to ensure local SQLite has latest server data
  useEffect(() => {
    loadDashboardData();
    loadDailySummary();
    loadUnreadCount();

    if (isOnline) {
      syncEngine
        .syncNow()
        .then(() => {
          loadDashboardData();
        })
        .catch(() => {});
    }
  }, [isOnline, loadDashboardData, loadDailySummary, loadUnreadCount]);

  // Toggle habit check-in (SQLite + Server API)
  const handleToggleHabit = async (habitId: string) => {
    if (!user?.id) return;
    try {
      await habitRepo.toggleCheckIn(habitId, user.id, todayStr);

      if (isOnline) {
        try {
          const currentDates = habitCheckInsMap[habitId] || [];
          const isCurrentlyDone = currentDates.includes(todayStr);
          await apiClient.post(`/habits/${habitId}/check-in`, {
            date: todayStr,
            completed: !isCurrentlyDone
          });
        } catch {}
      }

      await loadDashboardData();
      syncEngine.syncNow().catch(() => {});
    } catch {}
  };

  // Helper for greeting time
  const currentHour = todayDate.getHours();
  const greetingTime =
    currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name ? user.name.trim().split(" ")[0] : "Friend";

  // Calculate Focus / Completion Score based on actual data
  const totalTasks = habits.length + todayEvents.length;
  const completedTasks = todayCheckInsCount;
  const remainingCount = Math.max(0, totalTasks - completedTasks);
  const focusScore =
    totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 100;

  // Format relative event time badge
  const getEventTimeBadge = (startTime: string) => {
    const now = new Date();
    const eventDate = new Date(startTime);
    const diffMs = eventDate.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins > 0 && diffMins <= 60) {
      return `in ${diffMins}m`;
    }
    if (diffMins > 60 && diffMins <= 180) {
      const hrs = Math.floor(diffMins / 60);
      return `in ${hrs}h`;
    }
    return eventDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Habit icon renderer helper
  const getHabitIcon = (title: string, index: number) => {
    const lower = title.toLowerCase();
    if (lower.includes("water") || lower.includes("hydrat")) {
      return <Droplets size={16} color={STITCH_COLORS.primaryContainer} />;
    }
    if (lower.includes("read") || lower.includes("book") || lower.includes("learn")) {
      return <BookOpen size={16} color={STITCH_COLORS.tertiaryContainer} />;
    }
    if (
      lower.includes("fit") ||
      lower.includes("gym") ||
      lower.includes("work") ||
      lower.includes("run")
    ) {
      return <Dumbbell size={16} color={STITCH_COLORS.secondary} />;
    }
    if (index % 3 === 0) return <Droplets size={16} color={STITCH_COLORS.primaryContainer} />;
    if (index % 3 === 1) return <BookOpen size={16} color={STITCH_COLORS.tertiaryContainer} />;
    return <Dumbbell size={16} color={STITCH_COLORS.secondary} />;
  };

  const getHabitDotColor = (index: number) => {
    if (index % 3 === 0) return STITCH_COLORS.primaryContainer;
    if (index % 3 === 1) return STITCH_COLORS.tertiaryContainer;
    return STITCH_COLORS.secondary;
  };

  return (
    <ScreenContainer
      scrollable
      includeDockPadding
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={STITCH_COLORS.primary}
        />
      }
    >
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <ThemedText variant="heading2" style={styles.brandTitle}>
          LifeOS
        </ThemedText>
        <View style={styles.topHeaderRight}>
          <ThemedText variant="caption" style={styles.dateBadgeText}>
            {todayDate
              .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
              .toUpperCase()}
          </ThemedText>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.notificationBtn}
            onPress={() => setIsNotificationModalVisible(true)}
          >
            <Bell size={18} color={STITCH_COLORS.textVariant} />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <ThemedText style={styles.badgeText}>
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Greeting Island */}
      <View style={styles.heroIsland}>
        <ThemedText variant="heading1" style={styles.heroHeading}>
          {greetingTime}, {firstName}
        </ThemedText>

        <View style={styles.heroSubRow}>
          <ThemedText variant="bodyMd" style={styles.heroSubtitle}>
            {totalTasks === 0
              ? "No habits or events scheduled today"
              : remainingCount === 0
                ? "All caught up! You've completed all tasks today"
                : `You're on track with ${remainingCount} ${remainingCount === 1 ? "task" : "tasks"} remaining today`}
          </ThemedText>

          <View style={styles.focusScorePill}>
            <Sparkles size={15} color={STITCH_COLORS.primary} />
            <ThemedText variant="caption" style={styles.focusScoreText}>
              Focus Score:{" "}
              <ThemedText variant="caption" style={styles.focusScoreValue}>
                {focusScore}%
              </ThemedText>
            </ThemedText>
            <View style={styles.focusProgressBarTrack}>
              <View style={[styles.focusProgressBarFill, { width: `${focusScore}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Quick Action Grid */}
      <View style={styles.quickActionGrid}>
        {/* Quick Note */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.quickActionItem}
          onPress={() => navigation?.navigate("Notes")}
        >
          <View
            style={[
              styles.quickActionIconWrap,
              { backgroundColor: STITCH_COLORS.primaryContainerSoft }
            ]}
          >
            <FileText size={20} color={STITCH_COLORS.primaryContainer} />
          </View>
          <ThemedText variant="caption" style={styles.quickActionLabel}>
            Quick Note
          </ThemedText>
        </TouchableOpacity>

        {/* Log Expense */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.quickActionItem}
          onPress={() => navigation?.navigate("Finance")}
        >
          <View
            style={[
              styles.quickActionIconWrap,
              { backgroundColor: STITCH_COLORS.tertiaryContainerSoft }
            ]}
          >
            <Receipt size={20} color={STITCH_COLORS.tertiaryContainer} />
          </View>
          <ThemedText variant="caption" style={styles.quickActionLabel}>
            Log Expense
          </ThemedText>
        </TouchableOpacity>

        {/* New Task */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.quickActionItem}
          onPress={() => navigation?.navigate("Calendar")}
        >
          <View
            style={[
              styles.quickActionIconWrap,
              { backgroundColor: STITCH_COLORS.secondaryContainerSoft }
            ]}
          >
            <PlusCircle size={20} color={STITCH_COLORS.secondary} />
          </View>
          <ThemedText variant="caption" style={styles.quickActionLabel}>
            New Task
          </ThemedText>
        </TouchableOpacity>

        {/* Ask AI */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.quickActionItem}
          onPress={() => navigation?.navigate("Assistant")}
        >
          <View
            style={[styles.quickActionIconWrap, { backgroundColor: STITCH_COLORS.aiPurpleSoft }]}
          >
            <Sparkles size={20} color={STITCH_COLORS.aiPurple} />
          </View>
          <ThemedText variant="caption" style={styles.quickActionLabel}>
            Ask AI
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Main Content Sections */}
      <View style={styles.sectionsContainer}>
        {/* Today's Timeline Section */}
        <Card style={styles.stitchCard}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText variant="heading3" style={styles.cardSectionTitle}>
              Today's Timeline
            </ThemedText>
            <TouchableOpacity onPress={() => navigation?.navigate("Calendar")}>
              <ThemedText
                variant="caption"
                color={STITCH_COLORS.primary}
                style={{ fontWeight: "600" }}
              >
                View all
              </ThemedText>
            </TouchableOpacity>
          </View>

          {todayEvents.length === 0 ? (
            <View style={styles.emptyCardContainer}>
              <ThemedText variant="bodySm" style={styles.emptyCardText}>
                No events scheduled for today
              </ThemedText>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.emptyCardActionBtn}
                onPress={() => navigation?.navigate("Calendar")}
              >
                <PlusCircle size={14} color={STITCH_COLORS.primary} />
                <ThemedText variant="caption" style={styles.emptyCardActionBtnText}>
                  Add Event
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {todayEvents.slice(0, 4).map((event, idx) => (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.7}
                  onPress={() => navigation?.navigate("Calendar")}
                  style={[
                    styles.timelineItem,
                    idx === Math.min(todayEvents.length, 4) - 1 ? { borderBottomWidth: 0 } : null
                  ]}
                >
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor:
                          idx === 0 ? STITCH_COLORS.primaryContainer : STITCH_COLORS.surfaceHighest
                      }
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <ThemedText variant="bodySm" style={styles.timelineItemTitle} numberOfLines={1}>
                      {event.title}
                    </ThemedText>
                    <ThemedText variant="caption" style={styles.timelineItemMeta} numberOfLines={1}>
                      {new Date(event.startTime).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit"
                      })}{" "}
                      {event.location ? `• ${event.location}` : ""}
                    </ThemedText>
                  </View>
                  {idx === 0 && (
                    <View style={styles.timelineBadge}>
                      <ThemedText variant="caption" style={styles.timelineBadgeText}>
                        {getEventTimeBadge(event.startTime)}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Habit Streak Section */}
        <Card style={styles.stitchCard}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText variant="heading3" style={styles.cardSectionTitle}>
              Habit Streak
            </ThemedText>
            <TouchableOpacity onPress={() => navigation?.navigate("Habits & Goals")}>
              <ThemedText
                variant="caption"
                color={STITCH_COLORS.primary}
                style={{ fontWeight: "600" }}
              >
                Manage
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.habitsList}>
            {habits.length === 0 ? (
              <View style={styles.emptyCardContainer}>
                <ThemedText variant="bodySm" style={styles.emptyCardText}>
                  No habits tracked yet
                </ThemedText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.emptyCardActionBtn}
                  onPress={() => navigation?.navigate("Habits & Goals")}
                >
                  <PlusCircle size={14} color={STITCH_COLORS.primary} />
                  <ThemedText variant="caption" style={styles.emptyCardActionBtnText}>
                    Create Habit
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              habits.slice(0, 4).map((h, idx) => {
                const dates = habitCheckInsMap[h.id] || [];
                const dotColor = getHabitDotColor(idx);

                return (
                  <TouchableOpacity
                    key={h.id}
                    activeOpacity={0.7}
                    onPress={() => handleToggleHabit(h.id)}
                    style={styles.habitRow}
                  >
                    <View style={styles.habitLeft}>
                      {getHabitIcon(h.title, idx)}
                      <ThemedText variant="bodySm" style={styles.habitTitle} numberOfLines={1}>
                        {h.title}
                      </ThemedText>
                    </View>
                    <View style={styles.streakDotsRow}>
                      {recent4Days.map((d, dIdx) => {
                        const isDone = dates.includes(d);
                        return (
                          <View
                            key={dIdx}
                            style={[
                              styles.streakDot,
                              {
                                backgroundColor: isDone ? dotColor : STITCH_COLORS.surfaceHighest
                              }
                            ]}
                          />
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </Card>

        {/* Finance Snapshot Section */}
        <Card style={styles.stitchCard}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation?.navigate("Finance")}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.iconTitleInline}>
                <Wallet size={18} color={STITCH_COLORS.textOnSurface} />
                <ThemedText variant="heading3" style={styles.cardSectionTitle}>
                  Finance Snapshot
                </ThemedText>
              </View>
              <ChevronRight size={18} color={STITCH_COLORS.textVariant} />
            </View>

            {/* Budget Progress Bar */}
            <View style={styles.budgetSection}>
              <View style={styles.budgetLabelsRow}>
                <ThemedText variant="caption" style={styles.budgetSubtitle}>
                  {monthlyBudgetLimit > 0 ? "Monthly Budget" : "Monthly Spending"}
                </ThemedText>
                <ThemedText variant="bodySm" style={styles.budgetAmountText}>
                  {monthlyBudgetLimit > 0
                    ? `$${Math.round(financeSummary.totalExpense).toLocaleString()} / $${Math.round(monthlyBudgetLimit).toLocaleString()}`
                    : `$${Math.round(financeSummary.totalExpense).toLocaleString()} spent this month`}
                </ThemedText>
              </View>

              {monthlyBudgetLimit > 0 ? (
                <ProgressBar
                  progress={Math.min(
                    100,
                    Math.round((financeSummary.totalExpense / monthlyBudgetLimit) * 100)
                  )}
                  height={8}
                  color={
                    financeSummary.totalExpense > monthlyBudgetLimit
                      ? "#ba1a1a"
                      : STITCH_COLORS.primaryContainer
                  }
                  backgroundColor={STITCH_COLORS.surfaceHighest}
                  style={{ marginTop: 6 }}
                />
              ) : null}
            </View>

            {/* Category Breakdown list */}
            <View style={styles.categorySpendList}>
              {financeSummary.categoryBreakdown.length > 0 ? (
                financeSummary.categoryBreakdown.slice(0, 3).map((cat, idx) => (
                  <View key={cat.category} style={styles.categorySpendRow}>
                    <View style={styles.categoryNameCol}>
                      <View
                        style={[
                          styles.categoryColorDot,
                          {
                            backgroundColor:
                              idx === 0
                                ? STITCH_COLORS.tertiaryContainer
                                : idx === 1
                                  ? STITCH_COLORS.secondary
                                  : STITCH_COLORS.primaryContainer
                          }
                        ]}
                      />
                      <ThemedText variant="caption" style={styles.categorySpendLabel}>
                        {cat.category}
                      </ThemedText>
                    </View>
                    <ThemedText variant="bodySm" style={styles.categorySpendValue}>
                      ${Math.round(cat.amount).toLocaleString()}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCardContainer}>
                  <ThemedText variant="bodySm" style={styles.emptyCardText}>
                    No expenses logged this month
                  </ThemedText>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.emptyCardActionBtn}
                    onPress={() => navigation?.navigate("Finance")}
                  >
                    <Receipt size={14} color={STITCH_COLORS.tertiaryContainer} />
                    <ThemedText
                      variant="caption"
                      style={[
                        styles.emptyCardActionBtnText,
                        { color: STITCH_COLORS.tertiaryContainer }
                      ]}
                    >
                      Log Expense
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Card>

        {/* Pinned Note Section */}
        <Card style={styles.stitchCard}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation?.navigate("Notes")}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.iconTitleInline}>
                <Pin size={18} color={STITCH_COLORS.textOnSurface} />
                <ThemedText variant="heading3" style={styles.cardSectionTitle}>
                  {pinnedNote ? "Pinned Note" : "Recent Notes"}
                </ThemedText>
              </View>
              <ChevronRight size={18} color={STITCH_COLORS.textVariant} />
            </View>

            {pinnedNote ? (
              <View style={styles.pinnedNoteCard}>
                <ThemedText variant="bodySm" style={styles.pinnedNoteTitle} numberOfLines={1}>
                  {pinnedNote.title || "Untitled Note"}
                </ThemedText>
                <ThemedText variant="caption" style={styles.pinnedNoteExcerpt} numberOfLines={3}>
                  {pinnedNote.contentText || "No additional text content."}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.emptyCardContainer}>
                <ThemedText variant="bodySm" style={styles.emptyCardText}>
                  No notes created yet
                </ThemedText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.emptyCardActionBtn}
                  onPress={() => navigation?.navigate("Notes")}
                >
                  <FileText size={14} color={STITCH_COLORS.primary} />
                  <ThemedText variant="caption" style={styles.emptyCardActionBtnText}>
                    Create Note
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </Card>

        {/* AI Daily Summary Module (Retained & Polished) */}
        <DailySummaryCard
          isLoading={isSummaryLoading}
          isError={isSummaryError}
          onRetry={loadDailySummary}
          generated={dailySummaryState.generated}
          deliveryTime={dailySummaryState.deliveryTime || "07:00"}
          summary={dailySummaryState.summary}
          onGenerateNow={handleGenerateNow}
          isGenerating={isGeneratingSummary}
        />
      </View>

      {/* Notifications Modal */}
      <NotificationModal
        visible={isNotificationModalVisible}
        onClose={() => {
          setIsNotificationModalVisible(false);
          loadUnreadCount();
        }}
        onNavigate={(screenName, params) => navigation?.navigate(screenName, params)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Top Header
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs
  },
  brandTitle: {
    color: STITCH_COLORS.primary,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontSize: 22
  },
  topHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  dateBadgeText: {
    color: STITCH_COLORS.textVariant,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3
  },
  notificationBtn: {
    padding: 7,
    borderRadius: radius.full,
    backgroundColor: STITCH_COLORS.surfaceLow,
    position: "relative"
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: STITCH_COLORS.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#ffffff"
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11
  },

  // Hero Island
  heroIsland: {
    marginBottom: spacing.md,
    gap: 4
  },
  heroHeading: {
    fontSize: 24,
    fontWeight: "700",
    color: STITCH_COLORS.textOnSurface,
    letterSpacing: -0.6
  },
  heroSubRow: {
    gap: spacing.xs
  },
  heroSubtitle: {
    color: STITCH_COLORS.textVariant,
    fontSize: 14
  },
  focusScorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2
  },
  focusScoreText: {
    color: STITCH_COLORS.textVariant,
    fontSize: 12,
    fontWeight: "500"
  },
  focusScoreValue: {
    color: STITCH_COLORS.textOnSurface,
    fontWeight: "700"
  },
  focusProgressBarTrack: {
    width: 70,
    height: 5,
    backgroundColor: STITCH_COLORS.surfaceHighest,
    borderRadius: 99,
    overflow: "hidden"
  },
  focusProgressBarFill: {
    height: "100%",
    backgroundColor: STITCH_COLORS.primary,
    borderRadius: 99
  },

  // Quick Action Grid
  quickActionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: STITCH_COLORS.surfaceLowest,
    borderWidth: 1,
    borderColor: STITCH_COLORS.paperBorder,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  quickActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  quickActionLabel: {
    color: "#31302e",
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center"
  },

  // Main Sections
  sectionsContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  stitchCard: {
    backgroundColor: STITCH_COLORS.surfaceLowest,
    borderColor: STITCH_COLORS.paperBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  cardSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: STITCH_COLORS.textOnSurface,
    letterSpacing: -0.2
  },
  iconTitleInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },

  // Timeline
  timelineList: {
    gap: 2
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(193, 198, 213, 0.3)",
    gap: spacing.sm
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2
  },
  timelineContent: {
    flex: 1
  },
  timelineItemTitle: {
    fontWeight: "600",
    color: STITCH_COLORS.textOnSurface,
    fontSize: 14
  },
  timelineItemMeta: {
    color: STITCH_COLORS.textVariant,
    fontSize: 12,
    marginTop: 1
  },
  timelineBadge: {
    backgroundColor: STITCH_COLORS.primaryContainerSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  timelineBadgeText: {
    color: STITCH_COLORS.primaryContainer,
    fontSize: 11,
    fontWeight: "600"
  },

  // Habit Streak
  habitsList: {
    gap: spacing.sm
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  habitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1
  },
  habitTitle: {
    fontWeight: "500",
    color: STITCH_COLORS.textOnSurface,
    fontSize: 14
  },
  streakDotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center"
  },
  streakDot: {
    width: 11,
    height: 11,
    borderRadius: 3.5
  },

  // Finance Snapshot
  budgetSection: {
    marginBottom: spacing.sm
  },
  budgetLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  budgetSubtitle: {
    color: STITCH_COLORS.textVariant,
    fontSize: 12,
    fontWeight: "500"
  },
  budgetAmountText: {
    fontWeight: "600",
    color: STITCH_COLORS.textOnSurface,
    fontSize: 13.5
  },
  categorySpendList: {
    marginTop: spacing.xs,
    gap: 6
  },
  categorySpendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  categoryNameCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  categoryColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  categorySpendLabel: {
    color: STITCH_COLORS.textVariant,
    fontSize: 12.5
  },
  categorySpendValue: {
    color: STITCH_COLORS.textOnSurface,
    fontSize: 13,
    fontWeight: "600"
  },

  // Pinned Note
  pinnedNoteCard: {
    backgroundColor: STITCH_COLORS.surfaceLow,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(193, 198, 213, 0.3)",
    gap: 4
  },
  pinnedNoteTitle: {
    fontWeight: "600",
    color: STITCH_COLORS.textOnSurface,
    fontSize: 14
  },
  pinnedNoteExcerpt: {
    color: STITCH_COLORS.textVariant,
    fontSize: 12,
    lineHeight: 17
  },

  // Empty States
  emptyCardContainer: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: STITCH_COLORS.surfaceLow,
    borderRadius: radius.md,
    marginVertical: spacing.xs
  },
  emptyCardText: {
    color: STITCH_COLORS.textVariant,
    fontSize: 13,
    textAlign: "center"
  },
  emptyCardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: STITCH_COLORS.surfaceLowest,
    borderWidth: 1,
    borderColor: STITCH_COLORS.paperBorder,
    marginTop: 2
  },
  emptyCardActionBtnText: {
    color: STITCH_COLORS.primary,
    fontSize: 12,
    fontWeight: "600"
  }
});
