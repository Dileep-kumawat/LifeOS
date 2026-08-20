import { Link } from "react-router-dom";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { useCalendarEvents } from "../../calendar/hooks/useCalendarEvents";
import { dayRange } from "../../calendar/lib/rangeMath";
import { Skeleton } from "../../../components/ui/Skeleton";

export function TodayScheduleWidget() {
  const todayRange = dayRange(new Date());
  const {
    data: events = [],
    isLoading,
    isError
  } = useCalendarEvents(todayRange.start, todayRange.end, "day");

  return (
    <div className="bg-white rounded-xl border border-[#e6e6e6] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[20px] font-bold text-[#1a1c1c] flex items-center gap-2">
          <CalendarIcon className="size-5 text-[#717784]" />
          Agenda
        </h3>
        <Link
          to="/calendar"
          className="text-[#005db2] text-sm font-semibold hover:underline transition-colors"
        >
          View Calendar
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 py-1">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <p className="text-xs text-[#717784] py-4 text-center">Unable to load today's schedule.</p>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-[#717784] mb-3">No events scheduled for today.</p>
          <Link
            to="/calendar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-[#faf9f8] px-3.5 py-1.5 text-xs font-semibold text-[#1a1c1c] hover:bg-[#e9e8e7] transition-colors"
          >
            <Plus className="size-3.5" />
            Add Event
          </Link>
        </div>
      ) : (
        <div className="relative pl-4 border-l-2 border-[#e3e2e1] space-y-6">
          {events.slice(0, 5).map((evt: any, idx: number) => {
            const startTimeStr = new Date(evt.startTime || evt.start).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });
            const endTimeStr = new Date(evt.endTime || evt.end).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });

            const dotColors = [
              "bg-blue-500",
              "bg-purple-500",
              "bg-emerald-500",
              "bg-amber-500",
              "bg-sky-500"
            ];
            const dotColor = dotColors[idx % dotColors.length];

            return (
              <div key={evt.id || idx} className="relative">
                <div
                  className={`absolute -left-[23px] top-1 size-3 rounded-full ${dotColor} border-2 border-white`}
                />
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#1a1c1c] truncate">{evt.title}</p>
                    {evt.description && (
                      <p className="text-xs text-[#414753] mt-0.5 truncate">{evt.description}</p>
                    )}
                  </div>
                  <span className="font-mono text-xs bg-[#efeeed] px-2 py-1 rounded text-[#414753] shrink-0 font-medium">
                    {evt.isAllDay ? "All Day" : `${startTimeStr} - ${endTimeStr}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
