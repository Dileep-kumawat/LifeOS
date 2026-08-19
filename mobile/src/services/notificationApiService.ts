import { apiClient } from "./apiClient";
import type { Notification } from "@lifeos/shared";

export interface ListNotificationsParams {
  readStatus?: "read" | "unread";
  channel?: "push" | "in_app" | "email";
  type?: string;
  page?: number;
  limit?: number;
}

export interface ListNotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const notificationApiService = {
  /**
   * Fetch paginated notifications for current user
   */
  async listNotifications(
    params: ListNotificationsParams = {}
  ): Promise<ListNotificationsResponse> {
    const { data } = await apiClient.get<ListNotificationsResponse>("/notifications", {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        ...(params.readStatus ? { readStatus: params.readStatus } : {}),
        ...(params.channel ? { channel: params.channel } : {}),
        ...(params.type ? { type: params.type } : {})
      }
    });
    return data;
  },

  /**
   * Get unread in-app notification count
   */
  async getUnreadCount(): Promise<number> {
    const { data } = await apiClient.get<{ unread: number }>("/notifications/unread-count");
    return data.unread || 0;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    return data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(readStatus?: "read" | "unread"): Promise<{ updatedCount: number }> {
    const { data } = await apiClient.patch<{ updatedCount: number }>(
      "/notifications/mark-all-read",
      { readStatus }
    );
    return data;
  }
};
