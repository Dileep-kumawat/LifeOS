import { apiClient } from "./apiClient";
import type {
  FocusSession,
  CreateFocusSessionInput,
  ListFocusSessionsQuery
} from "@lifeos/shared";

export const focusApiService = {
  /**
   * Start a new Pomodoro focus session
   */
  async startSession(input: CreateFocusSessionInput): Promise<{ message: string; session: FocusSession }> {
    const res = await apiClient.post("/focus/sessions", input);
    return res.data;
  },

  /**
   * Get caller's currently active or paused focus session
   */
  async getActiveSession(): Promise<{ session: FocusSession | null }> {
    const res = await apiClient.get("/focus/sessions/active");
    return res.data;
  },

  /**
   * Pause an active focus session
   */
  async pauseSession(id: string): Promise<{ message: string; session: FocusSession }> {
    const res = await apiClient.patch(`/focus/sessions/${id}/pause`);
    return res.data;
  },

  /**
   * Resume a paused focus session
   */
  async resumeSession(id: string): Promise<{ message: string; session: FocusSession }> {
    const res = await apiClient.patch(`/focus/sessions/${id}/resume`);
    return res.data;
  },

  /**
   * Mark focus session completed
   */
  async completeSession(id: string): Promise<{ message: string; session: FocusSession }> {
    const res = await apiClient.patch(`/focus/sessions/${id}/complete`);
    return res.data;
  },

  /**
   * Abandon focus session early
   */
  async abandonSession(id: string): Promise<{ message: string; session: FocusSession }> {
    const res = await apiClient.patch(`/focus/sessions/${id}/abandon`);
    return res.data;
  },

  /**
   * Client-timed interval transition
   */
  async intervalComplete(
    id: string,
    data: { completedPhase: "work" | "break" | "long_break"; nextPhase?: "work" | "break" | "long_break"; cycle?: number }
  ): Promise<{ message: string; session: FocusSession }> {
    const res = await apiClient.post(`/focus/sessions/${id}/interval-complete`, data);
    return res.data;
  },

  /**
   * List focus session history
   */
  async listSessions(params?: ListFocusSessionsQuery): Promise<{
    sessions: FocusSession[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const res = await apiClient.get("/focus/sessions", { params });
    return res.data;
  }
};
