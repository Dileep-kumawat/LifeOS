import { Folder, FolderOpen } from "lucide-react";
import type { NoteFolder } from "./types";

export interface FolderPickerProps {
  folders: NoteFolder[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  disabled?: boolean;
}

export function FolderPicker({ folders, value, onChange, disabled }: FolderPickerProps) {
  const current = folders.find((f) => f.id === value);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#615d59]">Folder</span>
      <label className="flex items-center gap-2 rounded-md border border-[#e6e6e6] bg-white px-2.5 py-2 text-sm focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#0075de]">
        {value ? (
          <FolderOpen className="size-4 shrink-0 text-[#0075de]" aria-hidden="true" />
        ) : (
          <Folder className="size-4 shrink-0 text-[#a39e98]" aria-hidden="true" />
        )}
        <select
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          aria-label="Move note to folder"
          className="w-full bg-transparent text-sm text-[#000000] focus:outline-none disabled:opacity-50"
        >
          <option value="">No folder (root)</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[11px] text-[#615d59]">
        {current ? `In “${current.name}”` : "Stored at root level"}
      </p>
    </div>
  );
}