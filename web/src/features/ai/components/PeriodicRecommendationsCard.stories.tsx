import type { Meta, StoryObj } from "@storybook/react";
import { PeriodicRecommendationsCard } from "./PeriodicRecommendationsCard";

const meta: Meta<typeof PeriodicRecommendationsCard> = {
  title: "Features/AI/PeriodicRecommendationsCard",
  component: PeriodicRecommendationsCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded"
  }
};

export default meta;
type Story = StoryObj<typeof PeriodicRecommendationsCard>;

export const WeeklyPopulated: Story = {
  args: {
    isLoading: false,
    isError: false,
    generated: true,
    period: "weekly",
    recommendation: {
      id: "rec-story-1",
      userId: "user-123",
      period: "weekly",
      periodStart: "2026-08-24",
      periodEnd: "2026-08-30",
      recommendations: [
        {
          id: "rec-1",
          domain: "finance",
          title: "Rebalance Dining Out Spending",
          category: "Dining Out",
          message: "Dining Out spending reached $280 this week, trending over your monthly category allocation.",
          actionableStep: "Set an 80% category alert threshold and substitute 2 restaurant dinners with meal prep.",
          metricGrounded: "$280 spent / $250 limit (112%)",
          impact: "high"
        },
        {
          id: "rec-2",
          domain: "habits",
          title: "Strengthen Weekend Habit Consistency",
          category: "Morning 30-min run",
          message: "Habit check-in rate dropped to 40% on weekends compared to 90% weekday consistency.",
          actionableStep: "Set a lighter 15-minute weekend jogging target to protect your 5-day habit streak.",
          metricGrounded: "40% weekend completion rate",
          impact: "medium"
        },
        {
          id: "rec-3",
          domain: "productivity",
          title: "Maintain Deep Work Cadence",
          category: "Focus",
          message: "You accumulated 150 minutes across 5 completed focus timer sessions with 0 abandons.",
          actionableStep: "Schedule 2 morning 25-minute Pomodoro blocks for your core syllabus topic.",
          metricGrounded: "150 focus mins (5 sessions)",
          impact: "low"
        }
      ],
      generatedAt: "2026-08-31T08:00:00.000Z"
    }
  }
};

export const MonthlyPopulated: Story = {
  args: {
    isLoading: false,
    isError: false,
    generated: true,
    period: "monthly",
    recommendation: {
      id: "rec-story-2",
      userId: "user-123",
      period: "monthly",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      recommendations: [
        {
          id: "rec-m-1",
          domain: "finance",
          title: "Optimize Subscription Outflows",
          category: "Subscriptions",
          message: "Software subscriptions increased 18% month-over-month totaling $145.",
          actionableStep: "Review active SaaS recurring charges and cancel unused tool tiers.",
          metricGrounded: "$145 / month (+18% vs July)",
          impact: "high"
        },
        {
          id: "rec-m-2",
          domain: "habits",
          title: "Reading Habit Milestone",
          category: "Evening Reading",
          message: "You achieved an 88% completion rate for evening reading across all 31 days.",
          actionableStep: "Consider increasing your daily reading goal from 20 to 30 minutes.",
          metricGrounded: "27/31 completed days (88%)",
          impact: "medium"
        }
      ],
      generatedAt: "2026-09-01T08:00:00.000Z"
    }
  }
};

export const ScheduledNotYetGenerated: Story = {
  args: {
    isLoading: false,
    isError: false,
    generated: false,
    period: "weekly",
    recommendation: null
  }
};

export const Loading: Story = {
  args: {
    isLoading: true
  }
};

export const ErrorWithRetry: Story = {
  args: {
    isLoading: false,
    isError: true,
    period: "weekly",
    onRetry: () => console.log("Retry clicked")
  }
};
