import type { Meta, StoryObj } from "@storybook/react";
import { SessionHistoryRow } from "./SessionHistoryRow";
import type { FocusSession } from "@lifeos/shared";

const meta: Meta<typeof SessionHistoryRow> = {
  title: "Features/Focus/SessionHistoryRow",
  component: SessionHistoryRow,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof SessionHistoryRow>;

const baseSession: FocusSession = {
  id: "session-101",
  userId: "user-123",
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  currentCycle: 2,
  currentPhase: "work",
  linkedType: "topic",
  linkedId: "topic-99",
  status: "completed",
  startedAt: "2026-08-30T10:00:00.000Z",
  completedAt: "2026-08-30T10:50:00.000Z",
  pausedAt: null,
  lastResumedAt: null,
  accumulatedWorkSeconds: 3000,
  totalFocusMinutes: 50,
  createdAt: "2026-08-30T10:00:00.000Z",
  updatedAt: "2026-08-30T10:50:00.000Z"
};

/**
 * 1. Completed Session with Linked Topic: green completed pill, 50 mins recorded
 */
export const CompletedWithTopic: Story = {
  args: {
    session: {
      ...baseSession,
      status: "completed",
      linkedType: "topic",
      totalFocusMinutes: 50
    }
  }
};

/**
 * 2. Abandoned Session with Linked Goal: stopped early with partial focus time preserved
 */
export const AbandonedWithGoal: Story = {
  args: {
    session: {
      ...baseSession,
      status: "abandoned",
      linkedType: "goal",
      totalFocusMinutes: 18,
      accumulatedWorkSeconds: 1080
    }
  }
};

/**
 * 3. Completed Session with Linked Task
 */
export const CompletedWithTask: Story = {
  args: {
    session: {
      ...baseSession,
      status: "completed",
      linkedType: "task",
      totalFocusMinutes: 25
    }
  }
};

/**
 * 4. Active Running Session
 */
export const ActiveRunning: Story = {
  args: {
    session: {
      ...baseSession,
      status: "active",
      linkedType: "none",
      totalFocusMinutes: 0
    }
  }
};

/**
 * 5. Paused Session
 */
export const Paused: Story = {
  args: {
    session: {
      ...baseSession,
      status: "paused",
      linkedType: "topic",
      totalFocusMinutes: 14
    }
  }
};
