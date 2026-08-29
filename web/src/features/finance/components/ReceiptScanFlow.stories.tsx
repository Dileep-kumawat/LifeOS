import type { Meta, StoryObj } from "@storybook/react";
import { ReceiptScanModal } from "./ReceiptScanModal";
import type { Category } from "../types";
import type { ParsedReceiptResult } from "@lifeos/shared";

const mockCategories: Category[] = [
  { id: "c1", name: "Food", type: "expense", createdAt: "" },
  { id: "c2", name: "Transport", type: "expense", createdAt: "" },
  { id: "c3", name: "Shopping", type: "expense", createdAt: "" },
  { id: "c4", name: "Utilities", type: "expense", createdAt: "" },
  { id: "c5", name: "Entertainment", type: "expense", createdAt: "" },
  { id: "c6", name: "Health", type: "expense", createdAt: "" }
];

const sampleParsedReceipt: ParsedReceiptResult = {
  merchant: {
    value: "STARBUCKS COFFEE #1042",
    confidence: 0.94,
    isLowConfidence: false,
    rawText: "STARBUCKS COFFEE #1042"
  },
  amount: {
    value: 12.50,
    confidence: 0.96,
    isLowConfidence: false,
    rawText: "TOTAL: $12.50"
  },
  date: {
    value: "2026-08-27",
    confidence: 0.92,
    isLowConfidence: false,
    rawText: "Date: 2026-08-27"
  },
  category: {
    value: "Food",
    confidence: 0.88,
    isLowConfidence: false,
    rawText: "STARBUCKS COFFEE"
  },
  lineItems: [
    { description: "1 Caffe Latte", amount: 4.75, confidence: 0.9 },
    { description: "1 Croissant", amount: 4.25, confidence: 0.9 },
    { description: "1 Bottled Water", amount: 2.50, confidence: 0.9 }
  ],
  overallConfidence: 0.94,
  source: "server_fallback",
  rawText: `STARBUCKS COFFEE #1042\n123 Market Street, San Francisco, CA\nDate: 2026-08-27\n1 Caffe Latte 4.75\n1 Croissant 4.25\n1 Bottled Water 2.50\nSubtotal: $11.50\nTax: $1.00\nTOTAL: $12.50`
};

const meta: Meta<typeof ReceiptScanModal> = {
  title: "Finance/ReceiptScanFlow",
  component: ReceiptScanModal,
  tags: ["autodocs"],
  args: {
    open: true,
    onClose: () => {},
    categories: mockCategories,
    onConfirmTransaction: async () => {},
    onOpenBlankForm: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof ReceiptScanModal>;

export const ScanningState: Story = {
  args: {
    forcedState: "scanning"
  }
};

export const ProcessingState: Story = {
  args: {
    forcedState: "processing"
  }
};

export const ReviewState: Story = {
  args: {
    forcedState: "review",
    mockParsedReceipt: sampleParsedReceipt
  }
};

export const ErrorState: Story = {
  args: {
    forcedState: "error"
  }
};
