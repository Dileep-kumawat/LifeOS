import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalNote, LocalNoteFolder, LocalNoteVersion } from "../schema";

export const noteRepo = {
  async createNote(
    note: Omit<LocalNote, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalNote> {
    const created = (await localRepo.insert("notes", note)) as LocalNote;

    // Create initial version snapshot
    await localRepo.insert("note_versions", {
      noteId: created.id,
      userId: created.userId,
      versionNumber: 1,
      title: created.title,
      content: created.content,
      contentText: created.contentText,
      folderId: created.folderId,
      tags: created.tags,
      changeSource: "mobile_created",
      createdAt: created.createdAt
    });

    return created;
  },

  async updateNote(id: string, updates: Partial<LocalNote>): Promise<boolean> {
    const existing = await this.getNoteById(id);
    if (!existing) return false;

    const ok = await localRepo.update("notes", id, updates);
    if (ok) {
      // Save version snapshot
      const db = await getDatabase();
      const versions = await db.getAllAsync<LocalNoteVersion>(
        "SELECT versionNumber FROM note_versions WHERE noteId = ? ORDER BY versionNumber DESC LIMIT 1;",
        id
      );
      const nextVer = (versions[0]?.versionNumber || 1) + 1;

      const merged = { ...existing, ...updates };
      await localRepo.insert("note_versions", {
        noteId: id,
        userId: merged.userId,
        versionNumber: nextVer,
        title: merged.title,
        content: merged.content,
        contentText: merged.contentText,
        folderId: merged.folderId,
        tags: merged.tags,
        changeSource: "mobile_edited",
        createdAt: new Date().toISOString()
      });
    }
    return ok;
  },

  async deleteNote(id: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM note_versions WHERE noteId = ?;", id);
    return localRepo.delete("notes", id);
  },

  async getNoteById(id: string): Promise<LocalNote | null> {
    const db = await getDatabase();
    return db.getFirstAsync<LocalNote>("SELECT * FROM notes WHERE id = ?;", id);
  },

  async listNotes(
    userId: string,
    options?: { folderId?: string | null; tag?: string; search?: string }
  ): Promise<LocalNote[]> {
    const db = await getDatabase();
    let query = "SELECT * FROM notes WHERE userId = ?";
    const params: any[] = [userId];

    if (options?.folderId !== undefined) {
      if (options.folderId === null) {
        query += " AND (folderId IS NULL OR folderId = '')";
      } else {
        query += " AND folderId = ?";
        params.push(options.folderId);
      }
    }

    if (options?.search) {
      query += " AND (title LIKE ? OR contentText LIKE ?)";
      const pattern = `%${options.search}%`;
      params.push(pattern, pattern);
    }

    query += " ORDER BY updatedAt DESC;";

    const notes = await db.getAllAsync<LocalNote>(query, ...params);

    if (options?.tag) {
      return notes.filter((n) => {
        try {
          const tags: string[] = JSON.parse(n.tags || "[]");
          return tags.includes(options.tag!);
        } catch {
          return false;
        }
      });
    }

    return notes;
  },

  async listNoteVersions(noteId: string): Promise<LocalNoteVersion[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalNoteVersion>(
      "SELECT * FROM note_versions WHERE noteId = ? ORDER BY versionNumber DESC;",
      noteId
    );
  },

  async restoreNoteVersion(noteId: string, versionNumber: number): Promise<LocalNote | null> {
    const db = await getDatabase();
    const targetVersion = await db.getFirstAsync<LocalNoteVersion>(
      "SELECT * FROM note_versions WHERE noteId = ? AND versionNumber = ?;",
      noteId,
      versionNumber
    );
    if (!targetVersion) return null;

    await this.updateNote(noteId, {
      title: targetVersion.title,
      content: targetVersion.content,
      contentText: targetVersion.contentText,
      folderId: targetVersion.folderId,
      tags: targetVersion.tags
    });

    return this.getNoteById(noteId);
  },

  async createFolder(
    folder: Omit<
      LocalNoteFolder,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Promise<LocalNoteFolder> {
    return localRepo.insert("note_folders", folder) as Promise<LocalNoteFolder>;
  },

  async updateFolder(id: string, updates: Partial<LocalNoteFolder>): Promise<boolean> {
    return localRepo.update("note_folders", id, updates);
  },

  async deleteFolder(id: string): Promise<boolean> {
    const db = await getDatabase();
    // Unassign notes in this folder
    await db.runAsync("UPDATE notes SET folderId = NULL WHERE folderId = ?;", id);
    return localRepo.delete("note_folders", id);
  },

  async listFolders(userId: string): Promise<LocalNoteFolder[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalNoteFolder>(
      "SELECT * FROM note_folders WHERE userId = ? ORDER BY name ASC;",
      userId
    );
  },

  async listTags(userId: string): Promise<string[]> {
    const notes = await this.listNotes(userId);
    const tagSet = new Set<string>();
    for (const note of notes) {
      try {
        const tags: string[] = JSON.parse(note.tags || "[]");
        tags.forEach((t) => tagSet.add(t));
      } catch {}
    }
    return Array.from(tagSet).sort();
  }
};
