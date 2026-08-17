import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { useSyncStore } from "../store/syncStore";
import { syncEngine } from "./syncEngine";
import {
  aiChatService,
  getSocketServerUrl,
  type ChatMessage,
  type ConversationSummary
} from "./aiChatService";

const STREAM_THROTTLE_MS = 50;

export function useSocketChat() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isOnline = useSyncStore((state) => state.isOnline);

  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [backupModelStatus, setBackupModelStatus] = useState<string | null>(null);
  const [pendingToolCallMessage, setPendingToolCallMessage] = useState<ChatMessage | null>(null);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Throttling stream chunk buffer refs
  const streamChunkBufferRef = useRef<string>("");
  const throttleTimeoutRef = useRef<any>(null);

  const flushStreamBuffer = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }

    const pendingChunk = streamChunkBufferRef.current;
    if (!pendingChunk) return;

    streamChunkBufferRef.current = "";
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant" && last.isStreaming) {
        return [...prev.slice(0, -1), { ...last, content: last.content + pendingChunk }];
      } else {
        return [
          ...prev,
          {
            id: `stream_${Date.now()}`,
            role: "assistant",
            content: pendingChunk,
            createdAt: new Date().toISOString(),
            isStreaming: true
          }
        ];
      }
    });
  }, []);

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async () => {
    if (!isOnline) return;
    try {
      const list = await aiChatService.listConversations();
      setConversations(list);
    } catch (_err) {
      /* non-blocking */
    }
  }, [isOnline]);

  // 2. Fetch messages for active conversation
  const fetchMessages = useCallback(
    async (convId: string) => {
      if (!isOnline) return;
      setIsLoadingHistory(true);
      try {
        const res = await aiChatService.getConversation(convId);
        setMessages(res.messages || []);
      } catch (_err) {
        setMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [isOnline]
  );

  // 3. Connect Socket.IO
  useEffect(() => {
    if (!accessToken || !isOnline) {
      setIsConnected(false);
      return;
    }

    fetchConversations();

    const socketUrl = getSocketServerUrl();
    const socketInstance = (io as any)(socketUrl, {
      auth: { token: accessToken },
      autoConnect: true
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("conversation_created", (data: { conversationId: string; title: string }) => {
      setActiveConversationId(data.conversationId);
      fetchConversations();
    });

    socketInstance.on("user_message_ack", (data: ChatMessage) => {
      setMessages((prev) => [...prev, { ...data, role: data.role || "user" }]);
      setIsStreaming(true);
      setBackupModelStatus(null);
      streamChunkBufferRef.current = "";
    });

    socketInstance.on("retrying_with_backup_model", (data: { message: string }) => {
      setBackupModelStatus(data.message);
    });

    socketInstance.on("chat_stream_chunk", (data: { conversationId: string; chunk: string }) => {
      streamChunkBufferRef.current += data.chunk;

      if (!throttleTimeoutRef.current) {
        throttleTimeoutRef.current = setTimeout(() => {
          flushStreamBuffer();
        }, STREAM_THROTTLE_MS);
      }
    });

    socketInstance.on("chat_stream_end", (data: { messageId: string }) => {
      flushStreamBuffer();
      setIsStreaming(false);
      setBackupModelStatus(null);
      setMessages((prev) =>
        prev.map((m) => (m.isStreaming ? { ...m, id: data.messageId, isStreaming: false } : m))
      );
      fetchConversations();
    });

    socketInstance.on(
      "tool_call_proposed",
      (data: {
        conversationId: string;
        messageId: string;
        toolCallId: string;
        toolName: string;
        args: any;
      }) => {
        flushStreamBuffer();
        setIsStreaming(false);
        setBackupModelStatus(null);

        const toolMsg: ChatMessage = {
          id: data.messageId,
          role: "assistant",
          content: `I'd like to perform an action for you: ${data.toolName}`,
          toolCallData: {
            id: data.toolCallId,
            toolName: data.toolName,
            args: data.args,
            status: "pending_confirmation"
          },
          createdAt: new Date().toISOString()
        };

        setMessages((prev) => [...prev.filter((m) => !m.isStreaming), toolMsg]);
        setPendingToolCallMessage(toolMsg);
      }
    );

    socketInstance.on("tool_call_executed", (data: { messageId: string; result: any }) => {
      setIsExecutingTool(false);
      setPendingToolCallMessage(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId && m.toolCallData
            ? {
                ...m,
                toolCallData: { ...m.toolCallData, status: "executed", result: data.result }
              }
            : m
        )
      );

      // Trigger immediate background sync pull into local SQLite
      syncEngine.syncNow().catch(() => {});
    });

    socketInstance.on("tool_call_cancelled", (data: { messageId: string }) => {
      setIsExecutingTool(false);
      setPendingToolCallMessage(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId && m.toolCallData
            ? {
                ...m,
                toolCallData: { ...m.toolCallData, status: "cancelled" }
              }
            : m
        )
      );
    });

    socketInstance.on("chat_error", (data: { message: string }) => {
      flushStreamBuffer();
      setIsStreaming(false);
      setBackupModelStatus(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `Error: ${data.message || "An issue occurred."}`,
          createdAt: new Date().toISOString()
        }
      ]);
    });

    socketInstance.on("tool_call_error", () => {
      setIsExecutingTool(false);
      setPendingToolCallMessage(null);
    });

    socketInstance.on("tool_call_failed", () => {
      setIsExecutingTool(false);
      setPendingToolCallMessage(null);
    });

    setSocket(socketInstance);

    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      socketInstance.disconnect();
    };
  }, [accessToken, isOnline, fetchConversations, flushStreamBuffer]);

  // Handler: Select conversation
  const selectConversation = (id: string | null) => {
    setActiveConversationId(id);
    if (id) {
      fetchMessages(id);
    } else {
      setMessages([]);
    }
  };

  // Handler: Start new chat
  const newChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setPendingToolCallMessage(null);
    setBackupModelStatus(null);
  };

  // Handler: Delete conversation
  const deleteConversation = async (id: string) => {
    try {
      await aiChatService.deleteConversation(id);
      if (activeConversationId === id) {
        newChat();
      }
      fetchConversations();
    } catch (_err) {
      /* handle gracefully */
    }
  };

  // Handler: Send message
  const sendMessage = (content: string) => {
    if (!socket || !content.trim() || !isOnline) return;
    socket.emit("send_message", {
      conversationId: activeConversationId || undefined,
      content: content.trim()
    });
  };

  // Handler: Confirm tool call
  const confirmToolCall = (message: ChatMessage) => {
    if (!socket || !message.toolCallData || !isOnline) return;
    setIsExecutingTool(true);
    socket.emit("confirm_tool_call", {
      conversationId: activeConversationId,
      messageId: message.id,
      toolCallId: message.toolCallData.id
    });
  };

  // Handler: Cancel tool call
  const cancelToolCall = (message: ChatMessage) => {
    if (!socket || !message.toolCallData || !isOnline) return;
    setPendingToolCallMessage(null);
    socket.emit("cancel_tool_call", {
      conversationId: activeConversationId,
      messageId: message.id,
      toolCallId: message.toolCallData.id
    });
  };

  return {
    isConnected,
    isOnline,
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    backupModelStatus,
    pendingToolCallMessage,
    isExecutingTool,
    isLoadingHistory,
    setPendingToolCallMessage,
    selectConversation,
    newChat,
    deleteConversation,
    sendMessage,
    confirmToolCall,
    cancelToolCall,
    refreshConversations: fetchConversations
  };
}
