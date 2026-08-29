import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Brain,
  Layers,
  Filter,
  Trash2,
  Edit2,
  Sparkles
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { SubjectCard } from "./components/SubjectCard";
import { SubjectModal } from "./components/SubjectModal";
import { TopicCard } from "./components/TopicCard";
import { TopicModal } from "./components/TopicModal";
import { FlashcardForm } from "./components/FlashcardForm";
import { DailyReviewQueueScreen } from "./components/DailyReviewQueueScreen";
import { cn } from "../../lib/utils";
import type { CreateSubjectInput, CreateTopicInput, CreateFlashcardInput } from "@lifeos/shared";

interface SubjectItem {
  id: string;
  name: string;
  color: string;
  examDate: string | null;
  topicsCount?: number;
  completedTopicsCount?: number;
  dueFlashcardsCount?: number;
}

interface TopicItem {
  id: string;
  subjectId: string;
  title: string;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "completed";
  estimatedMinutes: number | null;
}

interface FlashcardItem {
  id: string;
  subjectId: string | null;
  topicId: string | null;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: string;
}

export function StudyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active Tab: "subjects" | "flashcards" | "review"
  const [activeTab, setActiveTab] = useState<"subjects" | "flashcards" | "review">("subjects");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [topicStatusFilter, setTopicStatusFilter] = useState<string>("all");

  // Modal States
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);

  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<FlashcardItem | null>(null);

  // ─── Data Queries ─────────────────────────────────────────────────────────

  const { data: subjectsData, isLoading: isSubjectsLoading } = useQuery<{
    subjects: SubjectItem[];
  }>({
    queryKey: ["study", "subjects"],
    queryFn: async () => {
      const res = await apiClient.get<{ subjects: SubjectItem[] }>("/study/subjects");
      return res.data;
    }
  });

  const subjects = subjectsData?.subjects || [];

  const { data: topicsData, isLoading: isTopicsLoading } = useQuery<{
    topics: TopicItem[];
  }>({
    queryKey: ["study", "topics", selectedSubjectId],
    queryFn: async () => {
      const url = selectedSubjectId
        ? `/study/topics?subjectId=${selectedSubjectId}`
        : "/study/topics";
      const res = await apiClient.get<{ topics: TopicItem[] }>(url);
      return res.data;
    }
  });

  const topics = topicsData?.topics || [];

  const { data: flashcardsData } = useQuery<{ flashcards: FlashcardItem[] }>({
    queryKey: ["study", "flashcards", selectedSubjectId],
    queryFn: async () => {
      const url = selectedSubjectId
        ? `/study/flashcards?subjectId=${selectedSubjectId}`
        : "/study/flashcards";
      const res = await apiClient.get<{ flashcards: FlashcardItem[] }>(url);
      return res.data;
    }
  });

  const flashcards = flashcardsData?.flashcards || [];

  const { data: dueData } = useQuery<{ count: number }>({
    queryKey: ["study", "flashcards", "due"],
    queryFn: async () => {
      const res = await apiClient.get<{ count: number }>("/study/flashcards/due");
      return res.data;
    }
  });

  const totalDueCount = dueData?.count || 0;

  // Subjects & Topics Mapping for lookup
  const subjectsMap = React.useMemo(() => {
    const map: Record<string, { name: string; color?: string }> = {};
    subjects.forEach((s) => {
      map[s.id] = { name: s.name, color: s.color };
    });
    return map;
  }, [subjects]);

  const topicsMap = React.useMemo(() => {
    const map: Record<string, { title: string }> = {};
    topics.forEach((t) => {
      map[t.id] = { title: t.title };
    });
    return map;
  }, [topics]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  // Subject Mutations
  const createSubjectMutation = useMutation({
    mutationFn: async (data: CreateSubjectInput) => {
      const res = await apiClient.post("/study/subjects", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "subjects"] });
    }
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateSubjectInput }) => {
      const res = await apiClient.patch(`/study/subjects/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "subjects"] });
    }
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/study/subjects/${id}`);
      return res.data;
    },
    onSuccess: (_, deletedId) => {
      if (selectedSubjectId === deletedId) {
        setSelectedSubjectId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["study"] });
    }
  });

  // Topic Mutations
  const createTopicMutation = useMutation({
    mutationFn: async (data: CreateTopicInput) => {
      const res = await apiClient.post("/study/topics", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "topics"] });
      queryClient.invalidateQueries({ queryKey: ["study", "subjects"] });
    }
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.patch(`/study/topics/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "topics"] });
      queryClient.invalidateQueries({ queryKey: ["study", "subjects"] });
    }
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/study/topics/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "topics"] });
      queryClient.invalidateQueries({ queryKey: ["study", "subjects"] });
      queryClient.invalidateQueries({ queryKey: ["study", "flashcards"] });
    }
  });

  // Flashcard Mutations
  const createFlashcardMutation = useMutation({
    mutationFn: async (data: CreateFlashcardInput) => {
      const res = await apiClient.post("/study/flashcards", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["study", "subjects"] });
    }
  });

  const updateFlashcardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateFlashcardInput }) => {
      const res = await apiClient.patch(`/study/flashcards/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "flashcards"] });
    }
  });

  const deleteFlashcardMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/study/flashcards/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study", "flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["study", "subjects"] });
    }
  });

  // Filtered topics
  const filteredTopics = topics.filter((t) => {
    if (topicStatusFilter === "all") return true;
    return t.status === topicStatusFilter;
  });

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-[#0075de]/10 border border-[#0075de]/20 flex items-center justify-center text-[#0075de] shadow-2xs">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#000000] tracking-tight">Study Planner</h1>
              <p className="text-xs text-[#615d59]">
                Structured syllabus, exam deadlines & spaced repetition review queue
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Plan with AI & New Subject */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/chat?prompt=Create tomorrow's study plan")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-sm font-semibold transition-all shadow-2xs"
          >
            <Sparkles className="size-4 text-indigo-600" />
            <span>Plan with AI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingSubject(null);
              setIsSubjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0075de] hover:bg-[#005bab] text-white text-sm font-semibold transition-all shadow-xs"
          >
            <Plus className="size-4" />
            <span>New Subject</span>
          </button>
        </div>
      </div>

      {/* Daily Review Queue Hero Banner */}
      <div className="rounded-2xl border border-[#0075de]/20 bg-gradient-to-r from-[#0075de]/5 via-white to-blue-50/40 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-[#0075de] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
            <Brain className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#000000]">
                Spaced Repetition Review Queue
              </h2>
              {totalDueCount > 0 && (
                <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">
                  {totalDueCount} Due
                </span>
              )}
            </div>
            <p className="text-xs text-[#615d59] mt-0.5 max-w-xl">
              {totalDueCount > 0
                ? `You have ${totalDueCount} flashcard${totalDueCount === 1 ? "" : "s"} scheduled for review today. Review them to advance intervals and retain concepts.`
                : "All caught up! No cards due for review today. Review ahead or create new cards."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("review")}
          className={cn(
            "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs active:scale-95 shrink-0",
            totalDueCount > 0
              ? "bg-[#0075de] hover:bg-[#005bab] text-white shadow-sm"
              : "bg-white border border-[#e6e6e6] text-[#31302e] hover:bg-[#f6f5f4]"
          )}
        >
          <BookOpen className="size-4" />
          <span>{totalDueCount > 0 ? "Start Daily Review" : "Open Review Queue"}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#e6e6e6]">
        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
            activeTab === "subjects"
              ? "border-[#0075de] text-[#0075de]"
              : "border-transparent text-[#615d59] hover:text-[#000000]"
          )}
        >
          <Layers className="size-4" />
          <span>Subjects & Syllabus ({subjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flashcards")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
            activeTab === "flashcards"
              ? "border-[#0075de] text-[#0075de]"
              : "border-transparent text-[#615d59] hover:text-[#000000]"
          )}
        >
          <BookOpen className="size-4" />
          <span>Flashcards Deck ({flashcards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("review")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all",
            activeTab === "review"
              ? "border-[#0075de] text-[#0075de]"
              : "border-transparent text-[#615d59] hover:text-[#000000]"
          )}
        >
          <Brain className="size-4" />
          <span>Review Queue {totalDueCount > 0 && `(${totalDueCount})`}</span>
        </button>
      </div>

      {/* ─── TAB 1: SUBJECTS & SYLLABUS ──────────────────────────────────────── */}
      {activeTab === "subjects" && (
        <div className="space-y-6">
          {/* Subjects Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#31302e] uppercase tracking-wider">
                Subjects & Courses
              </h3>
              {selectedSubjectId && (
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId(null)}
                  className="text-xs text-[#0075de] hover:underline font-medium"
                >
                  View All Topics
                </button>
              )}
            </div>

            {isSubjectsLoading ? (
              <div className="py-8 text-center text-sm text-[#a39e98]">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e6e6e6] bg-[#faf9f8] p-8 text-center">
                <GraduationCap className="size-8 text-[#a39e98] mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-[#000000]">No Subjects Created Yet</h4>
                <p className="text-xs text-[#615d59] mt-1 max-w-sm mx-auto">
                  Create your first subject or course to start organizing topics and study deadlines.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubject(null);
                    setIsSubjectModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0075de] text-white text-xs font-semibold hover:bg-[#005bab] shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>Add First Subject</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subj) => (
                  <SubjectCard
                    key={subj.id}
                    id={subj.id}
                    name={subj.name}
                    color={subj.color}
                    examDate={subj.examDate}
                    topicsCount={subj.topicsCount}
                    completedTopicsCount={subj.completedTopicsCount}
                    dueFlashcardsCount={subj.dueFlashcardsCount}
                    isSelected={selectedSubjectId === subj.id}
                    onSelect={(id) =>
                      setSelectedSubjectId(selectedSubjectId === id ? null : id)
                    }
                    onEdit={(id) => {
                      const found = subjects.find((s) => s.id === id);
                      if (found) {
                        setEditingSubject(found);
                        setIsSubjectModalOpen(true);
                      }
                    }}
                    onDelete={(id) => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this subject? All associated topics and flashcards will be cascade-deleted."
                        )
                      ) {
                        deleteSubjectMutation.mutate(id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Topics List Section */}
          <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            {/* Header with Title + Filters + Add Topic */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e6e6e6]">
              <div>
                <h3 className="text-base font-bold text-[#000000] tracking-tight">
                  {selectedSubject ? `${selectedSubject.name} Topics` : "All Syllabus Topics"}
                </h3>
                <p className="text-xs text-[#615d59] mt-0.5">
                  {filteredTopics.length} topic{filteredTopics.length === 1 ? "" : "s"} listed
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Filter Pill Dropdown */}
                <div className="flex items-center gap-1 bg-[#f6f5f4] p-1 rounded-lg border border-[#e6e6e6] text-xs">
                  <Filter className="size-3.5 text-[#a39e98] ml-1" />
                  {["all", "not_started", "in_progress", "completed"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTopicStatusFilter(st)}
                      className={cn(
                        "px-2.5 py-1 rounded-md capitalize font-medium transition-all",
                        topicStatusFilter === st
                          ? "bg-white text-[#0075de] font-bold shadow-2xs"
                          : "text-[#615d59] hover:text-[#000000]"
                      )}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {/* Add Topic Button */}
                {subjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTopic(null);
                      setIsTopicModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0075de] text-white text-xs font-semibold hover:bg-[#005bab] shadow-xs"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Topic</span>
                  </button>
                )}
              </div>
            </div>

            {/* Topics List */}
            {isTopicsLoading ? (
              <div className="py-8 text-center text-sm text-[#a39e98]">Loading topics...</div>
            ) : filteredTopics.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#615d59]">
                <Layers className="size-8 text-[#a39e98] mx-auto mb-2" />
                <p>No topics match the selected criteria.</p>
                {subjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTopic(null);
                      setIsTopicModalOpen(true);
                    }}
                    className="mt-3 text-xs text-[#0075de] hover:underline font-semibold"
                  >
                    + Add Topic
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTopics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    id={topic.id}
                    subjectId={topic.subjectId}
                    title={topic.title}
                    deadline={topic.deadline}
                    priority={topic.priority}
                    status={topic.status}
                    estimatedMinutes={topic.estimatedMinutes}
                    onStatusChange={(id, status) => {
                      updateTopicMutation.mutate({ id, data: { status } });
                    }}
                    onEdit={(id) => {
                      const found = topics.find((t) => t.id === id);
                      if (found) {
                        setEditingTopic(found);
                        setIsTopicModalOpen(true);
                      }
                    }}
                    onDelete={(id) => {
                      if (window.confirm("Are you sure you want to delete this topic?")) {
                        deleteTopicMutation.mutate(id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: FLASHCARD DECK ───────────────────────────────────────────── */}
      {activeTab === "flashcards" && (
        <div className="rounded-2xl border border-[#e6e6e6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e6e6e6]">
            <div>
              <h3 className="text-base font-bold text-[#000000]">Flashcard Library</h3>
              <p className="text-xs text-[#615d59] mt-0.5">
                Manage your spaced repetition prompt/answer decks
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingFlashcard(null);
                setIsFlashcardModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0075de] text-white text-xs font-semibold hover:bg-[#005bab] shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>Create Flashcard</span>
            </button>
          </div>

          {flashcards.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#615d59]">
              <BookOpen className="size-8 text-[#a39e98] mx-auto mb-2" />
              <p>No flashcards created yet.</p>
              <button
                type="button"
                onClick={() => {
                  setEditingFlashcard(null);
                  setIsFlashcardModalOpen(true);
                }}
                className="mt-3 text-xs text-[#0075de] hover:underline font-semibold"
              >
                + Create your first flashcard
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {flashcards.map((card) => {
                const subj = card.subjectId ? subjectsMap[card.subjectId] : undefined;
                const top = card.topicId ? topicsMap[card.topicId] : undefined;
                const isDue = new Date(card.nextReviewDate) <= new Date();

                return (
                  <div
                    key={card.id}
                    className="flex flex-col justify-between rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-xs text-[#615d59] truncate">
                          {subj && (
                            <span className="font-semibold text-[#1a1c1c]">{subj.name}</span>
                          )}
                          {top && <span>• {top.title}</span>}
                        </div>
                        {isDue && (
                          <span className="shrink-0 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            Due
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-semibold text-[#000000] line-clamp-2 mb-1.5">
                        {card.front}
                      </div>
                      <div className="text-xs text-[#615d59] line-clamp-3 bg-[#f6f5f4] p-2.5 rounded-lg border border-[#e6e6e6]">
                        {card.back}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#e6e6e6]/60 flex items-center justify-between text-[11px] text-[#a39e98]">
                      <span>
                        Reps: {card.repetitions} | Int: {card.intervalDays}d | EF: {card.easeFactor}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFlashcard(card);
                            setIsFlashcardModalOpen(true);
                          }}
                          className="p-1 text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4] rounded"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Delete this flashcard?")) {
                              deleteFlashcardMutation.mutate(card.id);
                            }
                          }}
                          className="p-1 text-[#615d59] hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: DAILY REVIEW QUEUE ───────────────────────────────────────── */}
      {activeTab === "review" && (
        <DailyReviewQueueScreen
          onBackToStudy={() => setActiveTab("subjects")}
          subjectsMap={subjectsMap}
          topicsMap={topicsMap}
        />
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────────── */}

      {/* Subject Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
        }}
        initialData={editingSubject || undefined}
        title={editingSubject ? "Edit Subject" : "Create New Subject"}
        onSubmit={async (data) => {
          if (editingSubject) {
            await updateSubjectMutation.mutateAsync({ id: editingSubject.id, data });
          } else {
            await createSubjectMutation.mutateAsync(data);
          }
        }}
      />

      {/* Topic Modal */}
      <TopicModal
        isOpen={isTopicModalOpen}
        onClose={() => {
          setIsTopicModalOpen(false);
          setEditingTopic(null);
        }}
        subjects={subjects}
        defaultSubjectId={selectedSubjectId || undefined}
        initialData={editingTopic || undefined}
        title={editingTopic ? "Edit Topic" : "Create New Topic"}
        onSubmit={async (data) => {
          if (editingTopic) {
            await updateTopicMutation.mutateAsync({ id: editingTopic.id, data });
          } else {
            await createTopicMutation.mutateAsync(data);
          }
        }}
      />

      {/* Flashcard Modal */}
      {isFlashcardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => {
              setIsFlashcardModalOpen(false);
              setEditingFlashcard(null);
            }}
          />
          <div className="relative w-full max-w-lg rounded-xl border border-[#e6e6e6] bg-white p-6 shadow-xl z-50">
            <h3 className="text-lg font-bold text-[#000000] mb-4">
              {editingFlashcard ? "Edit Flashcard" : "New Flashcard"}
            </h3>
            <FlashcardForm
              subjects={subjects}
              topics={topics}
              defaultSubjectId={selectedSubjectId || undefined}
              initialData={editingFlashcard || undefined}
              onCancel={() => {
                setIsFlashcardModalOpen(false);
                setEditingFlashcard(null);
              }}
              onSubmit={async (data) => {
                if (editingFlashcard) {
                  await updateFlashcardMutation.mutateAsync({ id: editingFlashcard.id, data });
                } else {
                  await createFlashcardMutation.mutateAsync(data);
                }
                setIsFlashcardModalOpen(false);
                setEditingFlashcard(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
