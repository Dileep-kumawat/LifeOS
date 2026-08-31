import { apiClient } from "./apiClient";
import type { Recommendation, RecommendationPeriod } from "@lifeos/shared";

export interface MobileLatestRecommendationResponse {
  generated: boolean;
  period: RecommendationPeriod;
  reason?: string | null;
  recommendation: Recommendation | null;
}

export const recommendationsApiService = {
  getLatestRecommendations: async (
    period: RecommendationPeriod = "weekly"
  ): Promise<MobileLatestRecommendationResponse> => {
    const res = await apiClient.get<MobileLatestRecommendationResponse>(
      `/ai/recommendations/latest?period=${period}`
    );
    return res.data;
  },

  getRecommendationById: async (
    id: string
  ): Promise<MobileLatestRecommendationResponse> => {
    const res = await apiClient.get<MobileLatestRecommendationResponse>(
      `/ai/recommendations/${id}`
    );
    return res.data;
  }
};
