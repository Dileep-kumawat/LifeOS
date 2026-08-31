import { apiClient } from "./apiClient";
import type {
  ProductivityAnalytics,
  FinanceAnalytics,
  AnalyticsExportQuery
} from "@lifeos/shared";

export const analyticsApiService = {
  /**
   * Fetch aggregated productivity metrics across habits and focus sessions
   */
  async getProductivityAnalytics(startDate: string, endDate: string): Promise<ProductivityAnalytics> {
    const res = await apiClient.get<ProductivityAnalytics>("/analytics/productivity", {
      params: { startDate, endDate }
    });
    return res.data;
  },

  /**
   * Fetch aggregated financial analytics and budget adherence
   */
  async getFinanceAnalytics(startDate: string, endDate: string): Promise<FinanceAnalytics> {
    const res = await apiClient.get<FinanceAnalytics>("/analytics/finance", {
      params: { startDate, endDate }
    });
    return res.data;
  },

  /**
   * Trigger analytics report export
   */
  async exportAnalytics(params: AnalyticsExportQuery): Promise<string> {
    try {
      const res = await apiClient.get("/analytics/export", {
        params,
        responseType: "text"
      });
      return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        throw new Error("Export rate limit exceeded (20 exports/hour). Please try again later.");
      }
      throw new Error(err?.response?.data?.message || err?.message || "Failed to export analytics report.");
    }
  }
};
