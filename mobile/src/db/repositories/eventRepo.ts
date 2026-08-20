import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalEvent } from "../schema";

export interface CalendarExceptionItem {
  originalDate: string;
  isCancelled: boolean;
  overrideEventId: string | null;
}

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

  async getEventById(id: string): Promise<LocalEvent | null> {
    const db = await getDatabase();
    return db.getFirstAsync<LocalEvent>("SELECT * FROM events WHERE id = ?;", id);
  },

  async listEvents(userId: string): Promise<LocalEvent[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalEvent>(
      "SELECT * FROM events WHERE userId = ? ORDER BY startTime ASC;",
      userId
    );
  },

  async listEventsForRange(
    userId: string,
    rangeStart: string,
    rangeEnd: string
  ): Promise<LocalEvent[]> {
    const db = await getDatabase();
    // Return both non-recurring events in range and recurring events that start on or before rangeEnd
    return db.getAllAsync<LocalEvent>(
      `SELECT * FROM events 
       WHERE userId = ? 
         AND (
           (recurrenceRule IS NULL AND startTime <= ? AND endTime >= ?)
           OR (recurrenceRule IS NOT NULL AND startTime <= ?)
         )
       ORDER BY startTime ASC;`,
      userId,
      rangeEnd,
      rangeStart,
      rangeEnd
    );
  },

  async addException(eventId: string, exception: CalendarExceptionItem): Promise<boolean> {
    const existing = await this.getEventById(eventId);
    if (!existing) return false;

    let exceptionsList: CalendarExceptionItem[] = [];
    try {
      exceptionsList = JSON.parse(existing.exceptions || "[]");
    } catch {
      exceptionsList = [];
    }

    exceptionsList.push(exception);

    return this.updateEvent(eventId, {
      exceptions: JSON.stringify(exceptionsList)
    });
  }
};
