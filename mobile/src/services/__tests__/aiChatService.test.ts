import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockAxiosInstance } = vi.hoisted(() => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    },
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  };
  return { mockAxiosInstance: instance };
});

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  NativeModules: {}
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: null }
}));

vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: 1,
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}));

import { aiChatService, getSocketServerUrl } from "../aiChatService";

describe("aiChatService (REST APIs & URL Resolution)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Socket Server URL Resolution", () => {
    it("should resolve server origin without /api/v1 path", () => {
      const socketUrl = getSocketServerUrl();
      expect(socketUrl).toBeDefined();
      expect(socketUrl.endsWith("/api/v1")).toBe(false);
    });
  });

  describe("2. Conversation REST Endpoints", () => {
    it("should list conversations via GET /ai/conversations", async () => {
      const mockConversations = [
        {
          id: "conv-1",
          title: "Schedule review",
          createdAt: "2026-08-17T10:00:00Z",
          updatedAt: "2026-08-17T10:05:00Z"
        }
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { conversations: mockConversations }
      });

      const res = await aiChatService.listConversations();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/ai/conversations");
      expect(res).toEqual(mockConversations);
    });

    it("should get single conversation detail via GET /ai/conversations/:id", async () => {
      const mockData = {
        conversation: { id: "conv-1", title: "Test", createdAt: "", updatedAt: "" },
        messages: [{ id: "msg-1", role: "user", content: "Hello", createdAt: "" }]
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

      const res = await aiChatService.getConversation("conv-1");
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/ai/conversations/conv-1");
      expect(res).toEqual(mockData);
    });

    it("should delete conversation via DELETE /ai/conversations/:id", async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: { message: "Conversation deleted successfully" }
      });

      const res = await aiChatService.deleteConversation("conv-1");
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith("/ai/conversations/conv-1");
      expect(res.message).toBe("Conversation deleted successfully");
    });
  });

  describe("3. Daily Summary Endpoints", () => {
    it("should fetch today summary via GET /ai/summary/today", async () => {
      const mockSummary = {
        generated: true,
        summary: {
          id: "sum-1",
          userId: "usr-1",
          date: "2026-08-17",
          yesterdayCompleted: [{ title: "Morning Run", type: "habit" }],
          todaySchedule: [{ title: "Team Sync", startTime: "2026-08-17T14:00:00Z" }],
          topPriorities: [{ title: "Deploy release", category: "goal", rationale: "Milestone" }],
          generatedAt: "2026-08-17T07:00:00Z"
        }
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSummary });

      const res = await aiChatService.getTodaySummary();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/ai/summary/today");
      expect(res.generated).toBe(true);
      expect(res.summary?.topPriorities.length).toBe(1);
    });

    it("should fetch historical summary via GET /ai/summary/:date", async () => {
      const mockSummary = {
        generated: true,
        summary: {
          id: "sum-hist",
          userId: "usr-1",
          date: "2026-08-16",
          yesterdayCompleted: [],
          todaySchedule: [],
          topPriorities: [],
          generatedAt: "2026-08-16T07:00:00Z"
        }
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSummary });

      const res = await aiChatService.getSummaryByDate("2026-08-16");
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/ai/summary/2026-08-16");
      expect(res.summary?.date).toBe("2026-08-16");
    });
  });

  describe("4. Notification & Summary Preferences", () => {
    it("should get notification preferences", async () => {
      const mockPrefs = {
        dailySummary: { deliveryTime: "07:00", channels: ["push", "in_app"] }
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { preferences: mockPrefs } });

      const res = await aiChatService.getNotificationPreferences();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/notifications/preferences");
      expect(res.preferences.dailySummary?.deliveryTime).toBe("07:00");
    });

    it("should update notification preferences with FCM push channel", async () => {
      const updates = {
        dailySummary: {
          deliveryTime: "08:00",
          channels: ["push", "in_app"] as ("push" | "in_app")[],
          timezone: "America/New_York"
        }
      };
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: { preferences: updates } });

      const res = await aiChatService.updateNotificationPreferences(updates);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith("/notifications/preferences", updates);
      expect(res.preferences.dailySummary?.deliveryTime).toBe("08:00");
    });
  });

  describe("5. Finance Insights Endpoint", () => {
    it("should call POST /finance/insights with optional focus area", async () => {
      const mockInsights = {
        insights: "1. Groceries spent: $340 vs $400 budget.\n2. Dining out is on track.",
        providerServed: "groq-llama3",
        fallbackOccurred: false
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockInsights });

      const res = await aiChatService.getFinanceInsights("dining out");
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/finance/insights", {
        focusArea: "dining out"
      });
      expect(res.insights).toContain("Groceries spent");
      expect(res.providerServed).toBe("groq-llama3");
    });
  });
});
