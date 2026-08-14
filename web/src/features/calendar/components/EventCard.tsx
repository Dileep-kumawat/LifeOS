import type { CSSProperties, MouseEvent } from "react";
import type { CalendarOccurrence } from "@lifeos/shared";
import { format } from "date-fns";
import { cn } from "../../../lib/utils";

interface EventCardProps {
  occurrence: CalendarOccurrence;
  /** `chip` = compact month-cell badge; `block` = filled timeline block. */
  variant?: "chip" | "block";
  className?: string;
  style?: CSSProperties;
  onOpen: (occurrence: CalendarOccurrence) => void;
}

export function EventCard({
  occurrence,
  variant = "chip",
  className,
  style,
  onOpen
}: EventCardProps) {
  const start = new Date(occurrence.startTime);
  const timeLabel = occurrence.isAllDay ? "All day" : format(start, "h:mm a");

  const handleOpen = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onOpen(occurrence);
  };

  if (variant === "block") {
    return (
      <button
        type="button"
        onClick={handleOpen}
        title={occurrence.title}
        style={style}
        className={cn(
          "absolute left-0 right-0 z-10 flex flex-col gap-0.5 overflow-hidden rounded border-l-2 border-[#0075de] bg-[#e8f1fb] px-1.5 py-1 text-left text-xs text-[#003a6b] shadow-2xs transition-all duration-150 hover:bg-[#d7e9fa] hover:shadow-md hover:scale-[1.02] hover:z-20 active:scale-[0.98] cursor-pointer",
          className
        )}
      >
        <span className="truncate font-semibold">{occurrence.title}</span>
        <span className="truncate text-[10px] text-[#615d59]">{timeLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      title={occurrence.title}
      style={style}
      className={cn(
        "flex w-full items-center gap-1 overflow-hidden rounded px-1.5 py-0.5 text-left text-xs text-[#003a6b] transition-all duration-150 hover:bg-[#e8f1fb] hover:translate-x-0.5 active:scale-[0.98] cursor-pointer",
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-[#0075de] transition-transform duration-150 group-hover:scale-125" />
      {!occurrence.isAllDay && (
        <span className="shrink-0 text-[10px] font-medium text-[#615d59]">{timeLabel}</span>
      )}
      <span className="truncate font-medium">{occurrence.title}</span>
    </button>
  );
}
