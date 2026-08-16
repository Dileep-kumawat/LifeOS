import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalNote, LocalNoteFolder } from "../schema";

export const noteRepo = {
  async createNote(
    note: Omit<LocalNote, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalNote> {
    return localRepo.insert("notes", note) as Promise<LocalNote>;
  },

  async updateNote(id: string, updates: Partial<LocalNote>): Promise<boolean> {
    return localRepo.update("notes", id, updates);
  },

  async deleteNote(id: string): Promise<boolean> {
    return localRepo.delete("notes", id);
  },

  async listNotes(userId: string): Promise<LocalNote[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalNote>(
      "SELECT * FROM notes WHERE userId = ? ORDER BY updatedAt DESC;",
      userId
    );
  },

  async createFolder(
    folder: Omit<
      LocalNoteFolder,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Promise<LocalNoteFolder> {
    return localRepo.insert("note_folders", folder) as Promise<LocalNoteFolder>;
  },

  async listFolders(userId: string): Promise<LocalNoteFolder[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalNoteFolder>("SELECT * FROM note_folders WHERE userId = ?;", userId);
  }
};
