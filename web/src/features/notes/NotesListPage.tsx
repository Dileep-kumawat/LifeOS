import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FilePlus, FolderPlus, Search, X, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { notesApi } from "./api";
import { NoteCard } from "./NoteCard";
import { FolderTree } from "./FolderTree";
import { FolderManager } from "./FolderManager";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/Button";
import type { NoteSummary, NoteFolder } from "./types";

export function NotesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [folderManager, setFolderManager] = useState<
    | { mode: "create"; parentFolderId: string | null }
    | { mode: "rename"; folder: NoteFolder }
    | null
  >(null);

  // Debounce the search bar so we only hit the API ~350ms after the user
  // stops typing rather than on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: folders = [] } = useQuery({
    queryKey: ["notes", "folders"],
    queryFn: () => notesApi.listFolders()
  });

  const notesQuery = useInfiniteQuery({
    queryKey: ["notes", { folder: selectedFolder, search }],
    queryFn: ({ pageParam }) =>
      notesApi.list({
        folderId: selectedFolder,
        search: search || undefined,
        page: pageParam,
        limit: 20
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined)
  });

  const notes = notesQuery.data?.pages.flatMap((p) => p.notes) ?? [];
  const total = notesQuery.data?.pages[0]?.pagination.total ?? 0;

  const activeFolder = folders.find((f) => f.id === selectedFolder);

  const folderNameOf = (folderId: string | null) => folders.find((f) => f.id === folderId)?.name;

  const invalidateNotes = () => {
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    queryClient.invalidateQueries({ queryKey: ["notes", "folders"] });
  };

  function handleCreateNote() {
    void notesApi
      .create({ title: "", folderId: selectedFolder, tags: [] })
      .then((note) => navigate(`/notes/${note.id}`))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to create note"));
  }

  function handleDeleteNote(id: string) {
    if (!window.confirm("Delete this note permanently?")) return;
    void notesApi
      .remove(id)
      .then(() => {
        invalidateNotes();
        toast.success("Note deleted.");
      })
      .catch((err) => toast.error(err.response?.data?.message || "Failed to delete note"));
  }

  function handleMoveNote(noteId: string, folderId: string | null) {
    void notesApi
      .update(noteId, { folderId })
      .then(() => {
        invalidateNotes();
        toast.success("Note moved.");
      })
      .catch((err) => toast.error(err.response?.data?.message || "Failed to move note"));
  }

  function handleFolderSubmit(data: { name: string; parentFolderId: string | null }) {
    if (folderManager?.mode === "rename") {
      void notesApi
        .renameFolder(folderManager.folder.id, { name: data.name })
        .then(() => {
          invalidateNotes();
          setFolderManager(null);
          toast.success("Folder renamed.");
        })
        .catch((err) => toast.error(err.response?.data?.message || "Failed to rename folder"));
    } else {
      void notesApi
        .createFolder(data)
        .then(() => {
          invalidateNotes();
          setFolderManager(null);
          toast.success("Folder created.");
        })
        .catch((err) => toast.error(err.response?.data?.message || "Failed to create folder"));
    }
  }

  function handleDeleteFolder(folder: NoteFolder) {
    if (!confirm(`Delete folder "${folder.name}"? Its notes move to root and are NOT deleted.`))
      return;
    void notesApi
      .deleteFolder(folder.id)
      .then(() => {
        if (selectedFolder === folder.id) setSelectedFolder(null);
        invalidateNotes();
        toast.success("Folder deleted. Notes moved to root.");
      })
      .catch((err) => toast.error(err.response?.data?.message || "Failed to delete folder"));
  }

  const isSearching = search.length > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#000000]">
            <StickyNote className="size-6 text-[#0075de]" />
            Notes
          </h1>
          <p className="text-xs text-[#615d59]">
            {isSearching
              ? `Showing results for “${search}”`
              : activeFolder
                ? `In folder “${activeFolder.name}”`
                : "All your notes, organized in folders."}
          </p>
        </div>
        <Button onClick={handleCreateNote}>
          <FilePlus data-icon="inline-start" />
          New Note
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-60">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#615d59]">
              Folders
            </span>
            <button
              type="button"
              aria-label="New folder"
              onClick={() => setFolderManager({ mode: "create", parentFolderId: null })}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#0075de] hover:bg-[#f6f5f4]"
            >
              <FolderPlus className="size-3.5" data-icon="inline-start" />
              New
            </button>
          </div>

          <div className="rounded-xl border border-[#e6e6e6] bg-white p-2 shadow-sm">
            <FolderTree
              folders={folders}
              activeFolderId={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onNewFolder={(parentFolderId) => setFolderManager({ mode: "create", parentFolderId })}
              onRenameFolder={(folder) => setFolderManager({ mode: "rename", folder })}
              onDeleteFolder={handleDeleteFolder}
              onMoveNoteToFolder={handleMoveNote}
            />
          </div>

          <p className="mt-2 px-1 text-[11px] leading-relaxed text-[#a39e98]">
            Drag a note onto a folder to move it. {total} note(s).
          </p>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a39e98]"
              aria-hidden="true"
            />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search your notes…"
              className="pl-9"
              aria-label="Search notes"
            />
            {isSearching && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#615d59] hover:bg-[#f6f5f4]"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {isSearching && (
            <div className="flex items-center justify-between rounded-lg border border-[#e6e6e6] bg-[#f6f5f4] px-3 py-2">
              <span className="text-xs text-[#31302e]">
                Showing results for <strong>“{search}”</strong>
                {selectedFolder ? ` in “${activeFolder?.name}”` : ""} — {total} found.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Content */}
          {notesQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-[#615d59]">Loading notes…</p>
          ) : notesQuery.isError ? (
            <p className="py-10 text-center text-sm text-red-500">Failed to load notes.</p>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e6e6e6] bg-[#f6f5f4] p-12 text-center">
              <StickyNote className="size-12 text-[#a39e98] mb-3" />
              <h3 className="text-base font-semibold text-[#000000]">
                {isSearching
                  ? "No matching notes"
                  : activeFolder
                    ? "This folder is empty"
                    : "No notes yet"}
              </h3>
              <p className="max-w-sm text-xs text-[#615d59] mt-1 mb-4">
                {isSearching
                  ? `No notes matched “${search}”. Try different words.`
                  : "Create your first note, or drag existing notes into folders."}
              </p>
              {!isSearching && (
                <Button onClick={handleCreateNote}>
                  <FilePlus data-icon="inline-start" />
                  Create First Note
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {notes.map((note: NoteSummary) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    folderName={folderNameOf(note.folderId)}
                    draggable
                    onSelect={(id) => navigate(`/notes/${id}`)}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>

              {notesQuery.hasNextPage && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => notesQuery.fetchNextPage()}
                    disabled={notesQuery.isFetchingNextPage}
                  >
                    {notesQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <FolderManager
        open={folderManager !== null}
        mode={folderManager?.mode ?? "create"}
        initialName={folderManager?.mode === "rename" ? folderManager.folder.name : ""}
        initialParentFolderId={
          folderManager?.mode === "create" ? folderManager.parentFolderId : null
        }
        folders={folders}
        onClose={() => setFolderManager(null)}
        onSubmit={handleFolderSubmit}
        isSubmitting={false}
      />
    </div>
  );
}
