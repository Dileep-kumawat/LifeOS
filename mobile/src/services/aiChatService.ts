import { apiClient, API_BASE_URL } from "./apiClient";
import type { DailySummary, NotificationPreferences } from "@lifeos/shared";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "user" | "assistant" | "tool" | "system";

export type ToolCallStatus =
  | "pending_confirmation"
  | "confirmed"
  | "cancelled"
  | "executed"
  | "failed";

export interface ToolCallPayload {
  id: string;
  toolName: string;
  args: Record<string, any>;
  status: ToolCallStatus;
  result?: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolCallData?: ToolCallPayload | null;
  createdAt: string;
  isStreaming?: boolean;
}

export interface DailySummaryResponse {
  generated: boolean;
  reason?: string | null;
  deliveryTime?: string | null;
  summary: DailySummary | null;
}

export interface FinanceInsightsResponse {
  insights: string;
  providerServed?: string;
  fallbackOccurred?: boolean;
  contextSummary?: any;
}

/**
 * Extracts the socket server origin URL from the REST API base URL.
 * e.g. "http://192.168.1.5:4000/api/v1" -> "http://192.168.1.5:4000"
 */
export function getSocketServerUrl(): string {
  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol}//${url.host}`;
  } catch {
    return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  }
}

export const aiChatService = {
  // Conversation REST endpoints
  async listConversations(): Promise<ConversationSummary[]> {
    const res = await apiClient.get<{ conversations: ConversationSummary[] }>("/ai/conversations");
    return res.data.conversations || [];
  },

  async getConversation(id: string): Promise<{
    conversation: ConversationSummary;
    messages: ChatMessage[];
  }> {
    const res = await apiClient.get<{
      conversation: ConversationSummary;
      messages: ChatMessage[];
    }>(`/ai/conversations/${id}`);
    return res.data;
  },

  async deleteConversation(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/ai/conversations/${id}`);
    return res.data;
  },

  // Daily Summary REST endpoints
  async getTodaySummary(): Promise<DailySummaryResponse> {
    const res = await apiClient.get<DailySummaryResponse>("/ai/summary/today");
    return res.data;
  },

  async getSummaryByDate(date: string): Promise<DailySummaryResponse> {
    const res = await apiClient.get<DailySummaryResponse>(`/ai/summary/${date}`);
    return res.data;
  },

  // Notification / Summary preferences
  async getNotificationPreferences(): Promise<{ preferences: NotificationPreferences }> {
    const res = await apiClient.get<{ preferences: NotificationPreferences }>(
      "/notifications/preferences"
    );
    return res.data;
  },

  async updateNotificationPreferences(
    updates: Partial<NotificationPreferences>
  ): Promise<{ preferences: NotificationPreferences }> {
    const res = await apiClient.patch<{ preferences: NotificationPreferences }>(
      "/notifications/preferences",
      updates
    );
    return res.data;
  },

  // Finance Insights endpoint
  async getFinanceInsights(focusArea?: string): Promise<FinanceInsightsResponse> {
    const res = await apiClient.post<FinanceInsightsResponse>("/finance/insights", {
      focusArea: focusArea?.trim() || undefined
    });
    return res.data;
  }
};
