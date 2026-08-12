import type { Meta, StoryObj } from "@storybook/react";
import { TransactionRow } from "./TransactionRow";
import type { Transaction } from "../types";

const mockIncomeTransaction: Transaction = {
  id: "t-101",
  userId: "u-1",
  amount: 4500.0,
  type: "income",
  category: "Salary",
  date: "2026-08-01T10:00:00.000Z",
  note: "Monthly tech lead paycheck",
  receiptAttachment: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z"
};

const mockExpenseTransaction: Transaction = {
  id: "t-102",
  userId: "u-1",
  amount: 142.85,
  type: "expense",
  category: "Food",
  date: "2026-08-12T14:30:00.000Z",
  note: "Weekly Trader Joe's groceries",
  receiptAttachment: null,
  createdAt: "2026-08-12T14:30:00.000Z",
  updatedAt: "2026-08-12T14:30:00.000Z"
};

const mockExpenseNoNote: Transaction = {
  id: "t-103",
  userId: "u-1",
  amount: 85.0,
  type: "expense",
  category: "Transport",
  date: "2026-08-11T09:15:00.000Z",
  note: "",
  receiptAttachment: null,
  createdAt: "2026-08-11T09:15:00.000Z",
  updatedAt: "2026-08-11T09:15:00.000Z"
};

const meta: Meta<typeof TransactionRow> = {
  title: "Finance/TransactionRow",
  component: TransactionRow,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof TransactionRow>;

export const IncomeVariant: Story = {
  args: {
    transaction: mockIncomeTransaction,
    onEdit: (t) => console.log("Edit", t),
    onDelete: (t) => console.log("Delete", t)
  }
};

export const ExpenseVariant: Story = {
  args: {
    transaction: mockExpenseTransaction,
    onEdit: (t) => console.log("Edit", t),
    onDelete: (t) => console.log("Delete", t)
  }
};

export const WithoutNote: Story = {
  args: {
    transaction: mockExpenseNoNote,
    onEdit: (t) => console.log("Edit", t),
    onDelete: (t) => console.log("Delete", t)
  }
};

export const HousingCategory: Story = {
  args: {
    transaction: {
      ...mockExpenseTransaction,
      id: "t-104",
      amount: 1850.0,
      category: "Housing",
      note: "Monthly apartment rent"
    }
  }
};

export const UtilitiesCategory: Story = {
  args: {
    transaction: {
      ...mockExpenseTransaction,
      id: "t-105",
      amount: 120.5,
      category: "Utilities",
      note: "Electricity & Internet bill"
    }
  }
};
