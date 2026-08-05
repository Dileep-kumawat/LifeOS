import { isValidObjectId } from "mongoose";

export const MAX_SEARCH_LENGTH = 200;

/**
 * Search input hygiene. Mongo text search is not regex-based, but queries
 * still need to be non-empty and reasonably bounded in length to avoid
 * trivially large index scans or accidental abuse. Returns null when the term
 * is absent/blank (callers treat that as "no search"); throws when the term
 * violates the length bound so callers can 400.
 */
export function normalizeSearchTerm(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    throw new Error(`Search query must be a string.`);
  }
  const term = raw.trim();
  if (term.length === 0) return null;
  if (term.length > MAX_SEARCH_LENGTH) {
    throw new Error(`Search query must be at most ${MAX_SEARCH_LENGTH} characters.`);
  }
  return term;
}

export interface ListNotesFilterParams {
  userId: string;
  folderId?: string;
  tag?: string;
  search?: string;
}

export type NotesSort = Record<string, any>;

/**
 * Pure query builder for GET /notes. Kept as a standalone function so the
 * filter/sort logic is unit-testable without a database. When `search` is
 * present the `$text` operator is added and results are sorted by relevance
 * (textScore) instead of recency. Title-matching notes rank above body-only
 * matches because the text index weights `title` higher than `contentText`
 * (see models/Note.ts).
 */
export function buildNotesListFilter(params: ListNotesFilterParams): {
  filter: Record<string, unknown>;
  sort: NotesSort;
} {
  const filter: Record<string, unknown> = { userId: params.userId };

  if (params.folderId && isValidObjectId(params.folderId)) {
    filter.folderId = params.folderId;
  }
  if (params.tag) {
    filter.tags = params.tag;
  }

  let sort: NotesSort = { updatedAt: -1 };
  if (params.search) {
    filter.$text = { $search: params.search };
    sort = { score: { $meta: "textScore" } };
  }

  return { filter, sort };
}
