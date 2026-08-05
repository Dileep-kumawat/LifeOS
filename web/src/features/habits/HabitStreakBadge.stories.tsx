import type { Meta, StoryObj } from "@storybook/react";
import { HabitStreakBadge } from "./HabitStreakBadge";

const meta: Meta<typeof HabitStreakBadge> = {
  title: "Features/Habits/HabitStreakBadge",
  component: HabitStreakBadge,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof HabitStreakBadge>;

export const ZeroStreak: Story = {
  args: {
    currentStreak: 0,
    longestStreak: 5,
    isCheckedInToday: false
  }
};

export const ActiveStreak: Story = {
  args: {
    currentStreak: 7,
    longestStreak: 14,
    isCheckedInToday: true
  }
};

export const AtRiskStreak: Story = {
  args: {
    currentStreak: 5,
    longestStreak: 10,
    isCheckedInToday: false
  }
};

export const PersonalBestTied: Story = {
  args: {
    currentStreak: 14,
    longestStreak: 14,
    isCheckedInToday: true
  }
};
