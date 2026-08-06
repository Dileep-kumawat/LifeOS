import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, ListChecks, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import type { Notification as AppNotification } from "@lifeos/shared";
import { cn } from "../../../lib/utils";

const TYPE_ICONS: Record<string, LucideIcon> = {
  calendar_reminder: Calendar,
  habit_reminder: ListChecks,
  budget_alert: Wallet,
  daily_summary: Sparkles,
  system: Bell
};

export interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}

/** Screen-reader description that announces read/unread state. */
function describe(notification: AppNotification): string {
  const title = notification.payload.title || "Notification";
  const state = notification.readStatus === "unread" ? "unread" : "read";
  return `${title}, ${state}. ${notification.payload.body || ""}`.trim();
}

function relativeTime(notification: AppNotification): string {
  const ts = notification.scheduledFor || notification.createdAt;
  if (!ts) return "";
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return "";
  }
}

export function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const unread = notification.readStatus === "unread";
  const batched = notification.payload.items?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      aria-label={describe(notification)}
      className={cn(
        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f6f5f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0075de]",
        unread && "bg-[#f3f8ff]"
      )}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f5f4] text-[#615d59]"
      >
        <Icon className="size-4" />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              unread ? "text-[#000000]" : "text-[#31302e]"
            )}
          >
            {notification.payload.title || "Notification"}
          </span>
          {unread && (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#0075de]" />
          )}
          {unread && <span className="sr-only">Unread</span>}
        </span>

        {notification.payload.body && (
          <span className="truncate text-xs text-[#615d59]">{notification.payload.body}</span>
        )}

        <span className="text-[11px] text-[#a39e98]">{relativeTime(notification)}</span>

        {batched > 1 && (
          <span className="text-[11px] font-medium text-[#0075de]">
            +{batched - 1} more
          </span>
        )}
      </span>
    </button>
  );
}