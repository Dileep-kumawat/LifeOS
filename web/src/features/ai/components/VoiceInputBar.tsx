import React from "react";
import { Mic, ArrowUp, Plus, AlertCircle } from "lucide-react";
import { VoiceWaveform } from "./VoiceWaveform";

export interface VoiceInputBarProps {
  input?: string;
  onInputChange?: (value: string) => void;
  onSubmit?: (e?: React.FormEvent) => void;
  isStreaming?: boolean;
  isRecording?: boolean;
  audioLevels?: number[];
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onCancelRecording?: () => void;
  inlineNotice?: string | null;
  placeholder?: string;
  className?: string;
}

export const VoiceInputBar: React.FC<VoiceInputBarProps> = ({
  input = "",
  onInputChange,
  onSubmit,
  isStreaming = false,
  isRecording = false,
  audioLevels = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  inlineNotice = null,
  placeholder = "Message LifeOS AI...",
  className = ""
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSubmit?.(e);
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {/* Brief Inline Feedback Notice (Permission Denied / Empty Speech / System Info) */}
      {inlineNotice && (
        <div
          role="status"
          aria-live="polite"
          className="self-center flex items-center gap-1.5 px-3 py-1 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-full font-medium shadow-2xs animate-in fade-in slide-in-from-bottom-1 duration-150"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{inlineNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-[#0075de] focus-within:ring-2 focus-within:ring-[#0075de]/15 p-2.5 flex items-center gap-2 transition-all duration-200">
          {isRecording ? (
            <VoiceWaveform
              audioLevels={audioLevels}
              onCancel={() => onCancelRecording?.()}
              onConfirm={() => onStopRecording?.()}
            />
          ) : (
            <>
              {/* Attachment / Plus Action Button */}
              <button
                type="button"
                className="p-1.5 text-[#676767] hover:text-[#0d0d0d] hover:bg-[#f4f4f4] active:scale-90 rounded-full transition-all duration-150 cursor-pointer shrink-0"
                title="Add attachment"
                aria-label="Add attachment"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => onInputChange?.(e.target.value)}
                placeholder={placeholder}
                disabled={isStreaming}
                className="flex-1 text-sm text-[#0d0d0d] bg-transparent outline-none px-2 placeholder-[#8e8e8e]"
                aria-label="Chat input text"
              />

              {/* Dynamic Action: Send Button (when input present) vs Mic Button (when idle) */}
              {input.trim().length > 0 ? (
                <button
                  type="submit"
                  disabled={isStreaming}
                  className="w-8 h-8 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center hover:bg-[#2f2f2f] hover:scale-105 active:scale-90 disabled:opacity-30 disabled:hover:scale-100 transition-all duration-150 shrink-0 shadow-xs cursor-pointer"
                  title="Send message"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartRecording?.()}
                  disabled={isStreaming}
                  className="w-8 h-8 rounded-full bg-[#f4f4f4] text-[#0d0d0d] hover:bg-[#ebebeb] hover:scale-105 active:scale-90 flex items-center justify-center transition-all duration-150 shrink-0 shadow-2xs cursor-pointer"
                  title="Voice input"
                  aria-label="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </form>
    </div>
  );
};
