import type { Meta, StoryObj } from "@storybook/react";
import type { NoteFolder } from "./types";
import { FolderTree } from "./FolderTree";

function folder(overrides: Partial<NoteFolder>): NoteFolder {
  return {
    id: "folder-1",
    name: "Folder",
    parentFolderId: null,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
    ...overrides
  };
}

const noop = {
  onSelectFolder: () => {},
  onNewFolder: () => {},
  onRenameFolder: () => {},
  onDeleteFolder: () => {}
};

const meta: Meta<typeof FolderTree> = {
  title: "Notes/FolderTree",
  component: FolderTree,
  tags: ["autodocs"],
  args: noop
};

export default meta;
type Story = StoryObj<typeof FolderTree>;

export const EmptyTree: Story = {
  args: {
    folders: [],
    rootCount: 0
  }
};

export const FlatFolders: Story = {
  args: {
    folders: [
      folder({ id: "f1", name: "Work" }),
      folder({ id: "f2", name: "Personal" }),
      folder({ id: "f3", name: "Finance" })
    ],
    activeFolderId: "f1",
    rootCount: 3,
    noteCounts: { f1: 4, f2: 2, f3: 0 }
  }
};

export const NestedFolders: Story = {
  args: {
    folders: [
      folder({ id: "root1", name: "Projects" }),
      folder({ id: "sub1", name: "LifeOS", parentFolderId: "root1" }),
      folder({ id: "sub2", name: "Website", parentFolderId: "root1" }),
      folder({ id: "deep", name: "Phase 1", parentFolderId: "sub1" }),
      folder({ id: "root2", name: "Inbox" })
    ],
    activeFolderId: "deep",
    rootCount: 1,
    noteCounts: { root1: 6, sub1: 3, sub2: 1, deep: 2, root2: 5 }
  }
};
