import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NotificationPreferences, UpdateNotificationPreferencesInput } from "@lifeos/shared";
import {
  notificationsApi,
  type NotificationsListResponse
} from "../api/notificationsApi";
import { notificationKeys } from "../api/queryKeys";

const UNREAD_POLL_INTERVAL_MS = 30_000;

interface SnapCount {
  notifications?: NotificationsListResponse;
  unread?: { unread: number };
}

function currentSnapshots(queryClient: ReturnType<typeof useQueryClient>): SnapCount {
  return {
    notifications: queryClient.getQueryData<NotificationsListResponse>(notificationKeys.list()),
    unread: queryClient.getQueryData<{ unread: number }>(notificationKeys.unreadCount())
  };
}

/** Unread count behind the bell. Polled; also updated optimistically on reads. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    select: (data) => data.unread,
    refetchInterval: UNREAD_POLL_INTERVAL_MS,
    retry: 1
  });
}

/** The list of recent notifications for the panel. */
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => notificationsApi.list({ limit: 20 }),
    select: (data) => data.notifications,
    refetchInterval: UNREAD_POLL_INTERVAL_MS
  });
}

/**
 * Mark a single notification read. Optimistic: flips the item + unread count
 * immediately, PATCH in the background, rolls both back on failure — the same
 * pattern as the goal milestone toggle in Phase 1.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() });

      const snapshots = currentSnapshots(queryClient);

      const wasUnread = snapshots.notifications?.notifications.some(
        (n) => n.id === id && n.readStatus === "unread"
      );

      if (snapshots.notifications) {
        queryClient.setQueryData<NotificationsListResponse>(notificationKeys.list(), {
          ...snapshots.notifications,
          notifications: snapshots.notifications.notifications.map((n) =>
            n.id === id && n.readStatus === "unread"
              ? { ...n, readStatus: "read" as const, readAt: new Date().toISOString() }
              : n
          )
        });
      }

      if (snapshots.unread) {
        queryClient.setQueryData(notificationKeys.unreadCount(), {
          unread: Math.max(0, snapshots.unread.unread - (wasUnread ? 1 : 0))
        });
      }

      return snapshots;
    },
    onError: (_err, _id, context) => {
      const snapshots = context as SnapCount | undefined;
      if (snapshots?.notifications) {
        queryClient.setQueryData(notificationKeys.list(), snapshots.notifications);
      }
      if (snapshots?.unread) {
        queryClient.setQueryData(notificationKeys.unreadCount(), snapshots.unread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    }
  });
}

/** Mark all notifications read. Optimistic: zeroes the badge immediately. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead("unread"),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() });

      const snapshots = currentSnapshots(queryClient);

      if (snapshots.notifications) {
        queryClient.setQueryData<NotificationsListResponse>(notificationKeys.list(), {
          ...snapshots.notifications,
          notifications: snapshots.notifications.notifications.map((n) =>
            n.readStatus === "unread"
              ? { ...n, readStatus: "read" as const, readAt: new Date().toISOString() }
              : n
          )
        });
      }

      queryClient.setQueryData(notificationKeys.unreadCount(), { unread: 0 });

      return snapshots;
    },
    onError: (_err, _vars, context) => {
      const snapshots = context as SnapCount | undefined;
      if (snapshots?.notifications) {
        queryClient.setQueryData(notificationKeys.list(), snapshots.notifications);
      }
      if (snapshots?.unread) {
        queryClient.setQueryData(notificationKeys.unreadCount(), snapshots.unread);
      }
      toast.error("Could not mark all notifications as read. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    }
  });
}

/** Load the user's per-module / per-channel notification preferences. */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationsApi.preferences(),
    select: (data) => data.preferences
  });
}

/**
 * Update a preference toggle, saving immediately on each toggle (discrete
 * action — no debounce, no separate save button). Optimistic flip + rollback.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: UpdateNotificationPreferencesInput) => notificationsApi.updatePreferences(patch),
    onMutate: async (patch: UpdateNotificationPreferencesInput) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences() });
      const previous = queryClient.getQueryData<NotificationPreferences>(
        notificationKeys.preferences()
      );

      if (previous) {
        const next: NotificationPreferences = { ...previous };
        (["calendarReminders", "habitReminders", "system"] as const).forEach((module) => {
          const entry = patch[module];
          if (!entry) return;
          next[module] = {
            push: entry.push ?? next[module].push,
            inApp: entry.inApp ?? next[module].inApp
          };
        });
        queryClient.setQueryData(notificationKeys.preferences(), next);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.preferences(), context.previous);
      }
      toast.error("Could not update notification preference.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    }
  });
}

/** Register (POST) the browser's push subscription after grant. */
export function useRegisterPushSubscription() {
  return useMutation({
    mutationFn: notificationsApi.registerPushSubscription
  });
}

/** Remove a push subscription when the user revokes or opts out. */
export function useUnregisterPushSubscription() {
  return useMutation({
    mutationFn: (endpoint: string) => notificationsApi.unregisterPushSubscription(endpoint)
  });
}