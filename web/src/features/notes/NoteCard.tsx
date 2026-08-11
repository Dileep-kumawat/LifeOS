import type React from "react";
import { FileText, Folder, Trash2, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { NoteSummary } from "./types";

export interface NoteCardProps {
  note: NoteSummary;
  folderName?: string;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDragStart?: (e: React.DragEvent, noteId: string) => void;
  draggable?: boolean;
}

const SNIPPET_LENGTH = 140;

function truncate(text: string, max = SNIPPET_LENGTH): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function NoteCard({
  note,
  folderName,
  onSelect,
  onDelete,
  onDragStart,
  draggable = false
}: NoteCardProps) {
  const snippet = truncate(note.contentText) || "No content yet";

  return (
    <div
      draggable={draggable}
      onDragStart={
        onDragStart ? (e) => e.dataTransfer.setData("application/x-note-id", note.id) : undefined
      }
      onClick={() => onSelect?.(note.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(note.id);
        }
      }}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-sm font-semibold text-[#000000]">
            {note.title || "Untitled"}
          </h3>
          <p className="line-clamp-3 text-xs leading-relaxed text-[#615d59]">{snippet}</p>
        </div>
        {onDelete && (
          <button
            type="button"
            aria-label="Delete note"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="rounded-md p-1.5 text-[#a39e98] opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#e6e6e6] pt-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-3.5 shrink-0 text-[#a39e98]" aria-hidden="true" />
          <span className="text-[11px] text-[#615d59]">
            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
          </span>
          {folderName && (
            <span className="inline-flex max-w-[10rem] items-center gap-1 truncate rounded-full border border-[#e6e6e6] bg-white px-2 py-0.5 text-[10px] font-medium text-[#0075de]">
              <Folder className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{folderName}</span>
            </span>
          )}
        </div>

        {note.tags.length > 0 && (
          <div className="flex shrink-0 items-center gap-1">
            <Tag className="size-3 text-[#a39e98]" aria-hidden="true" />
            <span className="text-[11px] text-[#31302e]">{note.tags.slice(0, 2).join(", ")}</span>
            {note.tags.length > 2 && (
              <span className="text-[11px] text-[#a39e98]">+{note.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
