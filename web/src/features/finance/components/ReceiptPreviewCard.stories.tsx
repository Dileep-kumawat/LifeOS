import type { Meta, StoryObj } from "@storybook/react";
import { ReceiptPreviewCard } from "./ReceiptPreviewCard";
import type { ParsedReceiptResult } from "@lifeos/shared";

const confidentReceipt: ParsedReceiptResult = {
  merchant: {
    value: "WALMART SUPERCENTER #3245",
    confidence: 0.95,
    isLowConfidence: false,
    rawText: "WALMART SUPERCENTER #3245"
  },
  amount: {
    value: 41.09,
    confidence: 0.96,
    isLowConfidence: false,
    rawText: "TOTAL AMOUNT DUE $41.09"
  },
  date: {
    value: "2026-08-28",
    confidence: 0.91,
    isLowConfidence: false,
    rawText: "08/28/2026 14:22"
  },
  category: {
    value: "Shopping",
    confidence: 0.88,
    isLowConfidence: false,
    rawText: "WALMART SUPERCENTER"
  },
  lineItems: [
    { description: "ORGANIC MILK", amount: 4.99 },
    { description: "WHEAT BREAD", amount: 3.49 },
    { description: "APPLES 3LB", amount: 5.99 },
    { description: "CHICKEN BREAST", amount: 14.50 },
    { description: "HOUSEHOLD CLEANER", amount: 8.99 }
  ],
  overallConfidence: 0.93,
  source: "server_fallback",
  rawText: "WALMART SUPERCENTER #3245\n08/28/2026 14:22\nORGANIC MILK 4.99\nWHEAT BREAD 3.49\nAPPLES 3LB 5.99\nCHICKEN BREAST 14.50\nHOUSEHOLD CLEANER 8.99\nSUBTOTAL 37.96\nSALES TAX 3.13\nTOTAL AMOUNT DUE $41.09"
};

const lowConfidenceReceipt: ParsedReceiptResult = {
  merchant: {
    value: "CORNER CAFE & GRILL",
    confidence: 0.72,
    isLowConfidence: false,
    rawText: "CORNER CAFE & GRILL"
  },
  amount: {
    value: 28.50,
    confidence: 0.55,
    isLowConfidence: true,
    rawText: "Blurry total figure: 28.50"
  },
  date: {
    value: null,
    confidence: 0.0,
    isLowConfidence: true
  },
  category: {
    value: "Food",
    confidence: 0.75,
    isLowConfidence: false,
    rawText: "CORNER CAFE"
  },
  lineItems: [],
  overallConfidence: 0.51,
  source: "on_device",
  rawText: "CORNER CAFE & GRILL\nBlurry line items...\nBlurry total figure: 28.50\nCash paid"
};

const missingFieldsReceipt: ParsedReceiptResult = {
  merchant: {
    value: "",
    confidence: 0.0,
    isLowConfidence: true
  },
  amount: {
    value: null,
    confidence: 0.0,
    isLowConfidence: true
  },
  date: {
    value: null,
    confidence: 0.0,
    isLowConfidence: true
  },
  overallConfidence: 0.0,
  source: "on_device",
  rawText: ""
};

const meta: Meta<typeof ReceiptPreviewCard> = {
  title: "Finance/ReceiptPreviewCard",
  component: ReceiptPreviewCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-xl p-4 bg-[#f6f5f4]">
        <Story />
      </div>
    )
  ]
};

export default meta;
type Story = StoryObj<typeof ReceiptPreviewCard>;

export const ConfidentReceipt: Story = {
  args: {
    parsedReceipt: confidentReceipt
  }
};

export const LowConfidenceHighlightedFields: Story = {
  args: {
    parsedReceipt: lowConfidenceReceipt
  }
};

export const EmptyNoDataDetected: Story = {
  args: {
    parsedReceipt: missingFieldsReceipt
  }
};
