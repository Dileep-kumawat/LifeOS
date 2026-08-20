import { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import {
  Bell,
  BellOff,
  Calendar,
  CheckSquare,
  Sparkles,
  DollarSign,
  Info,
  CheckCheck,
  Clock,
  Layers
} from "lucide-react-native";
import type { Notification } from "@lifeos/shared";
import { Modal } from "../ui/Modal";
import { ThemedText } from "../ui/ThemedText";
import { notificationApiService } from "../../services/notificationApiService";
import { useSyncStore } from "../../store/syncStore";
import { colors, radius, spacing, shadows } from "../../theme";

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (screenName: string, params?: Record<string, any>) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getNotificationMeta(type: string) {
  switch (type) {
    case "calendar_reminder":
      return {
        icon: <Calendar size={18} color="#005db2" />,
        bg: "rgba(0, 93, 178, 0.12)",
        label: "Calendar"
      };
    case "habit_reminder":
      return {
        icon: <CheckSquare size={18} color="#0f766e" />,
        bg: "rgba(15, 118, 110, 0.12)",
        label: "Habit"
      };
    case "budget_alert":
      return {
        icon: <DollarSign size={18} color="#c15600" />,
        bg: "rgba(193, 86, 0, 0.12)",
        label: "Finance"
      };
    case "daily_summary":
      return {
        icon: <Sparkles size={18} color="#7e22ce" />,
        bg: "rgba(126, 34, 206, 0.12)",
        label: "AI Summary"
      };
    case "system":
    default:
      return {
        icon: <Info size={18} color="#4b5563" />,
        bg: "rgba(75, 85, 99, 0.12)",
        label: "System"
      };
  }
}

export function NotificationModal({ visible, onClose, onNavigate }: NotificationModalProps) {
  const isOnline = useSyncStore((state) => state.isOnline);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [expandedItemsMap, setExpandedItemsMap] = useState<Record<string, boolean>>({});

  const fetchNotifications = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await notificationApiService.listNotifications({
        readStatus: filter === "unread" ? "unread" : undefined,
        limit: 30
      });
      setNotifications(res.notifications || []);
    } catch (error) {
      console.warn("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOnline, filter]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchNotifications();
    }
  }, [visible, filter, fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (!isOnline || markingAll) return;
    setMarkingAll(true);
    try {
      await notificationApiService.markAllAsRead("unread");
      setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: "read" as const })));
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemPress = async (item: Notification) => {
    if (item.readStatus === "unread") {
      try {
        notificationApiService.markAsRead(item.id).catch(() => {});
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readStatus: "read" as const } : n))
        );
      } catch {}
    }

    onClose();

    if (!onNavigate) return;

    // Navigate to respective feature screen
    const type = item.type;
    const data = item.payload?.data || {};

    if (type === "calendar_reminder") {
      onNavigate("Calendar", { eventId: data.eventId });
    } else if (type === "habit_reminder") {
      onNavigate("Habits & Goals", { habitId: data.habitId });
    } else if (type === "budget_alert") {
      onNavigate("Finance");
    } else if (type === "daily_summary") {
      onNavigate("Assistant");
    } else {
      onNavigate("Dashboard");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItemsMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const unreadCount = notifications.filter((n) => n.readStatus === "unread").length;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Notifications"
      subtitle={
        unreadCount > 0
          ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`
          : "Stay updated on habits, calendar & alerts"
      }
      scrollable={false}
    >
      <View style={styles.container}>
        {/* Controls Bar: Filter Tabs & Mark All Read */}
        <View style={styles.controlsBar}>
          <View style={styles.filterPills}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.pill, filter === "all" && styles.pillActive]}
              onPress={() => setFilter("all")}
            >
              <ThemedText
                variant="caption"
                style={[styles.pillText, filter === "all" && styles.pillTextActive]}
              >
                All
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.pill, filter === "unread" && styles.pillActive]}
              onPress={() => setFilter("unread")}
            >
              <ThemedText
                variant="caption"
                style={[styles.pillText, filter === "unread" && styles.pillTextActive]}
              >
                Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.markAllBtn}
              onPress={handleMarkAllAsRead}
              disabled={markingAll || !isOnline}
            >
              <CheckCheck size={14} color={colors.primary} />
              <ThemedText variant="caption" color={colors.primary} style={styles.markAllText}>
                {markingAll ? "Marking..." : "Mark all read"}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification List Content */}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.xs }}>
              Loading notifications...
            </ThemedText>
          </View>
        ) : !isOnline ? (
          <View style={styles.centerState}>
            <BellOff size={32} color={colors.inkMuted} />
            <ThemedText variant="bodyMd" style={styles.emptyTitle}>
              You're in Offline Mode
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptySubtitle}>
              In-app notifications sync automatically when connected to the internet.
            </ThemedText>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIconCircle}>
              <Bell size={26} color={colors.inkMuted} />
            </View>
            <ThemedText variant="bodyMd" style={styles.emptyTitle}>
              {filter === "unread" ? "No Unread Notifications" : "No Notifications Yet"}
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptySubtitle}>
              {filter === "unread"
                ? "You're all caught up! Great job staying on top of everything."
                : "Reminders for your events, habits, and daily summaries will appear here."}
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {notifications.map((item) => {
              const meta = getNotificationMeta(item.type);
              const isUnread = item.readStatus === "unread";
              const isBatched = item.payload?.items && item.payload.items.length > 0;
              const isExpanded = !!expandedItemsMap[item.id];
              const displayTitle = item.payload?.title || meta.label;
              const displayBody = item.payload?.body;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
                  onPress={() => handleItemPress(item)}
                >
                  <View style={styles.cardHeaderRow}>
                    {/* Left Type Icon */}
                    <View style={[styles.iconWrapper, { backgroundColor: meta.bg }]}>
                      {meta.icon}
                    </View>

                    {/* Content Column */}
                    <View style={styles.cardContent}>
                      <View style={styles.titleRow}>
                        <ThemedText
                          variant="bodySm"
                          style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {displayTitle}
                        </ThemedText>
                        {isUnread && <View style={styles.unreadDot} />}
                      </View>

                      {!!displayBody && (
                        <ThemedText
                          variant="caption"
                          color={colors.inkSecondary}
                          style={styles.cardBody}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {displayBody}
                        </ThemedText>
                      )}

                      {/* Batched items expansion */}
                      {isBatched && item.payload.items && (
                        <View style={styles.batchedSection}>
                          <TouchableOpacity
                            activeOpacity={0.6}
                            style={styles.batchToggle}
                            onPress={() => toggleExpand(item.id)}
                          >
                            <Layers size={13} color={colors.primary} />
                            <ThemedText
                              variant="caption"
                              color={colors.primary}
                              style={{ fontWeight: "600" }}
                            >
                              {item.payload.items.length} items batched (
                              {isExpanded ? "Hide" : "Show"})
                            </ThemedText>
                          </TouchableOpacity>

                          {isExpanded && (
                            <View style={styles.batchList}>
                              {item.payload.items.map((sub, idx) => (
                                <View key={idx} style={styles.batchItem}>
                                  <View style={styles.batchDot} />
                                  <ThemedText
                                    variant="caption"
                                    color={colors.ink}
                                    style={{ flex: 1 }}
                                  >
                                    {sub.title}
                                    {sub.body ? ` — ${sub.body}` : ""}
                                  </ThemedText>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Footer: timestamp & meta label */}
                      <View style={styles.cardFooter}>
                        <View style={styles.timeWrap}>
                          <Clock size={11} color={colors.inkMuted} />
                          <ThemedText
                            variant="caption"
                            color={colors.inkMuted}
                            style={styles.timeText}
                          >
                            {formatRelativeTime(item.createdAt || item.scheduledFor)}
                          </ThemedText>
                        </View>
                        <View style={styles.typeBadge}>
                          <ThemedText
                            variant="caption"
                            color={colors.inkMuted}
                            style={styles.typeBadgeText}
                          >
                            {meta.label}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 280,
    maxHeight: 460
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  filterPills: {
    flexDirection: "row",
    gap: spacing.xs
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft
  },
  pillActive: {
    backgroundColor: colors.primary
  },
  pillText: {
    fontWeight: "600",
    color: colors.inkSecondary
  },
  pillTextActive: {
    color: colors.surface
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  markAllText: {
    fontWeight: "600"
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  emptyTitle: {
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 4,
    textAlign: "center"
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260
  },
  listScroll: {
    flex: 1
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm
  },
  notificationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  notificationCardUnread: {
    backgroundColor: "#f7f9ff",
    borderColor: "rgba(0, 93, 178, 0.25)",
    ...shadows.card
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  cardContent: {
    flex: 1
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    marginBottom: 2
  },
  cardTitle: {
    fontWeight: "500",
    color: colors.ink,
    flex: 1
  },
  cardTitleUnread: {
    fontWeight: "700",
    color: colors.ink
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  cardBody: {
    lineHeight: 17,
    marginBottom: 6
  },
  batchedSection: {
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.xs,
    padding: spacing.xs
  },
  batchToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  batchList: {
    marginTop: spacing.xs,
    gap: 4
  },
  batchItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  batchDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.inkMuted
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  timeText: {
    fontSize: 11
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.xs,
    backgroundColor: colors.canvasSoft
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.2
  }
});
