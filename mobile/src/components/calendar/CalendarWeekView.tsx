import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Clock } from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { SyncBadge } from "../ui/SyncBadge";
import { colors, radius, spacing } from "../../theme";
import type { LocalEvent } from "../../db/schema";

interface CalendarWeekViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: LocalEvent[];
  onSelectEvent: (event: LocalEvent) => void;
}

export function CalendarWeekView({
  selectedDate,
  onSelectDate,
  events,
  onSelectEvent
}: CalendarWeekViewProps) {
  // Compute start of current week (Sunday)
  const currentDay = selectedDate.getDay();
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - currentDay);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  const selectedDayEvents = events.filter((ev) => {
    const startStr = ev.startTime.split("T")[0];
    return startStr === selectedDateStr;
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 7-day strip */}
      <View style={styles.weekStrip}>
        {weekDays.map((d) => {
          const dStr = d.toISOString().split("T")[0];
          const isSelected = dStr === selectedDateStr;
          const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).substring(0, 3);
          const dayNum = d.getDate();

          const hasEvents = events.some((ev) => ev.startTime.startsWith(dStr));

          return (
            <TouchableOpacity
              key={dStr}
              activeOpacity={0.7}
              onPress={() => onSelectDate(d)}
              style={[
                styles.dayButton,
                isSelected && styles.dayButtonSelected
              ]}
            >
              <ThemedText
                variant="caption"
                color={isSelected ? colors.onPrimary : colors.inkMuted}
                style={{ fontSize: 11, fontWeight: "600" }}
              >
                {dayName}
              </ThemedText>
              <ThemedText
                variant="bodyMd"
                color={isSelected ? colors.onPrimary : colors.ink}
                style={{ fontWeight: "700", marginTop: 2 }}
              >
                {dayNum}
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

      {/* Selected Day Agenda */}
      <View style={styles.agendaSection}>
        <ThemedText variant="heading3" style={styles.agendaHeader}>
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
                style={styles.eventItemWrapper}
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
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: spacing.md
  },
  dayButton: {
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    minWidth: 42
  },
  dayButtonSelected: {
    backgroundColor: colors.primary
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4
  },
  agendaSection: {
    marginTop: spacing.xs
  },
  agendaHeader: {
    marginBottom: spacing.sm
  },
  emptyCard: {
    padding: spacing.lg
  },
  eventItemWrapper: {
    marginBottom: spacing.sm
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
