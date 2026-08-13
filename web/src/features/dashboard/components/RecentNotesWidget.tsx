import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, Plus, Folder } from "lucide-react";
import { notesApi } from "../../notes/api";
import { Skeleton } from "../../../components/ui/Skeleton";
import type { NoteSummary } from "../../notes/types";

export function RecentNotesWidget() {
  const { data: notesData, isLoading, isError } = useQuery({
    queryKey: ["notes", { limit: 4 }],
    queryFn: () => notesApi.list({ limit: 4 })
  });

  const notes: NoteSummary[] = notesData?.notes || [];

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FileText className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Recent Notes</h3>
            <p className="text-[11px] text-muted-foreground">Knowledge & ideas</p>
          </div>
        </div>

        <Link
          to="/notes"
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 transition-colors"
        >
          View All <ArrowRight className="size-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Unable to load recent notes.</p>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-5 text-center">
          <p className="text-xs text-muted-foreground mb-2">No notes created yet.</p>
          <Link
            to="/notes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="size-3.5" />
            Create Note
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {notes.slice(0, 4).map((note: NoteSummary) => (
            <Link
              key={note.id}
              to={`/notes/${note.id}`}
              className="group flex flex-col gap-1 rounded-xl border border-border/40 bg-accent/20 p-3 transition-all hover:bg-accent/40 hover:border-amber-200 dark:hover:border-amber-900/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {note.title || "Untitled Note"}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                  {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>

              {note.contentText && (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {note.contentText}
                </p>
              )}

              {note.folderId && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <Folder className="size-3 text-amber-500/70" />
                  <span className="truncate">Folder</span>
                </div>
              )}
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
