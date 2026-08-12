import { useQuery } from "@tanstack/react-query";
import { summaryApi } from "../api/summaryApi";

export const summaryKeys = {
  all: ["summary"] as const,
  today: () => [...summaryKeys.all, "today"] as const,
  date: (dateStr: string) => [...summaryKeys.all, "date", dateStr] as const
};

export function useTodaySummary() {
  return useQuery({
    queryKey: summaryKeys.today(),
    queryFn: () => summaryApi.getTodaySummary(),
    staleTime: 5 * 60 * 1000
  });
}

export function useHistoricalSummary(dateStr: string) {
  return useQuery({
    queryKey: summaryKeys.date(dateStr),
    queryFn: () => summaryApi.getHistoricalSummary(dateStr),
    enabled: Boolean(dateStr),
    staleTime: 15 * 60 * 1000
  });
}
