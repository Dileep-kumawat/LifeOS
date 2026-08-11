import { useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../../components/ui/Dialog";
import { Button } from "../../components/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import type { NoteFolder } from "./types";

export interface FolderManagerProps {
  open: boolean;
  mode: "create" | "rename";
  initialName?: string;
  initialParentFolderId?: string | null;
  folders?: NoteFolder[];
  onClose: () => void;
  onSubmit: (data: { name: string; parentFolderId: string | null }) => void;
  isSubmitting?: boolean;
}

export function FolderManager({
  open,
  mode,
  initialName = "",
  initialParentFolderId = null,
  folders = [],
  onClose,
  onSubmit,
  isSubmitting = false
}: FolderManagerProps) {
  const [name, setName] = useState(initialName);
  const [parentFolderId, setParentFolderId] = useState<string>(initialParentFolderId ?? "");

  if (!open) return null;

  const isCreate = mode === "create";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({
      name: trimmed,
      parentFolderId: isCreate ? parentFolderId || null : null
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogHeader>
        <DialogTitle>{isCreate ? "New folder" : "Rename folder"}</DialogTitle>
        <DialogDescription>
          {isCreate
            ? "Folders can be nested up to 5 levels deep."
            : "Rename this folder. Moving it is done by dragging notes in the sidebar."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isCreate && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-parent">Parent folder</Label>
            <select
              id="folder-parent"
              value={parentFolderId}
              onChange={(e) => setParentFolderId(e.target.value)}
              className="h-10 w-full rounded-md border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de]"
            >
              <option value="">Root (top level)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="folder-name">Name</Label>
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Projects"
            autoFocus
            maxLength={200}
            aria-label="Folder name"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()} isLoading={isSubmitting}>
            {isCreate ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
