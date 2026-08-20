import { useMemo, useState } from "react";
import { addHours, setHours, setMinutes } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarOccurrence } from "@lifeos/shared";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/Button";
import { CalendarView } from "./components/CalendarView";
import { EventForm } from "./components/EventForm";
import { useCalendarEvents, useEventDetail } from "./hooks/useCalendarEvents";
import {
  moveCursor,
  rangeForView,
  viewLabel,
  type CalendarView as ViewType
} from "./lib/rangeMath";

interface EditingTarget {
  eventId: string;
  occurrence?: CalendarOccurrence;
}

const VIEWS: ViewType[] = ["day", "week", "month"];

function nextHourStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export function CalendarPage() {
  const [view, setView] = useState<ViewType>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [createTarget, setCreateTarget] = useState<{ start: Date; end: Date } | null>(null);
  const [editing, setEditing] = useState<EditingTarget | null>(null);

  const range = useMemo(() => rangeForView(view, cursor), [view, cursor]);
  const { data: occurrences = [], isLoading } = useCalendarEvents(range.start, range.end, view);

  const editingEventId = editing?.eventId ?? null;
  const detailQuery = useEventDetail(editingEventId);
  const editingDetail = detailQuery.data ?? null;

  const formOpen = !!createTarget || (!!editing && detailQuery.isSuccess);

  const closeForm = () => {
    setCreateTarget(null);
    setEditing(null);
  };

  const handleSelectDay = (date: Date) => {
    const start = setHours(setMinutes(date, 0), 9);
    setCreateTarget({ start, end: addHours(start, 1) });
  };

  const handleNewEvent = () => {
    const start = nextHourStart();
    setCreateTarget({ start, end: addHours(start, 1) });
  };

  const handleOpenEvent = (occurrence: CalendarOccurrence) => {
    setEditing({
      eventId: occurrence.eventId,
      occurrence: occurrence.isRecurring ? occurrence : undefined
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 px-3 sm:px-6 lg:px-10 py-4 sm:py-6 max-w-7xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous"
              onClick={() => setCursor((c) => moveCursor(view, c, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next"
              onClick={() => setCursor((c) => moveCursor(view, c, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <h1 className="text-base sm:text-xl font-bold text-[#000000] ml-1">
            {viewLabel(view, cursor)}
          </h1>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div
            className="flex rounded-lg border border-[#e6e6e6] p-0.5 bg-[#faf9f8]"
            role="tablist"
            aria-label="Calendar view"
          >
            {VIEWS.map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-2.5 sm:px-3 py-1 text-xs sm:text-sm capitalize transition-colors",
                  view === v
                    ? "bg-[#0075de] font-medium text-white shadow-xs"
                    : "text-[#615d59] hover:bg-[#f6f5f4]"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleNewEvent} className="text-xs sm:text-sm">
            + New event
          </Button>
        </div>
      </header>

      <CalendarView
        view={view}
        cursor={cursor}
        range={range}
        occurrences={occurrences}
        isLoading={isLoading}
        onSelectDay={handleSelectDay}
        onOpenEvent={handleOpenEvent}
      />

      <EventForm
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        initialStart={createTarget?.start}
        initialEnd={createTarget?.end}
        event={editingDetail}
        occurrence={editing?.occurrence}
        onSaved={closeForm}
      />
    </div>
  );
}
