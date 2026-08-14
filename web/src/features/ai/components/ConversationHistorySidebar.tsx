import React from "react";
import { Link } from "react-router-dom";
import {
  SquarePen,
  Trash2,
  Settings,
  Sparkles,
  PanelLeftClose
} from "lucide-react";
import type { ConversationSummary } from "../types";

export interface ConversationHistorySidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onDeleteConversation?: (id: string) => void;
  isLoading?: boolean;
  isOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const ConversationHistorySidebar: React.FC<ConversationHistorySidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  isLoading = false,
  isOpen = true,
  onToggleSidebar
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        onClick={onToggleSidebar}
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 left-0 z-50 lg:static w-64 bg-[#f9f9f9] border-r border-[#e5e5e5] flex flex-col h-full shrink-0 select-none text-[#0d0d0d] shadow-xl lg:shadow-none animate-in slide-in-from-left duration-200">
      {/* 1. Header: Logo / New Chat CTA */}
      <div className="p-3 flex items-center justify-between border-b border-[#e5e5e5]">
        <button
          type="button"
          onClick={() => onSelectConversation(null)}
          className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#ebebeb] transition-colors text-sm font-medium"
        >
          <SquarePen className="w-4 h-4 text-[#0d0d0d]" />
          <span>New chat</span>
        </button>

        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 text-[#676767] hover:text-[#0d0d0d] hover:bg-[#ebebeb] rounded-lg transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold text-[#8e8e8e] px-3 py-1 tracking-wide">
          Past Chats
        </span>

        {isLoading && (
          <div className="p-4 text-xs text-[#8e8e8e] text-center">Loading history...</div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="p-4 text-xs text-[#8e8e8e] text-center">No past conversations yet.</div>
        )}

        {conversations.map((c) => {
          const isActive = c.id === activeConversationId;
          return (
            <div
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-normal cursor-pointer transition-colors ${
                isActive
                  ? "bg-[#ebebeb] text-[#0d0d0d] font-medium"
                  : "text-[#2b2b2b] hover:bg-[#ebebeb]/80"
              }`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <span className="truncate">{c.title}</span>
              </div>

              {onDeleteConversation && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#8e8e8e] hover:text-red-600 p-1 transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Footer Section */}
      <div className="p-3 border-t border-[#e5e5e5] flex items-center justify-between">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-[#5d5d5d]">
          <Sparkles className="w-4 h-4 text-[#0075de]" />
          <span className="font-medium text-[#0d0d0d]">LifeOS AI</span>
        </div>
        <Link
          to="/settings"
          className="p-2 text-[#676767] hover:text-[#0d0d0d] hover:bg-[#ebebeb] rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </aside>
    </>
  );
};
