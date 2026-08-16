import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalEvent } from "../schema";

export const eventRepo = {
  async createEvent(
    event: Omit<LocalEvent, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalEvent> {
    return localRepo.insert("events", event) as Promise<LocalEvent>;
  },

  async updateEvent(id: string, updates: Partial<LocalEvent>): Promise<boolean> {
    return localRepo.update("events", id, updates);
  },

  async deleteEvent(id: string): Promise<boolean> {
    return localRepo.delete("events", id);
  },

  async listEvents(userId: string): Promise<LocalEvent[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalEvent>(
      "SELECT * FROM events WHERE userId = ? ORDER BY startTime ASC;",
      userId
    );
  }
};
