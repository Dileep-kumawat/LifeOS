import type { Meta, StoryObj } from "@storybook/react";
import { StudyPlanCard } from "./StudyPlanCard";

const meta: Meta<typeof StudyPlanCard> = {
  title: "Features/Study/StudyPlanCard",
  component: StudyPlanCard,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof StudyPlanCard>;

const mockSessions = [
  {
    topicId: "t-1",
    topicTitle: "Data Structures: Red-Black Trees & Binary Heaps",
    startTime: "2026-08-30T09:00:00.000Z",
    endTime: "2026-08-30T10:00:00.000Z",
    durationMinutes: 60,
    reasoning: "High priority topic due tomorrow; allocated in morning 2-hour free block"
  },
  {
    topicId: "t-2",
    topicTitle: "Database Systems: B-Tree Indexing & Query Optimizers",
    startTime: "2026-08-30T10:15:00.000Z",
    endTime: "2026-08-30T11:00:00.000Z",
    durationMinutes: 45,
    reasoning: "Urgent exam topic scheduled with 15-minute rest interval"
  },
  {
    topicId: "t-3",
    topicTitle: "Distributed Systems: Raft Consensus Protocol",
    startTime: "2026-08-30T14:30:00.000Z",
    endTime: "2026-08-30T16:00:00.000Z",
    durationMinutes: 90,
    reasoning: "Deep study block allocated in afternoon free gap"
  }
];

export const ProposedState: Story = {
  args: {
    targetDate: "2026-08-30",
    sessions: mockSessions,
    totalStudyMinutes: 195,
    status: "pending",
    onConfirm: () => alert("Confirmed plan!"),
    onCancel: () => alert("Cancelled plan!")
  }
};

export const ExecutingState: Story = {
  args: {
    targetDate: "2026-08-30",
    sessions: mockSessions,
    totalStudyMinutes: 195,
    status: "pending",
    isExecuting: true
  }
};

export const ExecutedState: Story = {
  args: {
    targetDate: "2026-08-30",
    sessions: mockSessions,
    totalStudyMinutes: 195,
    status: "executed"
  }
};

export const CancelledState: Story = {
  args: {
    targetDate: "2026-08-30",
    sessions: mockSessions,
    totalStudyMinutes: 195,
    status: "cancelled"
  }
};
