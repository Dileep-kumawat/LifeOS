import React from "react";
import { X, Check } from "lucide-react";

export interface VoiceWaveformProps {
  audioLevels: number[];
  onCancel: () => void;
  onConfirm: () => void;
  className?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  audioLevels,
  onCancel,
  onConfirm,
  className = ""
}) => {
  return (
    <div
      className={`flex items-center justify-between w-full h-10 px-2 select-none animate-in fade-in duration-200 ${className}`}
      role="region"
      aria-label="Voice recording in progress"
    >
      {/* Waveform Visualization Area */}
      <div className="flex-1 flex items-center justify-center gap-[3px] sm:gap-1 px-3 h-full overflow-hidden">
        {audioLevels.map((level, idx) => {
          // Compute dynamic bar height in px (min 4px, max 24px)
          const barHeight = Math.max(4, Math.round(level * 24));
          // Center-weighted visual gradient opacity
          const isCenter = idx >= 6 && idx <= audioLevels.length - 7;
          const opacityClass = isCenter ? "bg-[#0d0d0d]" : "bg-[#71717a]";

          return (
            <span
              key={idx}
              className={`w-[2.5px] sm:w-[3px] rounded-full transition-all duration-75 ease-out ${opacityClass}`}
              style={{
                height: `${barHeight}px`
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>

      {/* Right Action Buttons: Cancel (X) and Finish (Check) */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        {/* Cancel Button (X) */}
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-[#71717a] hover:text-[#0d0d0d] hover:bg-[#f4f4f4] active:scale-90 rounded-full transition-all duration-150 cursor-pointer"
          title="Discard recording"
          aria-label="Discard recording"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* Finish / Confirm Button (Checkmark) */}
        <button
          type="button"
          onClick={onConfirm}
          className="w-7 h-7 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center hover:bg-[#27272a] hover:scale-105 active:scale-90 transition-all duration-150 shadow-xs cursor-pointer"
          title="Done talking"
          aria-label="Done talking and transcribe"
        >
          <Check className="w-4 h-4 stroke-[2.6]" />
        </button>
      </div>
    </div>
  );
};
