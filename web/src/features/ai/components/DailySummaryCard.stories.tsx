import type { Meta, StoryObj } from "@storybook/react";
import { DailySummaryCard } from "./DailySummaryCard";

const meta: Meta<typeof DailySummaryCard> = {
  title: "AI/DailySummaryCard",
  component: DailySummaryCard,
  parameters: {
    layout: "padded"
  }
};

export default meta;
type Story = StoryObj<typeof DailySummaryCard>;

const sampleSummary = {
  id: "sum-1",
  userId: "user-123",
  date: "2026-08-12",
  yesterdayCompleted: [
    { id: "h1", title: "Morning 30-min run", type: "habit", completedAt: "2026-08-11T07:30:00.000Z" },
    { id: "h2", title: "Read 20 pages of book", type: "habit", completedAt: "2026-08-11T21:00:00.000Z" },
    { id: "g1", title: "Complete Q3 Architecture Review", type: "goal" }
  ],
  todaySchedule: [
    {
      occurrenceId: "evt-1@2026-08-12T09:00:00.000Z",
      title: "Team Engineering Standup",
      startTime: "2026-08-12T09:00:00.000Z",
      endTime: "2026-08-12T09:30:00.000Z",
      location: "Zoom",
      isAllDay: false
    },
    {
      occurrenceId: "evt-2@2026-08-12T14:00:00.000Z",
      title: "Design System Review with Product",
      startTime: "2026-08-12T14:00:00.000Z",
      endTime: "2026-08-12T15:00:00.000Z",
      location: "Room 4B",
      isAllDay: false
    }
  ],
  topPriorities: [
    {
      title: "Finalize Phase 2 API specs & tests",
      category: "goal",
      rationale: "Target completion date is approaching"
    },
    {
      title: "Design System Review with Product",
      category: "schedule",
      rationale: "High priority meeting at 14:00"
    },
    {
      title: "Complete 30-min morning run",
      category: "habit",
      rationale: "Keep 5-day habit streak alive"
    }
  ],
  generatedAt: "2026-08-12T07:00:00.000Z"
};

export const PopulatedState: Story = {
  args: {
    isLoading: false,
    isError: false,
    generated: true,
    summary: sampleSummary
  }
};

export const NotYetGeneratedState: Story = {
  args: {
    isLoading: false,
    isError: false,
    generated: false,
    deliveryTime: "07:00",
    summary: null
  }
};

export const SparseDataState: Story = {
  args: {
    isLoading: false,
    isError: false,
    generated: true,
    summary: {
      id: "sum-sparse",
      userId: "user-new",
      date: "2026-08-12",
      yesterdayCompleted: [],
      todaySchedule: [],
      topPriorities: [
        {
          title: "Create your first goal or habit",
          category: "general",
          rationale: "Welcome to LifeOS! Add items to track progress."
        }
      ],
      generatedAt: "2026-08-12T07:00:00.000Z"
    }
  }
};

export const ErrorState: Story = {
  args: {
    isLoading: false,
    isError: true,
    summary: null
  }
};
