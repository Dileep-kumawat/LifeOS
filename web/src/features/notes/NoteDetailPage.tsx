import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, CheckCircle2, Loader2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { notesApi } from "./api";
import { NoteEditor } from "./NoteEditor";
import { TagInput } from "./TagInput";
import { FolderPicker } from "./FolderPicker";
import { Button } from "../../components/Button";
import type { ProseMirrorDoc } from "./types";

type SaveState = "saved" | "saving" | "dirty" | "error";

const AUTOSAVE_DELAY_MS = 2000;

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: note, isLoading: noteLoading } = useQuery({
    queryKey: ["note", id],
    queryFn: () => notesApi.get(id!),
    enabled: Boolean(id)
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["notes", "folders"],
    queryFn: () => notesApi.listFolders()
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["notes", "tags"],
    queryFn: () => notesApi.listTags()
  });

  // Local editing state — the source of truth for the inputs. Initialised
  // from the loaded note exactly once so refetches never clobber edits.
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ProseMirrorDoc | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (note && !initializedRef.current) {
      initializedRef.current = true;
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setFolderId(note.folderId);
    }
  }, [note]);

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const pendingRef = useRef<Record<string, unknown>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => notesApi.update(id!, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(["note", id], updated);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", "tags"] });
    }
  });

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const payload = pendingRef.current;
    if (Object.keys(payload).length === 0) return;
    pendingRef.current = {};
    setSaveState("saving");
    updateMutation.mutate(payload, {
      onSuccess: () => setSaveState("saved"),
      onError: () => setSaveState("error")
    });
  }, [updateMutation]);

  // Debounce PATCHes so rapid keystrokes coalesce into one save per idle
  // window (~2s after the last change).
  const scheduleSave = useCallback(
    (patch: Record<string, unknown>) => {
      Object.assign(pendingRef.current, patch);
      setSaveState("dirty");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
    },
    [flushSave]
  );

  // Flush anything still pending when leaving the page.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const payload = pendingRef.current;
      if (Object.keys(payload).length > 0 && id) {
        void notesApi.update(id, payload).catch(() => {});
      }
    };
  }, [id]);

  function handleDelete() {
    if (!id) return;
    if (!window.confirm("Delete this note permanently? This cannot be undone.")) return;
    void notesApi
      .remove(id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        toast.success("Note deleted.");
        navigate("/notes");
      })
      .catch((err) => toast.error(err.response?.data?.message || "Failed to delete note"));
  }

  const saveMeta = {
    saved: { icon: CheckCircle2, label: "Saved", className: "text-emerald-600" },
    saving: { icon: Loader2, label: "Saving…", className: "text-[#615d59]" },
    dirty: { icon: Clock, label: "Unsaved changes", className: "text-[#a39e98]" },
    error: { icon: AlertTriangle, label: "Save failed", className: "text-red-500" }
  }[saveState];
  const SaveIcon = saveMeta.icon;

  if (noteLoading) {
    return <p className="py-12 text-center text-sm text-[#615d59]">Loading note…</p>;
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-[#615d59]">
        <p>Note not found.</p>
        <Link to="/notes" className="text-xs text-[#0075de] hover:underline">
          Back to Notes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <Link
        to="/notes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#615d59] hover:text-[#0075de]"
      >
        <ArrowLeft className="size-4" data-icon="inline-start" />
        Back to Notes
      </Link>

      {/* Title bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            placeholder="Untitled"
            maxLength={300}
            aria-label="Note title"
            className="min-w-0 flex-1 bg-transparent text-xl font-bold text-[#000000] placeholder:text-[#a39e98] focus:outline-none"
          />
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${saveMeta.className}`}
          >
            <SaveIcon className={`size-3.5 ${saveState === "saving" ? "animate-spin" : ""}`} aria-hidden="true" />
            {saveMeta.label}
          </span>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            aria-label="Delete note"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#e6e6e6] pt-3 sm:flex-row sm:items-start">
          <div className="w-full sm:max-w-[14rem]">
            <FolderPicker
              folders={folders}
              value={folderId}
              onChange={(next) => {
                setFolderId(next);
                updateMutation.mutate(
                  { folderId: next },
                  { onSuccess: () => setSaveState("saved"), onError: () => setSaveState("error") }
                );
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#615d59]">
              Tags
            </span>
            <TagInput
              value={tags}
              suggestions={allTags}
              onChange={(next) => {
                setTags(next);
                scheduleSave({ tags: next });
              }}
            />
          </div>
        </div>
      </div>

      {content && (
        <NoteEditor
          content={content}
          onChange={(doc) => {
            setContent(doc);
            scheduleSave({ content: doc });
          }}
          placeholder="Start writing…"
        />
      )}
    </div>
  );
}