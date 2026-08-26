import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Clock, MapPin } from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { SyncBadge } from "../ui/SyncBadge";
import { colors, radius, spacing } from "../../theme";
import { useDockHeight } from "../../navigation/FloatingDock";
import type { LocalEvent } from "../../db/schema";

interface CalendarDayViewProps {
  selectedDate: Date;
  events: LocalEvent[];
  onSelectEvent: (event: LocalEvent) => void;
}

export function CalendarDayView({ selectedDate, events, onSelectEvent }: CalendarDayViewProps) {
  const dockHeight = useDockHeight();
  const dateStr = selectedDate.toISOString().split("T")[0];

  const dayEvents = events.filter((ev) => {
    const startStr = ev.startTime.split("T")[0];
    return startStr === dateStr;
  });

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6:00 to 23:00

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: dockHeight }}
      showsVerticalScrollIndicator={false}
    >
      {dayEvents.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText variant="bodyMd" color={colors.inkMuted} style={{ textAlign: "center" }}>
            No events scheduled for this day.
          </ThemedText>
        </Card>
      ) : (
        <View style={styles.eventsList}>
          {dayEvents.map((ev) => {
            const start = new Date(ev.startTime);
            const end = new Date(ev.endTime);
            const timeRange = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

            return (
              <TouchableOpacity key={ev.id} activeOpacity={0.7} onPress={() => onSelectEvent(ev)}>
                <Card style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <ThemedText variant="heading3" numberOfLines={1} style={styles.eventTitle}>
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

                  {Boolean(ev.location) && (
                    <View style={styles.metaRow}>
                      <MapPin size={14} color={colors.inkMuted} />
                      <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                        {ev.location}
                      </ThemedText>
                    </View>
                  )}

                  {Boolean(ev.recurrenceRule) && (
                    <View style={styles.recurringTag}>
                      <ThemedText
                        variant="caption"
                        color={colors.accentPurple}
                        style={{ fontSize: 11 }}
                      >
                        Repeating Event
                      </ThemedText>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Hourly grid backdrop */}
      <View style={styles.hourlyGrid}>
        {hours.map((hour) => {
          const hourLabel = `${hour < 10 ? "0" + hour : hour}:00`;
          return (
            <View key={hour} style={styles.hourRow}>
              <ThemedText variant="caption" color={colors.inkFaint} style={styles.hourLabel}>
                {hourLabel}
              </ThemedText>
              <View style={styles.hourLine} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  emptyCard: {
    marginVertical: spacing.md,
    padding: spacing.lg
  },
  eventsList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  eventCard: {
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary
  },
  eventCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  eventTitle: {
    flex: 1,
    marginRight: spacing.xs
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4
  },
  recurringTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSky,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginTop: spacing.xs
  },
  hourlyGrid: {
    marginTop: spacing.md,
    paddingTop: spacing.sm
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48
  },
  hourLabel: {
    width: 46
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline
  }
});
