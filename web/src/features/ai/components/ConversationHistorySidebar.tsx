import React from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import type { ConversationSummary } from "../types";

export interface ConversationHistorySidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onDeleteConversation?: (id: string) => void;
  isLoading?: boolean;
}

export const ConversationHistorySidebar: React.FC<ConversationHistorySidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  isLoading = false
}) => {
  return (
    <aside className="w-64 bg-[#f6f5f4] border-r border-[#e6e6e6] flex flex-col h-full shrink-0">
      {/* Sidebar Header / New Chat CTA */}
      <div className="p-4 border-b border-[#e6e6e6]">
        <button
          onClick={() => onSelectConversation(null)}
          className="w-full flex items-center justify-center gap-2 bg-[#0075de] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#005bab] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        <span className="text-[11px] font-bold text-[#615d59] uppercase tracking-wider px-2 py-1">Past Chats</span>

        {isLoading && (
          <div className="p-4 text-xs text-[#a39e98] text-center">Loading history...</div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="p-4 text-xs text-[#a39e98] text-center">No past conversations yet.</div>
        )}

        {conversations.map((c) => {
          const isActive = c.id === activeConversationId;
          return (
            <div
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isActive
                  ? "bg-white text-[#0075de] font-semibold border border-[#e6e6e6] shadow-sm"
                  : "text-[#31302e] hover:bg-white/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-[#0075de]" : "text-[#615d59]"}`} />
                <span className="truncate">{c.title}</span>
              </div>

              {onDeleteConversation && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#a39e98] hover:text-red-600 p-1 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
