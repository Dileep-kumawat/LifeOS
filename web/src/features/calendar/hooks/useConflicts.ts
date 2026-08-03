import { useQuery } from "@tanstack/react-query";
import { listConflicts } from "../api/calendarApi";
import { calendarKeys } from "./useCalendarEvents";

export interface UseConflictsParams {
  startTime?: Date | null;
  endTime?: Date | null;
  excludeEventId?: string;
  excludeOccurrenceId?: string;
}

export function useConflicts({
  startTime,
  endTime,
  excludeEventId,
  excludeOccurrenceId
}: UseConflictsParams) {
  const enabled = !!startTime && !!endTime && startTime < endTime;
  const params = {
    startTime: startTime?.toISOString() ?? "",
    endTime: endTime?.toISOString() ?? "",
    ...(excludeEventId ? { excludeEventId } : {}),
    ...(excludeOccurrenceId ? { excludeOccurrenceId } : {})
  };
  return useQuery({
    queryKey: calendarKeys.conflicts(params),
    queryFn: () => listConflicts(params),
    enabled,
    staleTime: 5_000
  });
}
