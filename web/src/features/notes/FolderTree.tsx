import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Files,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { NoteFolder } from "./types";

export interface FolderTreeProps {
  folders: NoteFolder[];
  activeFolderId?: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onNewFolder: (parentFolderId: string | null) => void;
  onRenameFolder: (folder: NoteFolder) => void;
  onDeleteFolder: (folder: NoteFolder) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string | null) => void;
  rootCount?: number;
  noteCounts?: Record<string, number>;
}

interface TreeRowProps {
  folder: NoteFolder;
  depth: number;
  children: ReactNode[];
  active: boolean;
  count?: number;
  onSelect: () => void;
  onNew: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string | null) => void;
}

function TreeRow({
  folder,
  depth,
  children,
  active,
  count,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onMoveNoteToFolder
}: TreeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  function handleDrop(e: React.DragEvent) {
    if (!onMoveNoteToFolder) return;
    const noteId = e.dataTransfer.getData("application/x-note-id");
    if (noteId) {
      e.preventDefault();
      onMoveNoteToFolder(noteId, folder.id);
    }
  }

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md py-1 pr-2 text-sm",
          active ? "bg-[#f6f5f4] text-[#000000]" : "text-[#31302e] hover:bg-[#f6f5f4]"
        )}
        style={{ paddingLeft: `${depth * 0.75 + 0.25}rem` }}
        onDragOver={onMoveNoteToFolder ? (e) => e.preventDefault() : undefined}
        onDrop={onMoveNoteToFolder ? handleDrop : undefined}
      >
        <button
          type="button"
          aria-label={hasChildren ? (expanded ? "Collapse" : "Expand") : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded text-[#a39e98]",
            hasChildren ? "opacity-100" : "opacity-0"
          )}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {active ? (
            <FolderOpen className="size-4 shrink-0 text-[#0075de]" aria-hidden="true" />
          ) : (
            <Folder className="size-4 shrink-0 text-[#a39e98]" aria-hidden="true" />
          )}
          <span className="truncate">{folder.name}</span>
          {count !== undefined && count > 0 && (
            <span className="ml-auto shrink-0 text-[11px] text-[#a39e98]">{count}</span>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label={`New subfolder in ${folder.name}`}
            onClick={onNew}
            className="rounded p-0.5 text-[#a39e98] hover:text-[#0075de]"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Rename ${folder.name}`}
            onClick={onRename}
            className="rounded p-0.5 text-[#a39e98] hover:text-[#000000]"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${folder.name}`}
            onClick={onDelete}
            className="rounded p-0.5 text-[#a39e98] hover:text-red-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && expanded && <ul className="flex flex-col">{children.map((child) => child)}</ul>}
    </li>
  );
}

export function FolderTree({
  folders,
  activeFolderId = null,
  onSelectFolder,
  onNewFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveNoteToFolder,
  rootCount = 0,
  noteCounts = {}
}: FolderTreeProps) {
  const childrenOf = (parentId: string | null) =>
    folders
      .filter((f) => (f.parentFolderId ?? null) === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));

  const renderNode = (folder: NoteFolder, depth: number) => {
    const children = childrenOf(folder.id);
    return (
      <TreeRow
        key={folder.id}
        folder={folder}
        depth={depth}
        children={children.map((c) => renderNode(c, depth + 1))}
        active={activeFolderId === folder.id}
        count={noteCounts[folder.id]}
        onSelect={() => onSelectFolder(folder.id)}
        onNew={() => onNewFolder(folder.id)}
        onRename={() => onRenameFolder(folder)}
        onDelete={() => onDeleteFolder(folder)}
        onMoveNoteToFolder={onMoveNoteToFolder}
      />
    );
  };

  function handleRootDrop(e: React.DragEvent) {
    if (!onMoveNoteToFolder) return;
    const noteId = e.dataTransfer.getData("application/x-note-id");
    if (noteId) {
      e.preventDefault();
      onMoveNoteToFolder(noteId, null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1 text-sm",
          activeFolderId === null ? "bg-[#f6f5f4] text-[#000000]" : "text-[#31302e] hover:bg-[#f6f5f4]"
        )}
        onDragOver={onMoveNoteToFolder ? (e) => e.preventDefault() : undefined}
        onDrop={onMoveNoteToFolder ? handleRootDrop : undefined}
      >
        <Files className="size-4 shrink-0 text-[#a39e98]" aria-hidden="true" />
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className="flex flex-1 items-center gap-1.5 text-left"
        >
          <span className="truncate">All Notes</span>
          {rootCount > 0 && <span className="ml-auto text-[11px] text-[#a39e98]">{rootCount}</span>}
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label="New folder"
            onClick={() => onNewFolder(null)}
            className="rounded p-0.5 text-[#a39e98] hover:text-[#0075de]"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <ul className="flex flex-col">
        {childrenOf(null).map((folder) => renderNode(folder, 0))}
      </ul>
    </div>
  );
}