import { useNavigate } from "react-router-dom";
import { BellOff, CheckCheck } from "lucide-react";
import type { Notification as AppNotification } from "@lifeos/shared";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications
} from "../hooks/useNotifications";
import { getDeepLinkUrl } from "../lib/deepLink";
import { NotificationItem } from "./NotificationItem";

export interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const hasUnread = notifications?.some((n) => n.readStatus === "unread") ?? false;

  const handleOpen = (notification: AppNotification) => {
    if (notification.readStatus === "unread") {
      markRead.mutate(notification.id);
    }
    navigate(getDeepLinkUrl(notification));
    onClose();
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white" aria-label="Notifications">
      <header className="flex items-center justify-between border-b border-[#e6e6e6] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#000000]">Notifications</h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasUnread}
          onClick={() => markAllRead.mutate()}
          aria-label="Mark all notifications as read"
        >
          <CheckCheck className="size-4" data-icon="inline-start" />
          Mark all read
        </Button>
      </header>

      <div className="max-h-96 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-1 p-2" aria-label="Loading notifications">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-3">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm text-[#615d59]">Could not load notifications.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && (!notifications || notifications.length === 0) && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#f6f5f4] text-[#a39e98]">
              <BellOff className="size-5" />
            </span>
            <p className="text-sm font-medium text-[#31302e]">No notifications yet</p>
            <p className="text-xs text-[#615d59]">
              Reminders for your events and habits will show up here.
            </p>
          </div>
        )}

        {!isLoading && !isError && notifications && notifications.length > 0 && (
          <ul>
            {notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationItem notification={notification} onOpen={handleOpen} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
