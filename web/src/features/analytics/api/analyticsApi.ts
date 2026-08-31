import { apiClient } from "../../../lib/apiClient";
import type {
  ProductivityAnalytics,
  FinanceAnalytics,
  AnalyticsExportQuery
} from "@lifeos/shared";

export const analyticsApi = {
  /**
   * Fetch aggregated productivity analytics over a custom date range
   */
  async getProductivityAnalytics(startDate: string, endDate: string): Promise<ProductivityAnalytics> {
    const res = await apiClient.get<ProductivityAnalytics>("/analytics/productivity", {
      params: { startDate, endDate }
    });
    return res.data;
  },

  /**
   * Fetch aggregated financial analytics over a custom date range
   */
  async getFinanceAnalytics(startDate: string, endDate: string): Promise<FinanceAnalytics> {
    const res = await apiClient.get<FinanceAnalytics>("/analytics/finance", {
      params: { startDate, endDate }
    });
    return res.data;
  },

  /**
   * Trigger an analytics export and download the resulting CSV or PDF file
   */
  async exportAnalytics(params: AnalyticsExportQuery): Promise<{ filename: string }> {
    const res = await apiClient.get("/analytics/export", {
      params,
      responseType: "blob"
    });

    let filename = `lifeos-${params.type}-${params.startDate}-to-${params.endDate}.${params.format}`;
    const disposition = res.headers["content-disposition"] || res.headers["Content-Disposition"];
    if (disposition && typeof disposition === "string") {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = new Blob([res.data], {
      type: params.format === "csv" ? "text/csv;charset=utf-8;" : "application/pdf"
    });

    // Browser file download flow
    if (typeof window !== "undefined") {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

    return { filename };
  }
};
