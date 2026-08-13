import type { Meta, StoryObj } from "@storybook/react";
import { BudgetForm } from "./BudgetForm";
import type { Category } from "../types";

const mockCategories: Category[] = [
  { id: "1", name: "Food", type: "expense" },
  { id: "2", name: "Transport", type: "expense" },
  { id: "3", name: "Entertainment", type: "expense" },
  { id: "4", name: "Housing", type: "expense" }
];

const meta: Meta<typeof BudgetForm> = {
  title: "Finance/BudgetForm",
  component: BudgetForm,
  tags: ["autodocs"],
  argTypes: {
    onSubmit: { action: "submitted" },
    onCancel: { action: "cancelled" }
  }
};

export default meta;
type Story = StoryObj<typeof BudgetForm>;

export const CreateBudget: Story = {
  args: {
    categories: mockCategories,
    errorMessage: null,
    isSubmitting: false
  }
};

export const EditBudget: Story = {
  args: {
    categories: mockCategories,
    initialValues: {
      id: "b1",
      category: "Food",
      limit: 450,
      period: "monthly"
    },
    errorMessage: null,
    isSubmitting: false
  }
};

export const DuplicateCategoryError: Story = {
  args: {
    categories: mockCategories,
    errorMessage: 'A monthly budget for category "Food" already exists',
    isSubmitting: false
  }
};
