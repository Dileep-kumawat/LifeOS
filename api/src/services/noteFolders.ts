// Nesting depth cap for folders. Root folders sit at depth 0; a folder one
// level deep has depth 1, and so on. A tree deeper than this is rejected at
// create/rename time to avoid pathological recursive queries.
export const MAX_FOLDER_DEPTH = 5;

export interface FolderLike {
  _id: string;
  parentFolderId: string | null;
}

/**
 * Number of ancestor edges between `folderId` and the root. A folder whose
 * parent is null has depth 0; a folder nested under one root-level folder has
 * depth 1, etc.
 */
export function computeFolderDepth(folders: FolderLike[], folderId: string): number {
  let depth = 0;
  let current: string | null = folderId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) return depth; // cycle guard
    seen.add(current);
    const folder = folders.find((f) => f._id === current);
    if (!folder || !folder.parentFolderId) return depth;
    depth++;
    current = folder.parentFolderId;
  }

  return depth;
}

/**
 * Would placing a new child folder under `parentFolderId` exceed the nesting
 * cap? Root-level placement (no parent) is always allowed.
 */
export function wouldExceedMaxDepth(folders: FolderLike[], parentFolderId: string | null | undefined): boolean {
  if (!parentFolderId) return false;
  return computeFolderDepth(folders, parentFolderId) + 1 > MAX_FOLDER_DEPTH;
}

/**
 * Ancestor chain from `folderId` up to the root (including the folder itself).
 * Used to reject reparenting a folder into its own descendant (a cycle).
 */
export function folderChain(folders: FolderLike[], folderId: string): string[] {
  const chain: string[] = [];
  let current: string | null = folderId;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) return chain;
    seen.add(current);
    chain.push(current);
    const folder = folders.find((f) => f._id === current);
    current = folder?.parentFolderId ?? null;
  }

  return chain;
}

/**
 * True when `fromFolderId` is `targetFolderId` or a descendant of it.
 */
export function isFolderInChain(folders: FolderLike[], fromFolderId: string, targetFolderId: string): boolean {
  return folderChain(folders, fromFolderId).includes(targetFolderId);
}

// Minimal collection surface so the reassignment behavior is unit-testable
// without a live database. `Note.updateMany` satisfies this shape.
export interface NoteCollectionLike {
  updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<unknown>;
}

/**
 * Phase 1 folder-deletion behavior: notes inside the deleted folder are
 * REASSIGNED to root (folderId = null) rather than deleted or soft-deleted.
 * Less destructive than cascading deletion and reversible by the user.
 * Child folders are reparented by the route to the deleted folder's parent.
 */
export async function reassignNotesToRoot(
  notes: NoteCollectionLike,
  folderId: string,
  userId: string
): Promise<{ updatedCount: number }> {
  const result = (await notes.updateMany(
    { folderId, userId },
    { $set: { folderId: null } }
  )) as { modifiedCount?: number };
  return { updatedCount: result?.modifiedCount ?? 0 };
}
