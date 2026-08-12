import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useAuthStore } from "../../../store/authStore";
import type { ChatMessage, ConversationSummary } from "../types";

export function useSocketChat() {
  const accessToken = useAuthStore((state) => state.accessToken);

  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [backupModelStatus, setBackupModelStatus] = useState<string | null>(null);
  const [pendingToolCallMessage, setPendingToolCallMessage] = useState<ChatMessage | null>(null);
  const [isExecutingTool, setIsExecutingTool] = useState(false);

  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConversationId;

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get("/api/v1/ai/conversations", { withCredentials: true });
      setConversations(res.data.conversations || []);
    } catch (_err) {
      /* non-blocking */
    }
  }, []);

  // 2. Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await axios.get(`/api/v1/ai/conversations/${convId}`, { withCredentials: true });
      setMessages(res.data.messages || []);
    } catch (_err) {
      setMessages([]);
    }
  }, []);

  // 3. Connect Socket.IO
  useEffect(() => {
    fetchConversations();

    const socketInstance = (io as any)(window.location.origin, {
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
      setMessages((prev) => [...prev, data]);
      setIsStreaming(true);
      setBackupModelStatus(null);
    });

    socketInstance.on("retrying_with_backup_model", (data: { message: string }) => {
      setBackupModelStatus(data.message);
    });

    socketInstance.on("chat_stream_chunk", (data: { conversationId: string; chunk: string }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, content: last.content + data.chunk }];
        } else {
          return [
            ...prev,
            {
              id: `stream_${Date.now()}`,
              role: "assistant",
              content: data.chunk,
              createdAt: new Date().toISOString(),
              isStreaming: true
            }
          ];
        }
      });
    });

    socketInstance.on("chat_stream_end", (data: { messageId: string }) => {
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

        setMessages((prev) => [...prev, toolMsg]);
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

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [accessToken, fetchConversations]);

  // Handler: Select conversation
  const selectConversation = (id: string | null) => {
    setActiveConversationId(id);
    if (id) {
      fetchMessages(id);
    } else {
      setMessages([]);
    }
  };

  // Handler: Delete conversation
  const deleteConversation = async (id: string) => {
    try {
      await axios.delete(`/api/v1/ai/conversations/${id}`, { withCredentials: true });
      if (activeConversationId === id) {
        selectConversation(null);
      }
      fetchConversations();
    } catch (_err) {
      /* handle gracefully */
    }
  };

  // Handler: Send prompt
  const sendMessage = (content: string) => {
    if (!socket || !content.trim()) return;
    socket.emit("send_message", {
      conversationId: activeConversationId || undefined,
      content: content.trim()
    });
  };

  // Handler: Confirm tool call
  const confirmToolCall = (message: ChatMessage) => {
    if (!socket || !message.toolCallData) return;
    setIsExecutingTool(true);
    socket.emit("confirm_tool_call", {
      conversationId: activeConversationId,
      messageId: message.id,
      toolCallId: message.toolCallData.id
    });
  };

  // Handler: Cancel tool call
  const cancelToolCall = (message: ChatMessage) => {
    if (!socket || !message.toolCallData) return;
    setPendingToolCallMessage(null);
    socket.emit("cancel_tool_call", {
      conversationId: activeConversationId,
      messageId: message.id,
      toolCallId: message.toolCallData.id
    });
  };

  return {
    isConnected,
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    backupModelStatus,
    pendingToolCallMessage,
    isExecutingTool,
    setPendingToolCallMessage,
    selectConversation,
    deleteConversation,
    sendMessage,
    confirmToolCall,
    cancelToolCall
  };
}
