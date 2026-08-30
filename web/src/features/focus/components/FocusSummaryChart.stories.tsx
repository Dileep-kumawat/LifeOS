import type { Meta, StoryObj } from "@storybook/react";
import { FocusSummaryChart } from "./FocusSummaryChart";
import type { FocusSummaryResponse } from "@lifeos/shared";

const meta: Meta<typeof FocusSummaryChart> = {
  title: "Features/Focus/FocusSummaryChart",
  component: FocusSummaryChart,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof FocusSummaryChart>;

const mockPopulatedWeekData: FocusSummaryResponse = {
  period: {
    range: "week",
    startDate: "2026-08-24T00:00:00.000Z",
    endDate: "2026-08-30T23:59:59.999Z",
    label: "Last 7 Days"
  },
  totalFocusMinutes: 385,
  totalSessionsCount: 14,
  completedSessionsCount: 12,
  abandonedSessionsCount: 2,
  activeSessionsCount: 0,
  averageSessionMinutes: 27.5,
  linkedTypeBreakdown: [
    { linkedType: "topic", totalMinutes: 210, count: 7, percentage: 55 },
    { linkedType: "goal", totalMinutes: 100, count: 4, percentage: 26 },
    { linkedType: "task", totalMinutes: 50, count: 2, percentage: 13 },
    { linkedType: "none", totalMinutes: 25, count: 1, percentage: 6 }
  ],
  trend: [
    { date: "2026-08-24", totalMinutes: 50, count: 2, completedCount: 2, abandonedCount: 0 },
    { date: "2026-08-25", totalMinutes: 75, count: 3, completedCount: 3, abandonedCount: 0 },
    { date: "2026-08-26", totalMinutes: 25, count: 1, completedCount: 1, abandonedCount: 0 },
    { date: "2026-08-27", totalMinutes: 60, count: 2, completedCount: 2, abandonedCount: 0 },
    { date: "2026-08-28", totalMinutes: 45, count: 2, completedCount: 1, abandonedCount: 1 },
    { date: "2026-08-29", totalMinutes: 50, count: 2, completedCount: 2, abandonedCount: 0 },
    { date: "2026-08-30", totalMinutes: 80, count: 2, completedCount: 1, abandonedCount: 1 }
  ]
};

const mockEmptyData: FocusSummaryResponse = {
  period: {
    range: "week",
    startDate: "2026-08-24T00:00:00.000Z",
    endDate: "2026-08-30T23:59:59.999Z",
    label: "Last 7 Days"
  },
  totalFocusMinutes: 0,
  totalSessionsCount: 0,
  completedSessionsCount: 0,
  abandonedSessionsCount: 0,
  activeSessionsCount: 0,
  averageSessionMinutes: 0,
  linkedTypeBreakdown: [
    { linkedType: "topic", totalMinutes: 0, count: 0, percentage: 0 },
    { linkedType: "goal", totalMinutes: 0, count: 0, percentage: 0 },
    { linkedType: "task", totalMinutes: 0, count: 0, percentage: 0 },
    { linkedType: "none", totalMinutes: 0, count: 0, percentage: 0 }
  ],
  trend: [
    { date: "2026-08-24", totalMinutes: 0, count: 0, completedCount: 0, abandonedCount: 0 },
    { date: "2026-08-25", totalMinutes: 0, count: 0, completedCount: 0, abandonedCount: 0 },
    { date: "2026-08-26", totalMinutes: 0, count: 0, completedCount: 0, abandonedCount: 0 },
    { date: "2026-08-27", totalMinutes: 0, count: 0, completedCount: 0, abandonedCount: 0 },
    { date: "2026-08-28", totalMinutes: 0, count: 0, completedCount: 0, abandonedCount: 0 },
    { date: "2026-08-29", totalMinutes: 0, count: 0, completedCount: 0, abandonedCount: 0 },
    { date: "2026-08-30", totalMinutes: 0, count: 0, completedCount: 0, abandonedCount: 0 }
  ]
};

/**
 * 1. Populated Weekly Summary: full multi-session trend with topic, goal, task breakdown
 */
export const PopulatedWeekly: Story = {
  args: {
    selectedRange: "week",
    data: mockPopulatedWeekData
  }
};

/**
 * 2. Empty State: no sessions logged yet in the selected period
 */
export const EmptyNoSessions: Story = {
  args: {
    selectedRange: "week",
    data: mockEmptyData
  }
};

/**
 * 3. Loading State: skeleton animation while fetching aggregates
 */
export const Loading: Story = {
  args: {
    selectedRange: "week",
    isLoading: true
  }
};
