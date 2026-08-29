import type { Meta, StoryObj } from "@storybook/react";
import { NotesScanModal } from "./NotesScanModal";
import type { OcrNoteDraft } from "@lifeos/shared";
import type { NoteFolder } from "./types";

const mockFolders: NoteFolder[] = [
  { id: "f1", name: "Work", parentFolderId: null, createdAt: "", updatedAt: "" },
  { id: "f2", name: "Personal", parentFolderId: null, createdAt: "", updatedAt: "" },
  { id: "f3", name: "Ideas & Architecture", parentFolderId: null, createdAt: "", updatedAt: "" }
];

const mockTags = ["work", "architecture", "sprint", "meeting", "ocr"];

const sampleDraft: OcrNoteDraft = {
  title: "Sprint Retrospective Notes",
  bodyText:
    "Sprint Retrospective Notes\nWhat went well: Unified OCR pipeline works across Web and Mobile.\nWhat needs improvement: Mobile ML Kit fallback confidence tuning.\nAction items: Ship Notes OCR integration to production.",
  proseMirrorDoc: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Sprint Retrospective Notes" }]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "What went well: Unified OCR pipeline works across Web and Mobile."
          }
        ]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "What needs improvement: Mobile ML Kit fallback confidence tuning."
          }
        ]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Action items: Ship Notes OCR integration to production."
          }
        ]
      }
    ]
  },
  lines: [
    { text: "Sprint Retrospective Notes", confidence: 0.96, isLowConfidence: false },
    {
      text: "What went well: Unified OCR pipeline works across Web and Mobile.",
      confidence: 0.94,
      isLowConfidence: false
    },
    {
      text: "What needs improvement: Mobile ML Kit fallback confidence tuning.",
      confidence: 0.52,
      isLowConfidence: true
    },
    {
      text: "Action items: Ship Notes OCR integration to production.",
      confidence: 0.91,
      isLowConfidence: false
    }
  ],
  overallConfidence: 0.83,
  source: "server_fallback"
};

const meta: Meta<typeof NotesScanModal> = {
  title: "Notes/NotesScanModal",
  component: NotesScanModal,
  tags: ["autodocs"],
  args: {
    open: true,
    onClose: () => {},
    folders: mockFolders,
    allTags: mockTags,
    onSaveNote: async () => {},
    onOpenBlankNote: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof NotesScanModal>;

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
    mockDraft: sampleDraft
  }
};

export const ErrorState: Story = {
  args: {
    forcedState: "error"
  }
};
