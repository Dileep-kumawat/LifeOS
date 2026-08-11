import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageSquare } from "lucide-react";
import { useSocketChat } from "./hooks/useSocketChat";
import { ConversationHistorySidebar } from "./components/ConversationHistorySidebar";
import { ChatMessage } from "./components/ChatMessage";
import { StreamingIndicator } from "./components/StreamingIndicator";
import { ToolConfirmationModal } from "./components/ToolConfirmationModal";

export const ChatPage: React.FC = () => {
  const {
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
  } = useSocketChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-white border border-[#e6e6e6] rounded-xl overflow-hidden shadow-sm">
      {/* 1. History Sidebar */}
      <ConversationHistorySidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
      />

      {/* 2. Chat Main Container */}
      <div className="flex-1 flex flex-col h-full bg-[#ffffff]">
        {/* Chat Header */}
        <header className="px-6 py-4 border-b border-[#e6e6e6] bg-[#f6f5f4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#0075de]" />
            <h2 className="text-base font-bold text-[#000000]">LifeOS AI Assistant</h2>
          </div>
          <span className="text-xs text-[#615d59] font-medium">RAG Context + Tool Calling Active</span>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-white">
          {messages.length === 0 && (
            <div className="my-auto flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <div className="w-12 h-12 bg-[#0075de]/10 text-[#0075de] rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#000000]">Ask LifeOS Anything</h3>
              <p className="text-xs text-[#615d59] mt-1">
                Try asking: "How productive was I this month?", "Create tomorrow's study plan", or "Summarize my meeting".
              </p>
            </div>
          )}

          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              onOpenConfirmation={(msg) => setPendingToolCallMessage(msg)}
            />
          ))}

          <StreamingIndicator isStreaming={isStreaming} backupModelStatus={backupModelStatus} />
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-[#e6e6e6] bg-[#f6f5f4]">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI or request an action (e.g., 'Schedule dentist appointment for tomorrow at 2pm')..."
              className="flex-1 bg-white text-[#000000] text-sm px-4 py-3 rounded-lg border border-[#e6e6e6] focus:outline-none focus:ring-2 focus:ring-[#0075de] placeholder-[#a39e98]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0075de] rounded-lg hover:bg-[#005bab] transition-colors disabled:opacity-50 shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* 3. Tool Confirmation Modal (FR-2.4) */}
      <ToolConfirmationModal
        isOpen={Boolean(pendingToolCallMessage)}
        toolCall={pendingToolCallMessage?.toolCallData || null}
        isExecuting={isExecutingTool}
        onConfirm={() => {
          if (pendingToolCallMessage) confirmToolCall(pendingToolCallMessage);
        }}
        onCancel={() => {
          if (pendingToolCallMessage) cancelToolCall(pendingToolCallMessage);
        }}
      />
    </div>
  );
};
