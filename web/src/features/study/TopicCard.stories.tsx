import type { Meta, StoryObj } from "@storybook/react";
import { TopicCard } from "./components/TopicCard";

const meta: Meta<typeof TopicCard> = {
  title: "StudyPlanner/TopicCard",
  component: TopicCard,
  tags: ["autodocs"],
  args: {
    id: "topic-1",
    subjectId: "subj-1",
    title: "Dynamic Programming & Knapsack Optimization",
    priority: "high",
    status: "in_progress",
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedMinutes: 90,
    onStatusChange: () => {},
    onEdit: () => {},
    onDelete: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof TopicCard>;

export const HighPriorityDueSoon: Story = {
  args: {
    title: "Memory Allocation & Paging Mechanics",
    priority: "high",
    status: "not_started",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedMinutes: 120
  }
};

export const InProgressMediumPriority: Story = {
  args: {
    title: "B-Trees & LSM-Tree Storage Engines",
    priority: "medium",
    status: "in_progress",
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedMinutes: 60
  }
};

export const CompletedLowPriority: Story = {
  args: {
    title: "Introduction to Complexity Classes (P vs NP)",
    priority: "low",
    status: "completed",
    deadline: null,
    estimatedMinutes: 45
  }
};

export const OverdueTopic: Story = {
  args: {
    title: "Spectroscopy Problem Set 4",
    priority: "high",
    status: "in_progress",
    deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedMinutes: 75
  }
};
