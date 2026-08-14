import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { notesApi } from "../../notes/api";
import { Skeleton } from "../../../components/ui/Skeleton";
import type { NoteSummary } from "../../notes/types";

export function RecentNotesWidget() {
  const { data: notesData, isLoading, isError } = useQuery({
    queryKey: ["notes", { limit: 4 }],
    queryFn: () => notesApi.list({ limit: 4 })
  });

  const notes: NoteSummary[] = notesData?.notes || [];

  const tagColors = [
    "bg-purple-100 text-purple-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700"
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e6e6e6] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[20px] font-bold text-[#1a1c1c] flex items-center gap-2">
          <FileText className="size-5 text-[#717784]" />
          Recent Thoughts
        </h3>
        <Link
          to="/notes"
          className="text-[#005db2] text-sm font-semibold hover:underline transition-colors"
        >
          View All
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <p className="text-xs text-[#717784] py-4 text-center">Unable to load recent notes.</p>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-5 text-center">
          <p className="text-xs text-[#717784] mb-2">No notes created yet.</p>
          <Link
            to="/notes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-[#faf9f8] px-3.5 py-1.5 text-xs font-semibold text-[#1a1c1c] hover:bg-[#e9e8e7] transition-colors"
          >
            <Plus className="size-3.5" />
            Create Note
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {notes.slice(0, 3).map((note: NoteSummary, idx: number) => {
            const tagColor = tagColors[idx % tagColors.length];
            const tagLabel = note.tags?.[0] || (idx % 2 === 0 ? "Work" : "Personal");

            return (
              <Link
                key={note.id}
                to={`/notes/${note.id}`}
                className="p-3 rounded-lg border border-[#e3e2e1] bg-white hover:bg-[#faf9f8] transition-colors block group"
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className="text-[13px] font-semibold text-[#1a1c1c] truncate group-hover:text-[#005db2] transition-colors">
                    {note.title || "Untitled Note"}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded shrink-0 ${tagColor}`}>
                    {tagLabel}
                  </span>
                </div>
                <p className="text-[12px] text-[#717784] line-clamp-2">
                  {note.contentText || "Click to open and edit this note in your workspace."}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

