import { Link } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, ArrowRight, Plus } from "lucide-react";
import { useCalendarEvents } from "../../calendar/hooks/useCalendarEvents";
import { dayRange } from "../../calendar/lib/rangeMath";
import { Skeleton } from "../../../components/ui/Skeleton";

export function TodayScheduleWidget() {
  const todayRange = dayRange(new Date());
  const { data: events = [], isLoading, isError } = useCalendarEvents(todayRange.start, todayRange.end, "day");

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CalendarIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Today's Schedule</h3>
            <p className="text-[11px] text-muted-foreground">
              {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        <Link
          to="/calendar"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
        >
          Calendar <ArrowRight className="size-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5 py-1">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Unable to load today's schedule.</p>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">No events scheduled for today.</p>
          <Link
            to="/calendar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="size-3.5" />
            Add Event
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {events.slice(0, 5).map((evt: any, idx: number) => {
            const startTimeStr = new Date(evt.startTime || evt.start).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });
            const endTimeStr = new Date(evt.endTime || evt.end).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <li
                key={evt.id || idx}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-accent/20 p-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-2 rounded-full bg-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {evt.title}
                    </p>
                    {evt.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{evt.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-background px-2 py-1 rounded-md border border-border/50 shrink-0">
                  <Clock className="size-3 text-muted-foreground" />
                  <span>{evt.isAllDay ? "All Day" : `${startTimeStr} - ${endTimeStr}`}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
