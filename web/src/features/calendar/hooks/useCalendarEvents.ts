import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvent,
  deleteEvent,
  deleteOccurrence,
  getEvent,
  listEvents,
  updateEvent,
  updateOccurrence
} from "../api/calendarApi";
import type { CalendarView } from "../lib/rangeMath";

export const calendarKeys = {
  all: ["calendar"] as const,
  events: (rangeStart: string, rangeEnd: string) =>
    ["calendar", "events", rangeStart, rangeEnd] as const,
  detail: (id: string) => ["calendar", "event", id] as const,
  conflicts: (params: {
    startTime: string;
    endTime: string;
    excludeEventId?: string;
    excludeOccurrenceId?: string;
  }) => ["calendar", "conflicts", params] as const
};

export function useCalendarEvents(rangeStart: Date, rangeEnd: Date, view: CalendarView) {
  const rangeStartIso = rangeStart.toISOString();
  const rangeEndIso = rangeEnd.toISOString();
  return useQuery({
    queryKey: calendarKeys.events(rangeStartIso, rangeEndIso),
    queryFn: () => listEvents({ rangeStart: rangeStartIso, rangeEnd: rangeEndIso, view })
  });
}

export function useEventDetail(eventId: string | null) {
  return useQuery({
    queryKey: calendarKeys.detail(eventId ?? "none"),
    queryFn: () => getEvent(eventId as string),
    enabled: !!eventId
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all })
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      input
    }: {
      eventId: string;
      input: Parameters<typeof updateEvent>[1];
    }) => updateEvent(eventId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all })
  });
}

export function useUpdateOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      occurrenceId,
      input
    }: {
      eventId: string;
      occurrenceId: string;
      input: Parameters<typeof updateOccurrence>[2];
    }) => updateOccurrence(eventId, occurrenceId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all })
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all })
  });
}

export function useDeleteOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, occurrenceId }: { eventId: string; occurrenceId: string }) =>
      deleteOccurrence(eventId, occurrenceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all })
  });
}
