import { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Plus, Calendar as CalendarIcon } from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Button } from "../../components/ui/Button";
import { colors, radius, spacing } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { eventRepo } from "../../db/repositories/eventRepo";
import { syncEngine } from "../../services/syncEngine";
import { notificationService } from "../../services/notificationService";
import type { LocalEvent } from "../../db/schema";

import { CalendarDayView } from "../../components/calendar/CalendarDayView";
import { CalendarWeekView } from "../../components/calendar/CalendarWeekView";
import { CalendarMonthView } from "../../components/calendar/CalendarMonthView";
import { EventFormModal } from "../../components/calendar/EventFormModal";

type CalendarViewMode = "day" | "week" | "month";

export function CalendarScreen() {
  const user = useAuthStore((state) => state.user);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LocalEvent | null>(null);

  const loadEvents = useCallback(async () => {
    if (!user?.id) return;
    const items = await eventRepo.listEvents(user.id);
    setEvents(items);
  }, [user?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSaveEvent = async (eventData: {
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay: number;
    recurrenceRule: string | null;
    recurrenceEndDate: string | null;
    reminderLeadMinutes: number | null;
  }) => {
    if (!user?.id) return;

    if (editingEvent) {
      // Local update
      await eventRepo.updateEvent(editingEvent.id, eventData);
    } else {
      // Local create
      await eventRepo.createEvent({
        userId: user.id,
        ...eventData,
        exceptions: "[]",
        reminderJobId: null,
        isOverride: 0,
        parentEventId: null
      });
    }

    await loadEvents();
    // Schedule offline local notification
    await notificationService.rescheduleAllLocalNotifications(user.id);
    // Background sync
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteEvent = async (id: string) => {
    if (!user?.id) return;
    await eventRepo.deleteEvent(id);
    await loadEvents();
    await notificationService.rescheduleAllLocalNotifications(user.id);
    syncEngine.syncNow().catch(() => {});
  };

  const handleOpenNewEvent = () => {
    setEditingEvent(null);
    setIsFormVisible(true);
  };

  const handleSelectEvent = (event: LocalEvent) => {
    setEditingEvent(event);
    setIsFormVisible(true);
  };

  const handleGoToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  return (
    <ScreenContainer scrollable={false}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.titleContainer}>
          <ThemedText variant="heading2">Calendar</ThemedText>
          <TouchableOpacity onPress={handleGoToday} style={styles.todayButton}>
            <CalendarIcon size={14} color={colors.primary} />
            <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: "600" }}>
              Today
            </ThemedText>
          </TouchableOpacity>
        </View>

        <Button
          title="Add"
          icon={<Plus size={16} color={colors.onPrimary} />}
          onPress={handleOpenNewEvent}
          style={styles.addButton}
        />
      </View>

      {/* Segmented View Mode Picker */}
      <View style={styles.viewModeSegment}>
        {(["day", "week", "month"] as const).map((mode) => {
          const isSelected = viewMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[styles.segmentButton, isSelected && styles.segmentButtonSelected]}
            >
              <ThemedText
                variant="caption"
                color={isSelected ? colors.onPrimary : colors.inkSecondary}
                style={{ fontWeight: "600", textTransform: "capitalize" }}
              >
                {mode}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected View Mode Content */}
      <View style={styles.contentContainer}>
        {viewMode === "day" && (
          <CalendarDayView
            selectedDate={selectedDate}
            events={events}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {viewMode === "week" && (
          <CalendarWeekView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={events}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {viewMode === "month" && (
          <CalendarMonthView
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={events}
            onSelectEvent={handleSelectEvent}
          />
        )}
      </View>

      {/* Event Create / Edit Form */}
      <EventFormModal
        visible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        initialDate={selectedDate}
        eventToEdit={editingEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.xs
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E0F2FE",
    borderRadius: radius.full
  },
  addButton: {
    paddingHorizontal: spacing.md,
    height: 38
  },
  viewModeSegment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: spacing.sm
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: radius.full
  },
  segmentButtonSelected: {
    backgroundColor: colors.primary
  },
  contentContainer: {
    flex: 1
  }
});

