import type { Meta, StoryObj } from "@storybook/react";
import { SubjectCard } from "./components/SubjectCard";

const meta: Meta<typeof SubjectCard> = {
  title: "StudyPlanner/SubjectCard",
  component: SubjectCard,
  tags: ["autodocs"],
  args: {
    id: "subj-1",
    name: "Data Structures & Algorithms",
    color: "#0075de",
    examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    topicsCount: 10,
    completedTopicsCount: 4,
    dueFlashcardsCount: 5,
    isSelected: false,
    onSelect: () => {},
    onEdit: () => {},
    onDelete: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof SubjectCard>;

export const ComfortableDeadline: Story = {
  args: {
    name: "Advanced Operating Systems",
    color: "#0075de",
    examDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    topicsCount: 12,
    completedTopicsCount: 6,
    dueFlashcardsCount: 0
  }
};

export const DueSoon: Story = {
  args: {
    name: "Organic Chemistry Midterm",
    color: "#dd5b00",
    examDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    topicsCount: 8,
    completedTopicsCount: 3,
    dueFlashcardsCount: 12
  }
};

export const Overdue: Story = {
  args: {
    name: "Linear Algebra Final Exam",
    color: "#ff64c8",
    examDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    topicsCount: 15,
    completedTopicsCount: 14,
    dueFlashcardsCount: 2
  }
};

export const OngoingNoDeadline: Story = {
  args: {
    name: "Conversational Spanish",
    color: "#1aae39",
    examDate: null,
    topicsCount: 20,
    completedTopicsCount: 8,
    dueFlashcardsCount: 4
  }
};

export const SelectedState: Story = {
  args: {
    name: "Distributed Database Systems",
    color: "#d6b6f6",
    examDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    topicsCount: 6,
    completedTopicsCount: 5,
    dueFlashcardsCount: 1,
    isSelected: true
  }
};
