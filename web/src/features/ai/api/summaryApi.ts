import { apiClient } from "../../../lib/apiClient";
import type { DailySummary } from "@lifeos/shared";

export interface SummaryResponse {
  generated: boolean;
  reason?: string;
  deliveryTime?: string;
  summary: DailySummary | null;
}

export const summaryApi = {
  getTodaySummary: async (): Promise<SummaryResponse> => {
    const res = await apiClient.get<SummaryResponse>("/ai/summary/today");
    return res.data;
  },
  getHistoricalSummary: async (date: string): Promise<SummaryResponse> => {
    const res = await apiClient.get<SummaryResponse>(`/ai/summary/${date}`);
    return res.data;
  }
};
