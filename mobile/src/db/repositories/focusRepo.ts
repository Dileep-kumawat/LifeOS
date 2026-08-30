import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalFocusSession } from "../schema";

export interface StartFocusSessionInput {
  userId: string;
  workMinutes?: number;
  breakMinutes?: number;
  longBreakMinutes?: number;
  longBreakInterval?: number;
  linkedType?: "task" | "goal" | "topic" | "none";
  linkedId?: string | null;
}

export const focusRepo = {
  /**
   * Start a new Pomodoro focus session (marks any previous running session as abandoned)
   */
  async startSession(input: StartFocusSessionInput): Promise<LocalFocusSession> {
    const active = await this.getActiveSession(input.userId);
    if (active) {
      await this.abandonSession(active.id);
    }

    const now = new Date().toISOString();
    return localRepo.insert("focus_sessions", {
      userId: input.userId,
      workMinutes: input.workMinutes ?? 25,
      breakMinutes: input.breakMinutes ?? 5,
      longBreakMinutes: input.longBreakMinutes ?? 15,
      longBreakInterval: input.longBreakInterval ?? 4,
      currentCycle: 1,
      currentPhase: "work" as const,
      linkedType: input.linkedType || "none",
      linkedId: input.linkedId || null,
      status: "active" as const,
      startedAt: now,
      completedAt: null,
      pausedAt: null,
      lastResumedAt: now,
      accumulatedWorkSeconds: 0,
      totalFocusMinutes: 0
    }) as Promise<LocalFocusSession>;
  },

  /**
   * Retrieve caller's currently running or paused session
   */
  async getActiveSession(userId: string): Promise<LocalFocusSession | null> {
    const db = await getDatabase();
    const sessions = await db.getAllAsync<LocalFocusSession>(
      "SELECT * FROM focus_sessions WHERE userId = ? ORDER BY startedAt DESC;",
      userId
    );
    return sessions.find((s) => s.status === "active" || s.status === "paused") || null;
  },

  /**
   * Pause an active focus session and commit elapsed active work seconds
   */
  async pauseSession(id: string): Promise<LocalFocusSession | null> {
    const db = await getDatabase();
    const session = await db.getFirstAsync<LocalFocusSession>(
      "SELECT * FROM focus_sessions WHERE id = ?;",
      id
    );
    if (!session || session.status !== "active") return session;

    let accumulated = session.accumulatedWorkSeconds || 0;
    if (session.currentPhase === "work" && session.lastResumedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.lastResumedAt).getTime()) / 1000
      );
      if (elapsed > 0) {
        accumulated += elapsed;
      }
    }

    const now = new Date().toISOString();
    const totalMins = Math.floor(accumulated / 60);

    await localRepo.update("focus_sessions", id, {
      status: "paused",
      pausedAt: now,
      lastResumedAt: null,
      accumulatedWorkSeconds: accumulated,
      totalFocusMinutes: totalMins
    });

    return db.getFirstAsync<LocalFocusSession>("SELECT * FROM focus_sessions WHERE id = ?;", id);
  },

  /**
   * Resume a paused focus session
   */
  async resumeSession(id: string): Promise<LocalFocusSession | null> {
    const db = await getDatabase();
    const session = await db.getFirstAsync<LocalFocusSession>(
      "SELECT * FROM focus_sessions WHERE id = ?;",
      id
    );
    if (!session || session.status !== "paused") return session;

    const now = new Date().toISOString();
    await localRepo.update("focus_sessions", id, {
      status: "active",
      pausedAt: null,
      lastResumedAt: now
    });

    return db.getFirstAsync<LocalFocusSession>("SELECT * FROM focus_sessions WHERE id = ?;", id);
  },

  /**
   * Mark focus session completed
   */
  async completeSession(id: string): Promise<LocalFocusSession | null> {
    const db = await getDatabase();
    const session = await db.getFirstAsync<LocalFocusSession>(
      "SELECT * FROM focus_sessions WHERE id = ?;",
      id
    );
    if (!session) return null;

    let accumulated = session.accumulatedWorkSeconds || 0;
    if (session.status === "active" && session.currentPhase === "work" && session.lastResumedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.lastResumedAt).getTime()) / 1000
      );
      if (elapsed > 0) {
        accumulated += elapsed;
      }
    }

    const now = new Date().toISOString();
    const totalMins = Math.floor(accumulated / 60);

    await localRepo.update("focus_sessions", id, {
      status: "completed",
      completedAt: now,
      lastResumedAt: null,
      accumulatedWorkSeconds: accumulated,
      totalFocusMinutes: totalMins
    });

    return db.getFirstAsync<LocalFocusSession>("SELECT * FROM focus_sessions WHERE id = ?;", id);
  },

  /**
   * Abandon focus session early (preserves partial work time)
   */
  async abandonSession(id: string): Promise<LocalFocusSession | null> {
    const db = await getDatabase();
    const session = await db.getFirstAsync<LocalFocusSession>(
      "SELECT * FROM focus_sessions WHERE id = ?;",
      id
    );
    if (!session) return null;

    let accumulated = session.accumulatedWorkSeconds || 0;
    if (session.status === "active" && session.currentPhase === "work" && session.lastResumedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.lastResumedAt).getTime()) / 1000
      );
      if (elapsed > 0) {
        accumulated += elapsed;
      }
    }

    const now = new Date().toISOString();
    const totalMins = Math.floor(accumulated / 60);

    await localRepo.update("focus_sessions", id, {
      status: "abandoned",
      completedAt: now,
      lastResumedAt: null,
      accumulatedWorkSeconds: accumulated,
      totalFocusMinutes: totalMins
    });

    return db.getFirstAsync<LocalFocusSession>("SELECT * FROM focus_sessions WHERE id = ?;", id);
  },

  /**
   * Client-timed interval transition between work and break phases
   */
  async intervalComplete(
    id: string,
    completedPhase: "work" | "break" | "long_break",
    nextPhaseOverride?: "work" | "break" | "long_break",
    cycleOverride?: number
  ): Promise<LocalFocusSession | null> {
    const db = await getDatabase();
    const session = await db.getFirstAsync<LocalFocusSession>(
      "SELECT * FROM focus_sessions WHERE id = ?;",
      id
    );
    if (!session) return null;

    let accumulated = session.accumulatedWorkSeconds || 0;
    if (completedPhase === "work" && session.lastResumedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.lastResumedAt).getTime()) / 1000
      );
      if (elapsed > 0) {
        accumulated += elapsed;
      }
    }

    let nextPhase = nextPhaseOverride;
    let nextCycle = cycleOverride ?? session.currentCycle;

    if (!nextPhase) {
      if (completedPhase === "work") {
        const isLongBreak =
          session.longBreakInterval > 0 &&
          session.currentCycle % session.longBreakInterval === 0;
        nextPhase = isLongBreak ? "long_break" : "break";
      } else {
        nextPhase = "work";
        nextCycle = session.currentCycle + 1;
      }
    }

    const now = new Date().toISOString();
    const totalMins = Math.floor(accumulated / 60);

    await localRepo.update("focus_sessions", id, {
      currentPhase: nextPhase,
      currentCycle: nextCycle,
      lastResumedAt: now,
      accumulatedWorkSeconds: accumulated,
      totalFocusMinutes: totalMins
    });

    return db.getFirstAsync<LocalFocusSession>("SELECT * FROM focus_sessions WHERE id = ?;", id);
  },

  /**
   * List past focus sessions for history view
   */
  async listSessions(userId: string): Promise<LocalFocusSession[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalFocusSession>(
      "SELECT * FROM focus_sessions WHERE userId = ? ORDER BY startedAt DESC;",
      userId
    );
  }
};
