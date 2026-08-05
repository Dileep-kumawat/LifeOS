import type { Meta, StoryObj } from "@storybook/react";
import { HabitCard } from "./HabitCard";

const meta: Meta<typeof HabitCard> = {
  title: "Features/Habits/HabitCard",
  component: HabitCard,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof HabitCard>;

const todayDateStr = "2026-08-05";

export const CheckedInToday: Story = {
  args: {
    habit: {
      _id: "habit-1",
      title: "Morning Running 5km",
      frequency: { type: "daily" },
      currentStreak: 5,
      longestStreak: 10,
      completionRate: 0.85
    },
    todayDateStr,
    recentCheckIns: [
      { date: "2026-08-01", completed: true },
      { date: "2026-08-02", completed: true },
      { date: "2026-08-03", completed: true },
      { date: "2026-08-04", completed: true },
      { date: "2026-08-05", completed: true }
    ],
    onToggleCheckIn: () => {}
  }
};

export const NotYetToday: Story = {
  args: {
    habit: {
      _id: "habit-2",
      title: "Read 20 pages",
      frequency: { type: "daily" },
      currentStreak: 4,
      longestStreak: 12,
      completionRate: 0.7
    },
    todayDateStr,
    recentCheckIns: [
      { date: "2026-08-01", completed: true },
      { date: "2026-08-02", completed: true },
      { date: "2026-08-03", completed: true },
      { date: "2026-08-04", completed: true }
    ],
    onToggleCheckIn: () => {}
  }
};

export const MissedYesterday: Story = {
  args: {
    habit: {
      _id: "habit-3",
      title: "Meditation 10 mins",
      frequency: { type: "daily" },
      currentStreak: 0,
      longestStreak: 8,
      completionRate: 0.4
    },
    todayDateStr,
    recentCheckIns: [
      { date: "2026-08-03", completed: true },
      { date: "2026-08-04", completed: false }
    ],
    onToggleCheckIn: () => {}
  }
};
