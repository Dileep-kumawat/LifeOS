import type { Meta, StoryObj } from "@storybook/react";
import type { NoteSummary } from "./types";
import { NoteCard } from "./NoteCard";

function note(overrides: Partial<NoteSummary> = {}): NoteSummary {
  return {
    id: "note-1",
    title: "Grocery list",
    contentText: "Milk, eggs, bread, coffee beans, and a bottle of olive oil.",
    folderId: null,
    tags: [],
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-05T18:30:00.000Z",
    ...overrides
  };
}

const meta: Meta<typeof NoteCard> = {
  title: "Notes/NoteCard",
  component: NoteCard,
  tags: ["autodocs"],
  args: {
    note: note(),
    onSelect: () => {}
  }
};

export default meta;
type Story = StoryObj<typeof NoteCard>;

export const WithTagsAndFolder: Story = {
  args: {
    note: note({
      tags: ["home", "errands", "weekly"],
      folderId: "folder-1"
    }),
    folderName: "Personal"
  }
};

export const Untitled: Story = {
  args: {
    note: note({
      title: "",
      contentText: "Quick thought scribbled before it vanished."
    })
  }
};

export const LongContent: Story = {
  args: {
    note: note({
      title: "Meeting notes — Phase 1 launch retro",
      contentText:
        "Shipping the MVP was rough but worth it. Auth is done. Calendar conflicts were the hardest part. We agreed to gate Swagger docs behind an IP allowlist before production. Storybook is now part of CI so every new component must come with stories. Notes search works off a text index on title + contentText. Next sprint we tackle AI summaries in Phase 3. Remember to follow up with design about the empty states and ask engineering about the Chromatic publish step.",
      tags: ["work"]
    })
  }
};

export const Draggable: Story = {
  args: {
    note: note({ tags: ["todo"] }),
    draggable: true,
    onDragStart: (e) => e.dataTransfer.setData("application/x-note-id", "note-1"),
    onDelete: () => {}
  }
};
