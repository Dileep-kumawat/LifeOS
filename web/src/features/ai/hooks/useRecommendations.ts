import { useQuery } from "@tanstack/react-query";
import { recommendationsApi } from "../api/recommendationsApi";
import type { RecommendationPeriod } from "@lifeos/shared";

export function useLatestRecommendations(period: RecommendationPeriod = "weekly") {
  return useQuery({
    queryKey: ["recommendations", "latest", period],
    queryFn: () => recommendationsApi.getLatestRecommendations(period),
    staleTime: 60 * 1000
  });
}

export function useRecommendation(id: string) {
  return useQuery({
    queryKey: ["recommendations", "detail", id],
    queryFn: () => recommendationsApi.getRecommendationById(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000
  });
}
