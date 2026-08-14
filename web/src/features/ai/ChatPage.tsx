import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Plus,
  ArrowUp,
  PanelLeft,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  ArrowLeft,
  SquarePen
} from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  const handlePromptCardClick = (promptText: string) => {
    if (isStreaming) return;
    sendMessage(promptText);
  };

  const suggestionCards = [
    {
      icon: <Clock className="w-4 h-4 text-[#0075de]" />,
      title: "How productive was I this month?",
      prompt: "How productive was I this month? Summarize my activity statistics."
    },
    {
      icon: <Calendar className="w-4 h-4 text-emerald-600" />,
      title: "Create tomorrow's study plan",
      prompt: "Create tomorrow's study plan and schedule calendar events for study blocks."
    },
    {
      icon: <FileText className="w-4 h-4 text-amber-600" />,
      title: "Summarize recent notes & meetings",
      prompt: "Summarize my recent notes and key takeaways."
    },
    {
      icon: <DollarSign className="w-4 h-4 text-purple-600" />,
      title: "Show monthly budget & spending overview",
      prompt: "Show my monthly finance summary, income vs expenses, and budget status."
    }
  ];

  return (
    <div className="flex h-full w-full bg-white select-none overflow-hidden">
      {/* 1. ChatGPT Collapsible Sidebar */}
      <ConversationHistorySidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(false)}
      />

      {/* 2. Main Chat View */}
      <div className="flex-1 flex flex-col h-full min-h-0 bg-white relative overflow-hidden">
        {/* Top Header */}
        <header className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[#e5e5e5] flex items-center justify-between bg-white z-10 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/"
              className="lg:hidden p-1.5 text-[#676767] hover:text-[#0d0d0d] hover:bg-[#f4f4f4] rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 sm:p-2 text-[#676767] hover:text-[#0d0d0d] hover:bg-[#f4f4f4] rounded-lg transition-colors cursor-pointer"
                title="Open past chats"
              >
                <PanelLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm sm:text-base font-bold text-[#0d0d0d]">
              <span>LifeOS AI</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => selectConversation(null)}
              className="p-1.5 sm:p-2 text-[#676767] hover:text-[#0d0d0d] hover:bg-[#f4f4f4] rounded-lg transition-colors"
              title="New Chat"
            >
              <SquarePen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <span className="hidden sm:inline-flex text-[11px] font-medium text-[#676767] bg-[#f4f4f4] px-2.5 py-1 rounded-full border border-[#e5e5e5]">
              RAG Context + Tool Calling Active
            </span>
          </div>
        </header>

        {/* Empty State: ChatGPT Style "Where should we begin?" */}
        {messages.length === 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full text-center">
            <div className="w-12 h-12 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center mb-6 shadow-sm shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>

            <h1 className="text-3xl font-semibold text-[#0d0d0d] tracking-tight mb-8">
              Where should we begin?
            </h1>

            {/* Centered Large ChatGPT Search/Prompt Bar */}
            <form onSubmit={handleSubmit} className="w-full mb-8">
              <div className="w-full bg-white border border-[#e5e5e5] rounded-3xl shadow-sm focus-within:shadow-md focus-within:border-[#0075de] focus-within:ring-2 focus-within:ring-[#0075de]/15 p-3 flex flex-col gap-3 transition-all duration-200">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full text-base text-[#0d0d0d] bg-transparent outline-none px-2 py-1 placeholder-[#8e8e8e] font-normal"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-2 text-[#676767] hover:text-[#0d0d0d] hover:bg-[#f4f4f4] active:scale-90 rounded-full transition-all duration-150 cursor-pointer"
                      title="Add attachment"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    className="w-8 h-8 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center hover:bg-[#2f2f2f] hover:scale-105 active:scale-90 disabled:opacity-30 disabled:hover:scale-100 transition-all duration-150 shadow-xs cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Suggestion Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
              {suggestionCards.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePromptCardClick(card.prompt)}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-[#e5e5e5] hover:border-[#b4b4b4] hover:bg-[#f9f9f9] hover:-translate-y-0.5 hover:shadow-xs active:scale-[0.98] transition-all duration-150 text-xs text-[#2b2b2b] font-normal group cursor-pointer"
                >
                  <div className="p-2 bg-[#f4f4f4] rounded-xl shrink-0 group-hover:bg-white group-hover:scale-110 transition-all duration-150 shadow-2xs">
                    {card.icon}
                  </div>
                  <span className="mt-1 leading-snug font-medium group-hover:text-[#005db2] transition-colors duration-150">{card.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Stream View */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-2">
              <div className="max-w-3xl mx-auto w-full flex flex-col gap-2">
                {messages.map((m) => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    onOpenConfirmation={(msg) => setPendingToolCallMessage(msg)}
                  />
                ))}
                <StreamingIndicator
                  isStreaming={isStreaming}
                  backupModelStatus={backupModelStatus}
                />
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom Fixed Floating Input Bar (ChatGPT Style) */}
            <div className="p-4 bg-white border-t border-[#f0f0f0] shrink-0">
              <div className="max-w-3xl mx-auto w-full flex flex-col items-center gap-2">
                <form onSubmit={handleSubmit} className="w-full">
                  <div className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-[#0075de] focus-within:ring-2 focus-within:ring-[#0075de]/15 p-2.5 flex items-center gap-2 transition-all duration-200">
                    <button
                      type="button"
                      className="p-1.5 text-[#676767] hover:text-[#0d0d0d] hover:bg-[#f4f4f4] active:scale-90 rounded-full transition-all duration-150 cursor-pointer"
                      title="Add attachment"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Message LifeOS AI..."
                      className="flex-1 text-sm text-[#0d0d0d] bg-transparent outline-none px-2 placeholder-[#8e8e8e]"
                    />

                    <button
                      type="submit"
                      disabled={!input.trim() || isStreaming}
                      className="w-8 h-8 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center hover:bg-[#2f2f2f] hover:scale-105 active:scale-90 disabled:opacity-30 disabled:hover:scale-100 transition-all duration-150 shrink-0 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </form>

                <p className="text-[11px] text-[#8e8e8e] text-center">
                  LifeOS AI can make mistakes. Check important account info.
                </p>
              </div>
            </div>
          </div>
        )}
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
