import type { Meta, StoryObj } from "@storybook/react";
import { InsightsCard } from "./InsightsCard";

const meta: Meta<typeof InsightsCard> = {
  title: "Finance/InsightsCard",
  component: InsightsCard,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof InsightsCard>;

export const InitialState: Story = {
  args: {}
};

export const LoadingState: Story = {
  args: {
    initialLoading: true
  }
};

export const PopulatedState: Story = {
  args: {
    initialData: {
      insights: `Here are your financial insights for August 2026:

1. **Dining Out Alert**: You spent ₹280 on Dining Out this month, which exceeds your ₹250 monthly budget by 12%. Consider cooking 2 additional meals at home next week to bring your food expenses back on track.
2. **Groceries Efficiency**: Groceries total ₹450 against your ₹500 budget (90% utilized). Excellent management!
3. **Savings Potential**: Your total net balance is +₹1,650 this month (+47% savings rate). Consider allocating ₹500 toward your emergency fund goal.`,
      providerServed: "mistral",
      fallbackOccurred: false
    }
  }
};

export const RetryingWithBackupModel: Story = {
  args: {
    initialData: {
      insights: `Retried via backup provider:
Based on your logged data, dining out spending (₹280) is your highest discretionary category. We recommend setting a weekly limit of ₹65 for restaurants.`,
      providerServed: "groq",
      fallbackOccurred: true
    },
    initialRetrying: true
  }
};

export const ErrorState: Story = {
  args: {
    initialError: "AI service is currently unavailable. Please try again shortly."
  }
};
