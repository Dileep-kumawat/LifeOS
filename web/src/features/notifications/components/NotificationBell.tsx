import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/Popover";
import { useUnreadCount } from "../hooks/useNotifications";
import { NotificationPanel } from "./NotificationPanel";

const UNREAD_BADGE_LIMIT = 9;

/**
 * Persistent header bell. Polls the unread count via TanStack Query and shows
 * a badge ("9+" when overflowing). Keyboard-navigable and screen-reader
 * labelled — the count is announced via both the button's accessible name and
 * a polite live region, not just the visual badge.
 */
export function NotificationBell() {
  const { data: unread = 0 } = useUnreadCount();
  const [open, setOpen] = useState(false);

  const badgeLabel = unread > UNREAD_BADGE_LIMIT ? "9+" : String(unread);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unread > 0
              ? `${unread} unread notifications`
              : "Notifications, no unread notifications"
          }
          className="relative"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-[#0075de] px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
              {badgeLabel}
            </span>
          )}
          <span className="sr-only" role="status">
            {unread > 0 ? `${unread} unread notifications` : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Notifications">
        <NotificationPanel onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}