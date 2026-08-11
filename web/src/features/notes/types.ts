import type { JSONContent } from "@tiptap/core";

// ProseMirror/TipTap rich-text document (the body of a note).
export type ProseMirrorDoc = JSONContent;

export interface Note {
  id: string;
  title: string;
  content: ProseMirrorDoc;
  contentText: string;
  folderId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// List responses omit the (potentially large) editor content JSON.
export type NoteSummary = Omit<Note, "content">;

export interface NoteFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface NotesListResponse {
  notes: NoteSummary[];
  pagination: Pagination;
}

export interface FoldersResponse {
  folders: NoteFolder[];
}

export interface TagsResponse {
  tags: string[];
}
