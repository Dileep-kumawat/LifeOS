import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Sparkles, ArrowLeft, RefreshCw, Trophy } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import { FlashcardReviewCard } from "./FlashcardReviewCard";

export interface DueFlashcard {
  id: string;
  front: string;
  back: string;
  subjectId: string | null;
  topicId: string | null;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: string;
}

export interface DailyReviewQueueScreenProps {
  onBackToStudy?: () => void;
  subjectsMap?: Record<string, { name: string; color?: string }>;
  topicsMap?: Record<string, { title: string }>;
}

export const DailyReviewQueueScreen: React.FC<DailyReviewQueueScreenProps> = ({
  onBackToStudy,
  subjectsMap = {},
  topicsMap = {}
}) => {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<DueFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Fetch due flashcards
  const { data, isLoading, refetch, isRefetching } = useQuery<{
    count: number;
    flashcards: DueFlashcard[];
  }>({
    queryKey: ["study", "flashcards", "due"],
    queryFn: async () => {
      const res = await apiClient.get<{ count: number; flashcards: DueFlashcard[] }>(
        "/study/flashcards/due"
      );
      return res.data;
    }
  });

  useEffect(() => {
    if (data?.flashcards) {
      setQueue(data.flashcards);
      setCurrentIndex(0);
      setReviewedCount(0);
      setIsSessionComplete(false);
    }
  }, [data]);

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, quality }: { id: string; quality: number }) => {
      const res = await apiClient.post(`/study/flashcards/${id}/review`, { quality });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["study", "subjects"] });

      setReviewedCount((prev) => prev + 1);

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsSessionComplete(true);
      }
    }
  });

  const handleReview = (quality: number) => {
    const currentCard = queue[currentIndex];
    if (!currentCard) return;
    reviewMutation.mutate({ id: currentCard.id, quality });
  };

  const handleRestart = () => {
    refetch();
  };

  if (isLoading || isRefetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="size-8 text-[#0075de] animate-spin mb-3" />
        <p className="text-sm font-medium text-[#615d59]">Loading your daily review queue...</p>
      </div>
    );
  }

  // ─── Session Complete State ────────────────────────────────────────────────
  if (isSessionComplete || (queue.length > 0 && currentIndex >= queue.length)) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 px-4 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="size-20 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
          <Trophy className="size-10 text-[#1aae39]" />
        </div>

        <h2 className="text-2xl font-bold text-[#000000] tracking-tight">
          Session Complete!
        </h2>
        <p className="mt-2 text-sm text-[#615d59]">
          You reviewed <span className="font-bold text-[#000000]">{reviewedCount}</span> flashcard
          {reviewedCount === 1 ? "" : "s"} today. Spaced repetition schedules have been updated!
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onBackToStudy && (
            <button
              type="button"
              onClick={onBackToStudy}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0075de] text-white font-semibold text-sm hover:bg-[#005bab] transition-all shadow-xs"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Study Planner</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleRestart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[#e6e6e6] bg-white text-sm font-medium text-[#31302e] hover:bg-[#f6f5f4] transition-colors"
          >
            <RefreshCw className="size-4" />
            <span>Check Queue Again</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty Queue State (All Caught Up) ─────────────────────────────────────
  if (queue.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center">
        <div className="size-16 mx-auto rounded-full bg-[#f6f5f4] border border-[#e6e6e6] flex items-center justify-center text-[#1aae39] mb-5">
          <CheckCircle className="size-8 text-[#1aae39]" />
        </div>

        <h3 className="text-xl font-bold text-[#000000]">All Caught Up!</h3>
        <p className="mt-2 text-sm text-[#615d59] max-w-sm mx-auto">
          No flashcards are due for review right now. Keep up the great consistency or add new cards
          to expand your knowledge deck.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          {onBackToStudy && (
            <button
              type="button"
              onClick={onBackToStudy}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0075de] text-white font-semibold text-sm hover:bg-[#005bab] transition-all shadow-xs"
            >
              <ArrowLeft className="size-4" />
              <span>Return to Subjects</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentCard = queue[currentIndex];
  const subject = currentCard.subjectId ? subjectsMap[currentCard.subjectId] : undefined;
  const topic = currentCard.topicId ? topicsMap[currentCard.topicId] : undefined;
  const progressPercent = Math.round(((currentIndex + 1) / queue.length) * 100);

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4">
      {/* Header & Progress */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {onBackToStudy && (
          <button
            type="button"
            onClick={onBackToStudy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#615d59] hover:text-[#0075de] transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </button>
        )}

        <div className="flex items-center gap-2 text-xs font-semibold text-[#31302e]">
          <Sparkles className="size-4 text-[#0075de]" />
          <span>Daily Review Queue</span>
        </div>

        <span className="text-xs font-semibold text-[#0075de] bg-[#0075de]/10 border border-[#0075de]/20 px-2.5 py-0.5 rounded-full">
          Card {currentIndex + 1} of {queue.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f6f5f4] border border-[#e6e6e6] mb-6">
        <div
          className="h-full bg-[#0075de] rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Current Flashcard Card */}
      <FlashcardReviewCard
        key={currentCard.id}
        id={currentCard.id}
        front={currentCard.front}
        back={currentCard.back}
        subjectName={subject?.name}
        subjectColor={subject?.color}
        topicTitle={topic?.title}
        repetitions={currentCard.repetitions}
        intervalDays={currentCard.intervalDays}
        easeFactor={currentCard.easeFactor}
        onReview={handleReview}
      />
    </div>
  );
};
