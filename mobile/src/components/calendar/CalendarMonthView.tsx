import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { SyncBadge } from "../ui/SyncBadge";
import { colors, radius, spacing } from "../../theme";
import type { LocalEvent } from "../../db/schema";

interface CalendarMonthViewProps {
  currentMonth: Date;
  onMonthChange: (newMonth: Date) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: LocalEvent[];
  onSelectEvent: (event: LocalEvent) => void;
}

export function CalendarMonthView({
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  events,
  onSelectEvent
}: CalendarMonthViewProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDay = firstDayOfMonth.getDay(); // 0 is Sunday
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonthDays = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    prevMonthDays.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthLastDay - i)
    });
  }

  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  const totalDisplayed = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDays = [];
  const remainingDays = 35 - totalDisplayed > 0 ? 35 - totalDisplayed : 42 - totalDisplayed;
  for (let i = 1; i <= remainingDays; i++) {
    nextMonthDays.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const allCalendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  const selectedDayEvents = events.filter((ev) => {
    const startStr = ev.startTime.split("T")[0];
    return startStr === selectedDateStr;
  });

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Month Header Controls */}
      <View style={styles.monthHeader}>
        <ThemedText variant="heading2">{monthLabel}</ThemedText>
        <View style={styles.navButtons}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <ChevronLeft size={20} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <ChevronRight size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekHeader}>
        {weekDayLabels.map((lbl) => (
          <ThemedText key={lbl} variant="caption" color={colors.inkMuted} style={styles.weekDayLabel}>
            {lbl}
          </ThemedText>
        ))}
      </View>

      {/* Month Days Grid */}
      <View style={styles.grid}>
        {allCalendarDays.map((item, idx) => {
          const itemDateStr = item.date.toISOString().split("T")[0];
          const isSelected = itemDateStr === selectedDateStr;
          const hasEvents = events.some((ev) => ev.startTime.startsWith(itemDateStr));

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => onSelectDate(item.date)}
              style={[
                styles.gridCell,
                isSelected && styles.selectedCell,
                !item.isCurrentMonth && styles.otherMonthCell
              ]}
            >
              <ThemedText
                variant="bodySm"
                color={
                  isSelected
                    ? colors.onPrimary
                    : item.isCurrentMonth
                      ? colors.ink
                      : colors.inkFaint
                }
                style={[styles.dayText, isSelected && { fontWeight: "700" }]}
              >
                {item.day}
              </ThemedText>
              {hasEvents && (
                <View
                  style={[
                    styles.eventDot,
                    { backgroundColor: isSelected ? colors.onPrimary : colors.primary }
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Events for selected date */}
      <View style={styles.selectedEventsSection}>
        <ThemedText variant="heading3" style={styles.agendaTitle}>
          {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </ThemedText>

        {selectedDayEvents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="bodyMd" color={colors.inkMuted} style={{ textAlign: "center" }}>
              No events scheduled for this day.
            </ThemedText>
          </Card>
        ) : (
          selectedDayEvents.map((ev) => {
            const start = new Date(ev.startTime);
            const end = new Date(ev.endTime);
            const timeRange = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

            return (
              <TouchableOpacity
                key={ev.id}
                activeOpacity={0.7}
                onPress={() => onSelectEvent(ev)}
                style={{ marginBottom: spacing.sm }}
              >
                <Card style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <ThemedText variant="heading3" numberOfLines={1} style={{ flex: 1 }}>
                      {ev.title}
                    </ThemedText>
                    <SyncBadge status={ev.syncStatus} />
                  </View>
                  <View style={styles.metaRow}>
                    <Clock size={14} color={colors.primary} />
                    <ThemedText variant="caption" color={colors.inkSecondary}>
                      {timeRange}
                    </ThemedText>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  navButtons: {
    flexDirection: "row",
    gap: spacing.xs
  },
  navButton: {
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  weekDayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontWeight: "600"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxs,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  gridCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md
  },
  selectedCell: {
    backgroundColor: colors.primary
  },
  otherMonthCell: {
    opacity: 0.5
  },
  dayText: {
    fontSize: 13
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2
  },
  selectedEventsSection: {
    marginTop: spacing.lg
  },
  agendaTitle: {
    marginBottom: spacing.sm
  },
  emptyCard: {
    padding: spacing.lg
  },
  eventCard: {
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary
  },
  eventCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4
  }
});
