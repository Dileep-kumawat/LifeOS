import type { Meta, StoryObj } from "@storybook/react";
import { CategoryBreakdownChart } from "./CategoryBreakdownChart";

const meta: Meta<typeof CategoryBreakdownChart> = {
  title: "Finance/CategoryBreakdownChart",
  component: CategoryBreakdownChart,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof CategoryBreakdownChart>;

export const Populated: Story = {
  args: {
    title: "August 2026 Expense Breakdown",
    data: [
      { category: "Groceries", type: "expense", totalAmount: 450, count: 12 },
      { category: "Dining Out", type: "expense", totalAmount: 280, count: 8 },
      { category: "Rent & Housing", type: "expense", totalAmount: 1200, count: 1 },
      { category: "Utilities", type: "expense", totalAmount: 150, count: 3 },
      { category: "Entertainment", type: "expense", totalAmount: 95, count: 4 }
    ]
  }
};

export const EmptyNoData: Story = {
  args: {
    title: "Category Breakdown",
    data: []
  }
};
