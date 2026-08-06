import type { Meta, StoryObj } from "@storybook/react";
import type { JSONContent } from "@tiptap/core";
import type { ProseMirrorDoc } from "./types";
import { NoteEditor } from "./NoteEditor";

function doc(content: JSONContent[]): ProseMirrorDoc {
  return { type: "doc", content };
}

const populated = doc([
  {
    type: "heading",
    attrs: { level: 2 },
    content: [{ type: "text", text: "Shopping" }]
  },
  {
    type: "paragraph",
    content: [{ type: "text", text: "Milk, eggs, bread, and coffee beans." }]
  },
  {
    type: "taskList",
    content: [
      {
        type: "taskItem",
        attrs: { checked: false },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Buy olive oil" }]
          }
        ]
      },
      {
        type: "taskItem",
        attrs: { checked: true },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Order cat food" }]
          }
        ]
      }
    ]
  }
]);

const meta: Meta<typeof NoteEditor> = {
  title: "Notes/NoteEditor",
  component: NoteEditor,
  tags: ["autodocs"],
  parameters: {
    // TipTap spins up browser-DOM editing state that is not reproducible for
    // snapshotting — skip visual snapshots for these stories.
    chromatic: { disableSnapshot: true }
  },
  render: (args) => <NoteEditor {...args} key={JSON.stringify(args.content)} />
};

export default meta;
type Story = StoryObj<typeof NoteEditor>;

export const Empty: Story = {
  args: {
    placeholder: "Start writing..."
  }
};

export const Populated: Story = {
  args: {
    content: populated
  }
};

export const ReadOnly: Story = {
  args: {
    content: populated,
    readOnly: true,
    className: "max-w-2xl"
  }
};
