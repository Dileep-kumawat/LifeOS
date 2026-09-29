import { apiClient } from "../../../lib/apiClient";
import type {
  CreatePushSubscriptionInput,
  Notification as AppNotification,
  NotificationPreferences,
  TestNotificationInput,
  UpdateNotificationPreferencesInput
} from "@lifeos/shared";

export interface NotificationsListResponse {
  notifications: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ListNotificationsParams {
  readStatus?: "read" | "unread";
  channel?: "push" | "in_app" | "email";
  page?: number;
  limit?: number;
}

export const notificationsApi = {
  async list(params: ListNotificationsParams = {}): Promise<NotificationsListResponse> {
    const response = await apiClient.get<NotificationsListResponse>("/notifications", { params });
    return response.data;
  },

  async unreadCount(): Promise<{ unread: number }> {
    const response = await apiClient.get<{ unread: number }>("/notifications/unread-count");
    return response.data;
  },

  async markRead(id: string): Promise<AppNotification> {
    const response = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllRead(readStatus: "unread" | "read" = "unread"): Promise<{ updatedCount: number }> {
    const response = await apiClient.patch<{ updatedCount: number }>(
      "/notifications/mark-all-read",
      {
        readStatus
      }
    );
    return response.data;
  },

  async preferences(): Promise<{ preferences: NotificationPreferences }> {
    const response = await apiClient.get<{ preferences: NotificationPreferences }>(
      "/notifications/preferences"
    );
    return response.data;
  },

  async updatePreferences(
    patch: UpdateNotificationPreferencesInput
  ): Promise<{ preferences: NotificationPreferences }> {
    const response = await apiClient.patch<{ preferences: NotificationPreferences }>(
      "/notifications/preferences",
      patch
    );
    return response.data;
  },

  async registerPushSubscription(
    input: CreatePushSubscriptionInput
  ): Promise<{ subscription: { id: string; endpoint: string } }> {
    const response = await apiClient.post<{ subscription: { id: string; endpoint: string } }>(
      "/notifications/push-subscription",
      input
    );
    return response.data;
  },

  async unregisterPushSubscription(endpoint: string): Promise<{ deleted: number }> {
    const response = await apiClient.delete<{ deleted: number }>(
      "/notifications/push-subscription",
      {
        data: { endpoint }
      }
    );
    return response.data;
  },

  async registerFcmToken(
    token: string,
    meta?: { deviceType?: "android" | "ios" | "web"; deviceName?: string }
  ): Promise<{ subscription: { id: string; endpoint: string; deviceType?: string } }> {
    const response = await apiClient.post<{ subscription: { id: string; endpoint: string; deviceType?: string } }>(
      "/notifications/fcm-token",
      {
        token,
        deviceType: meta?.deviceType || "android",
        deviceName: meta?.deviceName
      }
    );
    return response.data;
  },

  async unregisterFcmToken(token: string): Promise<{ deleted: number }> {
    const response = await apiClient.delete<{ deleted: number }>("/notifications/fcm-token", {
      data: { token }
    });
    return response.data;
  },

  async unregisterSubscription(endpoint: string): Promise<{ deleted: number }> {
    const response = await apiClient.delete<{ deleted: number }>("/notifications/subscription", {
      data: { endpoint }
    });
    return response.data;
  },

  async sendTestNotification(input?: TestNotificationInput): Promise<{
    success: boolean;
    message: string;
    notificationId: string;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      notificationId: string;
    }>("/notifications/test", input || {});
    return response.data;
  }
};

