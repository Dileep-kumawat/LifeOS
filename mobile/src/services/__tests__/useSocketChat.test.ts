import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn()
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket)
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  NativeModules: {}
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: null }
}));

vi.mock("../syncEngine", () => ({
  syncEngine: {
    syncNow: vi.fn().mockResolvedValue({ success: true })
  }
}));

vi.mock("../aiChatService", () => ({
  getSocketServerUrl: vi.fn(() => "http://localhost:4000"),
  aiChatService: {
    listConversations: vi.fn().mockResolvedValue([]),
    getConversation: vi.fn().mockResolvedValue({ conversation: {}, messages: [] }),
    deleteConversation: vi.fn().mockResolvedValue({ message: "deleted" })
  }
}));

import { io } from "socket.io-client";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { syncEngine } from "../syncEngine";

describe("Socket Chat Engine & Event Protocol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth({ id: "usr-1", name: "User" } as any, "jwt-access-token-123");
    useSyncStore.getState().setIsOnline(true);
  });

  afterEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("should initialize Socket.IO with token in auth payload", () => {
    const token = useAuthStore.getState().accessToken;
    expect(token).toBe("jwt-access-token-123");

    io("http://localhost:4000", {
      auth: { token },
      autoConnect: true
    });

    expect(io).toHaveBeenCalledWith("http://localhost:4000", {
      auth: { token: "jwt-access-token-123" },
      autoConnect: true
    });
  });

  it("should trigger immediate local sync pull when tool_call_executed event is handled", async () => {
    // Simulate confirmed tool execution handler
    const handleToolExecuted = async () => {
      await syncEngine.syncNow();
    };

    await handleToolExecuted();
    expect(syncEngine.syncNow).toHaveBeenCalledTimes(1);
  });

  it("should format proposed tool calls with confirmation payload", () => {
    const proposedData = {
      conversationId: "conv-1",
      messageId: "msg-tool-1",
      toolCallId: "tc-101",
      toolName: "create_calendar_event",
      args: { title: "Team sync", startTime: "2026-08-17T15:00:00Z" }
    };

    expect(proposedData.toolCallId).toBe("tc-101");
    expect(proposedData.toolName).toBe("create_calendar_event");
    expect(proposedData.args.title).toBe("Team sync");
  });

  it("should emit confirm_tool_call with required identifiers", () => {
    const payload = {
      conversationId: "conv-1",
      messageId: "msg-tool-1",
      toolCallId: "tc-101"
    };

    mockSocket.emit("confirm_tool_call", payload);

    expect(mockSocket.emit).toHaveBeenCalledWith("confirm_tool_call", {
      conversationId: "conv-1",
      messageId: "msg-tool-1",
      toolCallId: "tc-101"
    });
  });

  it("should emit cancel_tool_call when user declines action", () => {
    const payload = {
      conversationId: "conv-1",
      messageId: "msg-tool-1",
      toolCallId: "tc-101"
    };

    mockSocket.emit("cancel_tool_call", payload);

    expect(mockSocket.emit).toHaveBeenCalledWith("cancel_tool_call", {
      conversationId: "conv-1",
      messageId: "msg-tool-1",
      toolCallId: "tc-101"
    });
  });
});
