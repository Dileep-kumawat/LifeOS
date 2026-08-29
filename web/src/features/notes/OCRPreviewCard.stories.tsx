import type { Meta, StoryObj } from "@storybook/react";
import { OCRPreviewCard } from "./OCRPreviewCard";
import type { OcrNoteDraft } from "@lifeos/shared";

const confidentDraft: OcrNoteDraft = {
  title: "Meeting Notes with Architecture Team",
  bodyText:
    "Meeting Notes with Architecture Team\nDiscussed unified OCR pipeline integration.\nEnsure all confidence scores are retained for review UI.\nDeploy server fallback queue via BullMQ.",
  proseMirrorDoc: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Meeting Notes with Architecture Team" }]
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Discussed unified OCR pipeline integration." }]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Ensure all confidence scores are retained for review UI."
          }
        ]
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Deploy server fallback queue via BullMQ." }]
      }
    ]
  },
  lines: [
    {
      text: "Meeting Notes with Architecture Team",
      confidence: 0.98,
      isLowConfidence: false
    },
    {
      text: "Discussed unified OCR pipeline integration.",
      confidence: 0.95,
      isLowConfidence: false
    },
    {
      text: "Ensure all confidence scores are retained for review UI.",
      confidence: 0.92,
      isLowConfidence: false
    },
    {
      text: "Deploy server fallback queue via BullMQ.",
      confidence: 0.89,
      isLowConfidence: false
    }
  ],
  overallConfidence: 0.94,
  source: "server_fallback"
};

const mixedConfidenceDraft: OcrNoteDraft = {
  title: "Whiteboard Sprint Planning Items",
  bodyText:
    "Whiteboard Sprint Planning Items\nItem 1: Implement mobile on-device ML Kit OCR\nItem 2: Fix blurry receipt tax extraction (confused with total?)\nItem 3: Sync conflicts resolution queue & SQLite tombstone cleanup",
  proseMirrorDoc: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Whiteboard Sprint Planning Items" }]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Item 1: Implement mobile on-device ML Kit OCR"
          }
        ]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Item 2: Fix blurry receipt tax extraction (confused with total?)"
          }
        ]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Item 3: Sync conflicts resolution queue & SQLite tombstone cleanup"
          }
        ]
      }
    ]
  },
  lines: [
    {
      text: "Whiteboard Sprint Planning Items",
      confidence: 0.94,
      isLowConfidence: false
    },
    {
      text: "Item 1: Implement mobile on-device ML Kit OCR",
      confidence: 0.88,
      isLowConfidence: false
    },
    {
      text: "Item 2: Fix blurry receipt tax extraction (confused with total?)",
      confidence: 0.45,
      isLowConfidence: true
    },
    {
      text: "Item 3: Sync conflicts resolution queue & SQLite tombstone cleanup",
      confidence: 0.58,
      isLowConfidence: true
    }
  ],
  overallConfidence: 0.71,
  source: "on_device"
};

const emptyDraft: OcrNoteDraft = {
  title: "Scanned note — 2026-08-27",
  bodyText: "",
  proseMirrorDoc: {
    type: "doc",
    content: [{ type: "paragraph" }]
  },
  lines: [],
  overallConfidence: 0.0,
  source: "on_device"
};

const meta: Meta<typeof OCRPreviewCard> = {
  title: "Notes/OCRPreviewCard",
  component: OCRPreviewCard,
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
type Story = StoryObj<typeof OCRPreviewCard>;

export const ConfidentText: Story = {
  args: {
    draft: confidentDraft
  }
};

export const LowConfidenceFlaggedRegions: Story = {
  args: {
    draft: mixedConfidenceDraft
  }
};

export const EmptyNoTextDetected: Story = {
  args: {
    draft: emptyDraft
  }
};
