import React, { useState } from "react";
import { Sparkles, AlertCircle, Wrench, CheckCircle2, XCircle, Copy, Check } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";

export interface ChatMessageProps {
  message: ChatMessageType;
  onOpenConfirmation?: (message: ChatMessageType) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOpenConfirmation }) => {
  const { role, content, toolCallData } = message;
  const [copied, setCopied] = useState(false);

  const isUser = role === "user";
  const isUncertainty =
    content.toLowerCase().includes("don't have enough data in your account") ||
    content.toLowerCase().includes("insufficient data");

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-3 w-full max-w-3xl mx-auto px-4">
        <div className="bg-[#f4f4f4] text-[#0d0d0d] px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-4 py-4 px-4 max-w-3xl mx-auto w-full transition-colors my-1 text-[#0d0d0d]">
      {/* ChatGPT Assistant Icon */}
      <div className="w-7 h-7 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#0d0d0d]">LifeOS AI</span>
          <span className="text-[11px] text-[#8e8e8e]">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </span>
        </div>

        {/* Content */}
        {content && (
          <div
            className={`text-sm leading-relaxed ${
              isUncertainty
                ? "text-amber-900 bg-amber-50 p-3.5 rounded-xl border border-amber-200 flex items-start gap-2.5"
                : "text-[#0d0d0d]"
            }`}
          >
            {isUncertainty && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            <MarkdownRenderer content={content} />
          </div>
        )}

        {/* Action Bar (Copy Button) */}
        {!isUser && content && (
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-[#8e8e8e] hover:text-[#0d0d0d] p-1 rounded transition-colors"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tool Call Cards */}
        {toolCallData && (
          <div className="mt-3">
            {/* 1. Pending Confirmation */}
            {toolCallData.status === "pending_confirmation" && (
              <div className="bg-white border-2 border-[#0075de]/30 rounded-xl p-4 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0075de]/10 rounded-lg text-[#0075de]">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0d0d0d] uppercase tracking-wide">
                      Proposed Action
                    </h4>
                    <p className="text-xs text-[#5d5d5d] font-medium mt-0.5">
                      Tool:{" "}
                      <span className="font-mono bg-[#f4f4f4] px-1.5 py-0.5 rounded border border-[#e5e5e5]">
                        {toolCallData.toolName}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenConfirmation?.(message)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0075de] rounded-lg hover:bg-[#005bab] transition-colors shrink-0 shadow-xs"
                >
                  Review Action
                </button>
              </div>
            )}

            {/* 2. Executed / Confirmed */}
            {toolCallData.status === "executed" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Action Executed: </span>
                  <span className="font-mono">{toolCallData.toolName}</span>
                  {toolCallData.result?.message && (
                    <p className="text-emerald-700 mt-1 font-medium">
                      {toolCallData.result.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 3. Cancelled */}
            {toolCallData.status === "cancelled" && (
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center gap-3 text-xs text-slate-600">
                <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Action cancelled by user (
                  <span className="font-mono">{toolCallData.toolName}</span>)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
