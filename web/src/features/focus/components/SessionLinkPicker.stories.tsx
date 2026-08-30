import type { Meta, StoryObj } from "@storybook/react";
import { SessionLinkPicker, type LinkedItemOption } from "./SessionLinkPicker";

const meta: Meta<typeof SessionLinkPicker> = {
  title: "Features/Focus/SessionLinkPicker",
  component: SessionLinkPicker,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof SessionLinkPicker>;

const mockItems: LinkedItemOption[] = [
  {
    id: "topic-101",
    type: "topic",
    title: "Data Structures: Red-Black Trees & Binary Heaps",
    subtitle: "Priority: high • Status: in progress",
    color: "#0075de"
  },
  {
    id: "topic-102",
    type: "topic",
    title: "Database Systems: B-Tree Indexing & Query Optimizers",
    subtitle: "Priority: medium • Status: not started",
    color: "#0075de"
  },
  {
    id: "topic-103",
    type: "topic",
    title: "Distributed Systems: Raft Consensus Protocol",
    subtitle: "Priority: high • Status: completed",
    color: "#0075de"
  },
  {
    id: "goal-201",
    type: "goal",
    title: "Master Operating Systems & System Programming",
    subtitle: "Progress: 65%",
    color: "#2a9d99"
  },
  {
    id: "goal-202",
    type: "goal",
    title: "Launch LifeOS v1.0 Production Release",
    subtitle: "Progress: 80%",
    color: "#2a9d99"
  },
  {
    id: "task-301",
    type: "task",
    title: "Daily LeetCode Problem Practice",
    subtitle: "Habit Task • Target: 1/day",
    color: "#dd5b00"
  },
  {
    id: "task-302",
    type: "task",
    title: "Read 2 Research Papers on Distributed Systems",
    subtitle: "Habit Task • Target: 2/week",
    color: "#dd5b00"
  }
];

/**
 * 1. Topic Tab Selected: showing syllabus study topics to link
 */
export const TopicTabSelected: Story = {
  args: {
    selectedType: "topic",
    selectedId: null,
    initialItems: mockItems,
    onSelect: (type, id, title) => console.log("Selected:", { type, id, title }),
    onClose: () => console.log("Closed picker")
  }
};

/**
 * 2. Goal Tab Selected: showing strategic goals to link
 */
export const GoalTabSelected: Story = {
  args: {
    selectedType: "goal",
    selectedId: null,
    initialItems: mockItems,
    onSelect: (type, id, title) => console.log("Selected:", { type, id, title }),
    onClose: () => console.log("Closed picker")
  }
};

/**
 * 3. Habit Task Tab Selected: showing recurring tasks & habits
 */
export const TaskTabSelected: Story = {
  args: {
    selectedType: "task",
    selectedId: null,
    initialItems: mockItems,
    onSelect: (type, id, title) => console.log("Selected:", { type, id, title }),
    onClose: () => console.log("Closed picker")
  }
};

/**
 * 4. Standalone Unlinked Session: "None" active
 */
export const StandaloneUnlinked: Story = {
  args: {
    selectedType: "none",
    selectedId: null,
    initialItems: mockItems,
    onSelect: (type, id, title) => console.log("Selected:", { type, id, title }),
    onClose: () => console.log("Closed picker")
  }
};

/**
 * 5. Pre-selected Topic: checkmark indicator on active topic
 */
export const WithPreSelectedTopic: Story = {
  args: {
    selectedType: "topic",
    selectedId: "topic-101",
    initialItems: mockItems,
    onSelect: (type, id, title) => console.log("Selected:", { type, id, title }),
    onClose: () => console.log("Closed picker")
  }
};

/**
 * 6. Empty State: no items available in current category
 */
export const EmptyState: Story = {
  args: {
    selectedType: "topic",
    selectedId: null,
    initialItems: [],
    onSelect: (type, id, title) => console.log("Selected:", { type, id, title }),
    onClose: () => console.log("Closed picker")
  }
};
