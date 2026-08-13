import type { Meta, StoryObj } from "@storybook/react";
import { BudgetProgressBar } from "./BudgetProgressBar";

const meta: Meta<typeof BudgetProgressBar> = {
  title: "Finance/BudgetProgressBar",
  component: BudgetProgressBar,
  tags: ["autodocs"],
  argTypes: {
    currentSpend: { control: { type: "number", min: 0, step: 10 } },
    limit: { control: { type: "number", min: 10, step: 50 } },
    category: { control: "text" },
    period: { control: "select", options: ["monthly"] },
    showLabels: { control: "boolean" }
  }
};

export default meta;
type Story = StoryObj<typeof BudgetProgressBar>;

export const UnderFiftyPercent: Story = {
  args: {
    category: "Groceries",
    limit: 500,
    currentSpend: 175.50,
    period: "monthly",
    showLabels: true
  }
};

export const ApproachingLimit: Story = {
  args: {
    category: "Dining & Entertainment",
    limit: 300,
    currentSpend: 255.00, // 85%
    period: "monthly",
    showLabels: true
  }
};

export const AtLimit: Story = {
  args: {
    category: "Transportation",
    limit: 200,
    currentSpend: 200.00, // 100%
    period: "monthly",
    showLabels: true
  }
};

export const OverLimit: Story = {
  args: {
    category: "Shopping",
    limit: 400,
    currentSpend: 545.80, // 136.45%
    period: "monthly",
    showLabels: true
  }
};
