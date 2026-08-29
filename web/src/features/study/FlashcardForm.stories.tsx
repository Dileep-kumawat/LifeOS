import type { Meta, StoryObj } from "@storybook/react";
import { FlashcardForm } from "./components/FlashcardForm";

const meta: Meta<typeof FlashcardForm> = {
  title: "StudyPlanner/FlashcardForm",
  component: FlashcardForm,
  tags: ["autodocs"],
  args: {
    subjects: [
      { id: "subj-1", name: "Computer Systems" },
      { id: "subj-2", name: "Organic Chemistry" },
      { id: "subj-3", name: "Linear Algebra" }
    ],
    topics: [
      { id: "top-1", title: "Virtual Memory & Translation Lookaside Buffers", subjectId: "subj-1" },
      { id: "top-2", title: "Cache Coherence Protocols (MESI)", subjectId: "subj-1" },
      { id: "top-3", title: "Reaction Mechanisms", subjectId: "subj-2" }
    ],
    onSubmit: async () => {},
    onCancel: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof FlashcardForm>;

export const Blank: Story = {
  args: {}
};

export const PreFilledEdit: Story = {
  args: {
    initialData: {
      id: "card-123",
      front: "What is the function of the Translation Lookaside Buffer (TLB)?",
      back: "A high-speed hardware cache storing recent virtual-to-physical address translations to accelerate page table lookups.",
      subjectId: "subj-1",
      topicId: "top-1"
    },
    submitLabel: "Update Flashcard"
  }
};

export const PreSelectedTopic: Story = {
  args: {
    defaultSubjectId: "subj-1",
    defaultTopicId: "top-2"
  }
};
