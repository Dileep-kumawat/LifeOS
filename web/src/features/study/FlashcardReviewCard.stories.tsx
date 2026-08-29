import type { Meta, StoryObj } from "@storybook/react";
import { FlashcardReviewCard } from "./components/FlashcardReviewCard";

const meta: Meta<typeof FlashcardReviewCard> = {
  title: "StudyPlanner/FlashcardReviewCard",
  component: FlashcardReviewCard,
  tags: ["autodocs"],
  args: {
    id: "card-1",
    front: "What is the average time complexity of QuickSelect, and what causes the worst-case degradation?",
    back: "Average case: O(n).\nWorst case: O(n²) when bad pivots (e.g. smallest or largest element) are consistently selected in sorted arrays.",
    subjectName: "Algorithms",
    subjectColor: "#0075de",
    topicTitle: "Divide & Conquer",
    repetitions: 2,
    intervalDays: 6,
    easeFactor: 2.5,
    isRevealed: false,
    onReview: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof FlashcardReviewCard>;

export const FrontShown: Story = {
  args: {
    isRevealed: false
  }
};

export const BackRevealed: Story = {
  args: {
    isRevealed: true
  }
};

export const MathFormulas: Story = {
  args: {
    front: "State Bayes' Theorem formula for conditional probability.",
    back: "P(A|B) = [ P(B|A) * P(A) ] / P(B)\n\nWhere P(A|B) is the posterior probability given evidence B.",
    subjectName: "Probability & Statistics",
    subjectColor: "#1aae39",
    topicTitle: "Bayesian Inference",
    repetitions: 4,
    intervalDays: 24,
    easeFactor: 2.6,
    isRevealed: true
  }
};

export const NewCardFirstReview: Story = {
  args: {
    front: "What does ACID stand for in database transaction systems?",
    back: "Atomicity, Consistency, Isolation, Durability.",
    subjectName: "Databases",
    subjectColor: "#ff64c8",
    topicTitle: "Transaction Management",
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    isRevealed: false
  }
};
