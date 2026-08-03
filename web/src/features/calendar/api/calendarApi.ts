import type {
  CalendarEventDetail,
  CalendarOccurrence,
  CreateEventInput,
  OccurrenceUpdateInput,
  UpdateEventInput
} from "@lifeos/shared";
import { apiClient } from "../../../lib/apiClient";

export interface ListEventsParams {
  rangeStart: string;
  rangeEnd: string;
  view?: "day" | "week" | "month";
}

export async function listEvents(params: ListEventsParams): Promise<CalendarOccurrence[]> {
  const { data } = await apiClient.get<{ events: CalendarOccurrence[] }>("/calendar/events", {
    params
  });
  return data.events;
}

export async function getEvent(eventId: string): Promise<CalendarEventDetail> {
  const { data } = await apiClient.get<{ event: CalendarEventDetail }>(
    `/calendar/events/${eventId}`
  );
  return data.event;
}

export async function createEvent(input: CreateEventInput): Promise<CalendarEventDetail> {
  const { data } = await apiClient.post<{ event: CalendarEventDetail }>("/calendar/events", input);
  return data.event;
}

export async function updateEvent(
  eventId: string,
  input: UpdateEventInput
): Promise<CalendarEventDetail> {
  const { data } = await apiClient.patch<{ event: CalendarEventDetail }>(
    `/calendar/events/${eventId}`,
    input
  );
  return data.event;
}

export async function updateOccurrence(
  eventId: string,
  occurrenceId: string,
  input: OccurrenceUpdateInput
): Promise<CalendarOccurrence> {
  const { data } = await apiClient.patch<{ occurrence: CalendarOccurrence }>(
    `/calendar/events/${eventId}/occurrence/${occurrenceId}`,
    input
  );
  return data.occurrence;
}

export async function deleteEvent(eventId: string): Promise<void> {
  await apiClient.delete(`/calendar/events/${eventId}`);
}

export async function deleteOccurrence(eventId: string, occurrenceId: string): Promise<void> {
  await apiClient.delete(`/calendar/events/${eventId}/occurrence/${occurrenceId}`);
}

export interface ConflictsParams {
  startTime: string;
  endTime: string;
  excludeEventId?: string;
  excludeOccurrenceId?: string;
}

export async function listConflicts(params: ConflictsParams): Promise<CalendarOccurrence[]> {
  const { data } = await apiClient.get<{ conflicts: CalendarOccurrence[] }>(
    "/calendar/events/conflicts",
    { params }
  );
  return data.conflicts;
}
