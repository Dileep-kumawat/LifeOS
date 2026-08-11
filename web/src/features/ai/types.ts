export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "user" | "assistant" | "tool" | "system";

export type ToolCallStatus = "pending_confirmation" | "confirmed" | "cancelled" | "executed" | "failed";

export interface ToolCallPayload {
  id: string;
  toolName: string;
  args: Record<string, any>;
  status: ToolCallStatus;
  result?: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolCallData?: ToolCallPayload | null;
  createdAt: string;
  isStreaming?: boolean;
}
