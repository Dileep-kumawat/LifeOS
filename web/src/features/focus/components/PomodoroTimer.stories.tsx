import type { Meta, StoryObj } from "@storybook/react";
import { PomodoroTimer } from "./PomodoroTimer";
import type { FocusSession } from "@lifeos/shared";

const meta: Meta<typeof PomodoroTimer> = {
  title: "Features/Focus/PomodoroTimer",
  component: PomodoroTimer,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof PomodoroTimer>;

const baseMockSession: FocusSession = {
  id: "session-1",
  userId: "user-123",
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  currentCycle: 1,
  currentPhase: "work",
  linkedType: "none",
  linkedId: null,
  status: "active",
  startedAt: "2026-08-30T09:00:00.000Z",
  completedAt: null,
  pausedAt: null,
  lastResumedAt: "2026-08-30T09:00:00.000Z",
  accumulatedWorkSeconds: 0,
  totalFocusMinutes: 0,
  createdAt: "2026-08-30T09:00:00.000Z",
  updatedAt: "2026-08-30T09:00:00.000Z"
};

/**
 * 1. Idle State: resting state with Start Focus button and configuration toggle
 */
export const Idle: Story = {
  args: {
    stateOverride: "idle",
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4
  }
};

/**
 * 2. Working State: active Pomodoro countdown in progress
 */
export const Working: Story = {
  args: {
    stateOverride: "working",
    timeOverrideSeconds: 23 * 60 + 45, // 23:45 remaining
    session: {
      ...baseMockSession,
      currentCycle: 1,
      currentPhase: "work",
      status: "active"
    }
  }
};

/**
 * 3. Break State: active short rest interval countdown
 */
export const Break: Story = {
  args: {
    stateOverride: "break",
    timeOverrideSeconds: 4 * 60 + 15, // 04:15 remaining
    session: {
      ...baseMockSession,
      currentCycle: 1,
      currentPhase: "break",
      status: "active"
    }
  }
};

/**
 * 4. Paused State: work countdown paused with Resume and Finish controls
 */
export const Paused: Story = {
  args: {
    stateOverride: "paused",
    timeOverrideSeconds: 14 * 60 + 20, // 14:20 remaining
    session: {
      ...baseMockSession,
      currentCycle: 2,
      currentPhase: "work",
      status: "paused"
    }
  }
};

/**
 * 5. With Linked Study Topic: shows study topic context pill during active session
 */
export const WithLinkedTopic: Story = {
  args: {
    stateOverride: "working",
    timeOverrideSeconds: 20 * 60 + 10,
    linkedType: "topic",
    linkedId: "topic-101",
    linkedTitle: "Data Structures: Red-Black Trees & Binary Heaps",
    session: {
      ...baseMockSession,
      linkedType: "topic",
      linkedId: "topic-101",
      currentCycle: 2,
      currentPhase: "work",
      status: "active"
    }
  }
};

/**
 * 6. With Linked Goal: shows strategic goal context pill
 */
export const WithLinkedGoal: Story = {
  args: {
    stateOverride: "working",
    timeOverrideSeconds: 45 * 60,
    workMinutes: 50,
    linkedType: "goal",
    linkedId: "goal-202",
    linkedTitle: "Launch LifeOS v1.0 Production Release",
    session: {
      ...baseMockSession,
      workMinutes: 50,
      linkedType: "goal",
      linkedId: "goal-202",
      currentCycle: 3,
      currentPhase: "work",
      status: "active"
    }
  }
};
