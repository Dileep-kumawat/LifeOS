import React from "react";
import { Sparkles, RefreshCw } from "lucide-react";

export interface StreamingIndicatorProps {
  isStreaming?: boolean;
  backupModelStatus?: string | null;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  isStreaming = false,
  backupModelStatus = null
}) => {
  if (!isStreaming && !backupModelStatus) return null;

  return (
    <div className="flex flex-col gap-2 py-2">
      {backupModelStatus && (
        <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md w-fit animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
          <span>{backupModelStatus}</span>
        </div>
      )}

      {isStreaming && (
        <div className="inline-flex items-center gap-2 text-xs font-medium text-[#615d59] bg-[#f6f5f4] border border-[#e6e6e6] px-3 py-1.5 rounded-full w-fit">
          <Sparkles className="w-3.5 h-3.5 text-[#0075de] animate-pulse" />
          <span>Thinking & generating response...</span>
          <div className="flex items-center gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-[#0075de] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-[#0075de] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-[#0075de] rounded-full animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
};
