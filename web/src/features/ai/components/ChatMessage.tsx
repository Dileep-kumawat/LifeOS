import React from "react";
import { User, Bot, AlertCircle, Wrench, CheckCircle2, XCircle } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "../types";

export interface ChatMessageProps {
  message: ChatMessageType;
  onOpenConfirmation?: (message: ChatMessageType) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOpenConfirmation }) => {
  const { role, content, toolCallData } = message;

  const isUser = role === "user";
  const isUncertainty =
    content.toLowerCase().includes("don't have enough data in your account") ||
    content.toLowerCase().includes("insufficient data");

  return (
    <div className={`flex gap-3 py-3 px-4 rounded-xl transition-colors ${isUser ? "bg-white border border-[#e6e6e6]" : "bg-[#f6f5f4]"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-[#0075de] text-white" : "bg-black text-white"}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#000000]">{isUser ? "You" : "LifeOS AI"}</span>
          <span className="text-[11px] text-[#a39e98]">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Text Content */}
        {content && (
          <div className={`text-sm leading-relaxed ${isUncertainty ? "text-amber-900 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2" : "text-[#31302e]"}`}>
            {isUncertainty && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            <div className="whitespace-pre-wrap break-words">{content}</div>
          </div>
        )}

        {/* Tool Call Cards */}
        {toolCallData && (
          <div className="mt-2">
            {/* 1. Pending Confirmation */}
            {toolCallData.status === "pending_confirmation" && (
              <div className="bg-white border-2 border-[#0075de]/30 rounded-lg p-3.5 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0075de]/10 rounded-md text-[#0075de]">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#000000] uppercase tracking-wide">Proposed Action</h4>
                    <p className="text-xs text-[#31302e] font-medium mt-0.5">
                      Tool: <span className="font-mono bg-[#f6f5f4] px-1.5 py-0.5 rounded border border-[#e6e6e6]">{toolCallData.toolName}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenConfirmation?.(message)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0075de] rounded-md hover:bg-[#005bab] transition-colors shrink-0 shadow-sm"
                >
                  Review Action
                </button>
              </div>
            )}

            {/* 2. Executed / Confirmed */}
            {toolCallData.status === "executed" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-3 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Action Executed: </span>
                  <span className="font-mono">{toolCallData.toolName}</span>
                  {toolCallData.result?.message && (
                    <p className="text-emerald-700 mt-1 font-medium">{toolCallData.result.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* 3. Cancelled */}
            {toolCallData.status === "cancelled" && (
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 flex items-center gap-3 text-xs text-slate-600">
                <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Action cancelled by user (<span className="font-mono">{toolCallData.toolName}</span>)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
