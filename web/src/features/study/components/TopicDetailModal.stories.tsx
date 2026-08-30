import type { Meta, StoryObj } from "@storybook/react";
import { TopicDetailModal, type TopicDetailData } from "./TopicDetailModal";

const meta: Meta<typeof TopicDetailModal> = {
  title: "Features/Study/TopicDetailModal",
  component: TopicDetailModal,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof TopicDetailModal>;

const mockPopulatedTopic: TopicDetailData = {
  id: "topic-101",
  subjectId: "subj-01",
  subjectName: "Computer Systems & Networks",
  subjectColor: "#0075de",
  title: "TCP Congestion Control & Flow Control",
  deadline: "2026-09-15T18:00:00.000Z",
  priority: "high",
  status: "in_progress",
  estimatedMinutes: 90,
  focusTime: {
    topicId: "topic-101",
    totalFocusMinutes: 210, // 3.5 hrs
    sessionCount: 7,
    completedCount: 6,
    abandonedCount: 1
  },
  focusSessions: [
    {
      id: "fs-1",
      userId: "user-1",
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4,
      currentCycle: 2,
      currentPhase: "work",
      linkedType: "topic",
      linkedId: "topic-101",
      status: "completed",
      startedAt: "2026-08-29T14:00:00.000Z",
      completedAt: "2026-08-29T14:50:00.000Z",
      pausedAt: null,
      lastResumedAt: null,
      accumulatedWorkSeconds: 3000,
      totalFocusMinutes: 50,
      createdAt: "2026-08-29T14:00:00.000Z",
      updatedAt: "2026-08-29T14:50:00.000Z"
    },
    {
      id: "fs-2",
      userId: "user-1",
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4,
      currentCycle: 1,
      currentPhase: "work",
      linkedType: "topic",
      linkedId: "topic-101",
      status: "completed",
      startedAt: "2026-08-28T10:00:00.000Z",
      completedAt: "2026-08-28T10:25:00.000Z",
      pausedAt: null,
      lastResumedAt: null,
      accumulatedWorkSeconds: 1500,
      totalFocusMinutes: 25,
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:25:00.000Z"
    }
  ],
  planEvents: [
    {
      id: "evt-1",
      title: "Study: TCP Congestion Control",
      startTime: "2026-08-30T15:00:00.000Z",
      endTime: "2026-08-30T16:30:00.000Z",
      status: "scheduled"
    },
    {
      id: "evt-2",
      title: "Review & Flashcards: TCP Congestion Control",
      startTime: "2026-09-02T11:00:00.000Z",
      endTime: "2026-09-02T12:00:00.000Z",
      status: "scheduled"
    }
  ],
  flashcardStats: {
    total: 8,
    due: 3,
    mastered: 4,
    learning: 4
  }
};

const mockEmptyTopic: TopicDetailData = {
  id: "topic-102",
  subjectId: "subj-02",
  subjectName: "Linear Algebra",
  subjectColor: "#2a9d99",
  title: "Eigenvalues & Eigenvectors Decomposition",
  deadline: null,
  priority: "medium",
  status: "not_started",
  estimatedMinutes: 60,
  focusTime: {
    topicId: "topic-102",
    totalFocusMinutes: 0,
    sessionCount: 0,
    completedCount: 0,
    abandonedCount: 0
  },
  focusSessions: [],
  planEvents: [],
  flashcardStats: {
    total: 0,
    due: 0,
    mastered: 0,
    learning: 0
  }
};

/**
 * 1. Populated Topic View: shows accumulated focus time (3.5 hrs), plan events, focus sessions, and flashcard deck stats
 */
export const PopulatedWithPlanAndFocus: Story = {
  args: {
    isOpen: true,
    topic: mockPopulatedTopic,
    onClose: () => {}
  }
};

/**
 * 2. Empty State Topic View: no focus sessions or plan events recorded yet
 */
export const EmptyNoPlanNoFocus: Story = {
  args: {
    isOpen: true,
    topic: mockEmptyTopic,
    onClose: () => {}
  }
};
