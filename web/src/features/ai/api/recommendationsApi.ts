import { apiClient } from "../../../lib/apiClient";
import type { Recommendation, RecommendationPeriod } from "@lifeos/shared";

export interface LatestRecommendationResponse {
  generated: boolean;
  period: RecommendationPeriod;
  reason?: string | null;
  recommendation: Recommendation | null;
}

export const recommendationsApi = {
  getLatestRecommendations: async (
    period: RecommendationPeriod = "weekly"
  ): Promise<LatestRecommendationResponse> => {
    const res = await apiClient.get<LatestRecommendationResponse>(
      `/ai/recommendations/latest?period=${period}`
    );
    return res.data;
  },
  getRecommendationById: async (id: string): Promise<LatestRecommendationResponse> => {
    const res = await apiClient.get<LatestRecommendationResponse>(
      `/ai/recommendations/${id}`
    );
    return res.data;
  }
};
