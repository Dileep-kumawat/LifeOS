import React, { useState } from "react";
import { Eye, RotateCw, Sparkles, BookOpen, Layers } from "lucide-react";

export interface FlashcardReviewCardProps {
  id: string;
  front: string;
  back: string;
  topicTitle?: string | null;
  subjectName?: string | null;
  subjectColor?: string | null;
  repetitions?: number;
  intervalDays?: number;
  easeFactor?: number;
  isRevealed?: boolean;
  onReview?: (quality: number) => void;
}

export const FlashcardReviewCard: React.FC<FlashcardReviewCardProps> = ({
  front,
  back,
  topicTitle,
  subjectName,
  subjectColor = "#0075de",
  repetitions = 0,
  intervalDays = 0,
  isRevealed: controlledIsRevealed,
  onReview
}) => {
  const [internalRevealed, setInternalRevealed] = useState(false);
  const isRevealed = controlledIsRevealed !== undefined ? controlledIsRevealed : internalRevealed;

  const handleReveal = () => {
    setInternalRevealed(true);
  };

  const handleRate = (quality: number) => {
    onReview?.(quality);
    setInternalRevealed(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col rounded-2xl border border-[#e6e6e6] bg-white shadow-sm overflow-hidden transition-all duration-200">
      {/* Top Card Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-[#faf9f8] border-b border-[#e6e6e6]">
        <div className="flex items-center gap-2 min-w-0">
          {subjectName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#1a1c1c] border border-[#e6e6e6] shadow-2xs">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: subjectColor || "#0075de" }}
              />
              <span className="truncate">{subjectName}</span>
            </span>
          )}
          {topicTitle && (
            <span className="inline-flex items-center gap-1 text-xs text-[#615d59] truncate">
              <Layers className="size-3 shrink-0" />
              <span className="truncate">{topicTitle}</span>
            </span>
          )}
        </div>

        {/* Repetitions & Interval stats pill */}
        <div className="flex items-center gap-2 text-[11px] text-[#a39e98] shrink-0 font-medium">
          <span>Reps: {repetitions}</span>
          <span>•</span>
          <span>Interval: {intervalDays}d</span>
        </div>
      </div>

      {/* Front Face (Prompt / Question) */}
      <div className="p-8 sm:p-10 flex flex-col justify-center min-h-[160px] bg-white">
        <span className="text-[11px] font-bold text-[#0075de] uppercase tracking-wider mb-2 flex items-center gap-1">
          <BookOpen className="size-3.5" />
          Question
        </span>
        <div className="text-lg sm:text-xl font-medium text-[#000000] leading-relaxed whitespace-pre-wrap">
          {front}
        </div>
      </div>

      {/* Back Face (Answer / Explanation) — Revealed or Hidden */}
      {isRevealed ? (
        <div className="p-8 sm:p-10 bg-[#f6f5f4] border-t border-[#e6e6e6] flex flex-col justify-center min-h-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-[11px] font-bold text-[#1aae39] uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles className="size-3.5" />
            Answer
          </span>
          <div className="text-base sm:text-lg text-[#1a1c1c] leading-relaxed whitespace-pre-wrap font-normal">
            {back}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-[#faf9f8] border-t border-[#e6e6e6] flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleReveal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#0075de] hover:bg-[#005bab] text-white font-semibold text-sm transition-all shadow-xs hover:shadow-md active:scale-98"
          >
            <Eye className="size-4" />
            <span>Show Answer</span>
          </button>
          <span className="mt-2 text-xs text-[#a39e98]">
            Test your recall before flipping
          </span>
        </div>
      )}

      {/* Bottom Self-Assessment Bar (Shown when revealed) */}
      {isRevealed && (
        <div className="p-4 sm:p-6 bg-white border-t border-[#e6e6e6]">
          <div className="text-center mb-3">
            <p className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Rate your recall (SM-2 Spaced Repetition)
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Again (Quality 0) */}
            <button
              type="button"
              onClick={() => handleRate(0)}
              className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-800 transition-all duration-150 active:scale-95 group"
            >
              <div className="flex items-center gap-1">
                <RotateCw className="size-3.5 text-rose-600 group-hover:rotate-180 transition-transform duration-300" />
                <span className="font-bold text-sm">Again</span>
              </div>
              <span className="text-[10px] text-rose-600/90 mt-0.5">Reset (1d)</span>
            </button>

            {/* Hard (Quality 2) */}
            <button
              type="button"
              onClick={() => handleRate(2)}
              className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 transition-all duration-150 active:scale-95"
            >
              <span className="font-bold text-sm">Hard</span>
              <span className="text-[10px] text-amber-600/90 mt-0.5">Struggled (1d)</span>
            </button>

            {/* Good (Quality 4) */}
            <button
              type="button"
              onClick={() => handleRate(4)}
              className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-800 transition-all duration-150 active:scale-95"
            >
              <span className="font-bold text-sm">Good</span>
              <span className="text-[10px] text-blue-600/90 mt-0.5">Normal interval</span>
            </button>

            {/* Easy (Quality 5) */}
            <button
              type="button"
              onClick={() => handleRate(5)}
              className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-800 transition-all duration-150 active:scale-95"
            >
              <span className="font-bold text-sm">Easy</span>
              <span className="text-[10px] text-emerald-600/90 mt-0.5">Max interval</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
