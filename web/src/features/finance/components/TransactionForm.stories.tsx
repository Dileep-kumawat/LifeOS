import type { Meta, StoryObj } from "@storybook/react";
import { TransactionForm } from "./TransactionForm";
import type { Category, Transaction } from "../types";

const mockCategories: Category[] = [
  { id: "c-1", name: "Food", type: "expense" },
  { id: "c-2", name: "Transport", type: "expense" },
  { id: "c-3", name: "Housing", type: "expense" },
  { id: "c-4", name: "Entertainment", type: "expense" },
  { id: "c-5", name: "Utilities", type: "expense" },
  { id: "c-6", name: "Salary", type: "income" },
  { id: "c-7", name: "Freelance", type: "income" },
  { id: "c-8", name: "Other", type: "expense" }
];

const mockEditTransaction: Transaction = {
  id: "t-201",
  userId: "u-1",
  amount: 250.0,
  type: "expense",
  category: "Entertainment",
  date: "2026-08-10T12:00:00.000Z",
  note: "Concert tickets",
  receiptAttachment: null,
  createdAt: "2026-08-10T12:00:00.000Z",
  updatedAt: "2026-08-10T12:00:00.000Z"
};

const meta: Meta<typeof TransactionForm> = {
  title: "Finance/TransactionForm",
  component: TransactionForm,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof TransactionForm>;

export const CreateMode: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Close"),
    onSubmit: async (data) => console.log("Submit", data),
    categories: mockCategories,
    initialData: null,
    onAddCategory: async (name, type) => {
      console.log("Add inline category", name, type);
      return name;
    }
  }
};

export const EditMode: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Close"),
    onSubmit: async (data) => console.log("Submit", data),
    categories: mockCategories,
    initialData: mockEditTransaction,
    onAddCategory: async (name, type) => {
      console.log("Add inline category", name, type);
      return name;
    }
  }
};

export const PrefilledFromOCR: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Close"),
    onSubmit: async (data) => console.log("Submit", data),
    categories: mockCategories,
    initialData: null,
    prefillData: {
      amount: 41.09,
      type: "expense",
      category: "Shopping",
      date: new Date("2026-08-28"),
      note: "WALMART SUPERCENTER #3245"
    },
    fieldConfidence: {
      merchant: { confidence: 0.95, isLowConfidence: false },
      amount: { confidence: 0.96, isLowConfidence: false },
      date: { confidence: 0.91, isLowConfidence: false }
    },
    onAddCategory: async (name, type) => {
      console.log("Add inline category", name, type);
      return name;
    }
  }
};

export const PrefilledWithLowConfidenceWarnings: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Close"),
    onSubmit: async (data) => console.log("Submit", data),
    categories: mockCategories,
    initialData: null,
    prefillData: {
      amount: 28.50,
      type: "expense",
      category: "Food",
      date: new Date("2026-08-27"),
      note: "CORNER CAFE & GRILL"
    },
    fieldConfidence: {
      merchant: { confidence: 0.72, isLowConfidence: false },
      amount: { confidence: 0.55, isLowConfidence: true },
      date: { confidence: 0.40, isLowConfidence: true }
    },
    onAddCategory: async (name, type) => {
      console.log("Add inline category", name, type);
      return name;
    }
  }
};

