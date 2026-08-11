import { useRef } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Image as ImageIcon,
  Undo2,
  Redo2
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { ProseMirrorDoc } from "./types";

export interface NoteEditorProps {
  content?: ProseMirrorDoc;
  onChange?: (content: ProseMirrorDoc) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function NoteEditor({
  content,
  onChange,
  readOnly = false,
  placeholder = "Start writing...",
  className
}: NoteEditorProps) {
  // Keep the latest callback/readOnly in refs so the (memoised) editor's
  // handlers never capture stale props across renders.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Image,
        Placeholder.configure({ placeholder })
      ],
      content,
      editable: !readOnly,
      editorProps: {
        handlePaste: (_view, event) => {
          const image = Array.from(event.clipboardData?.files ?? []).find((f) =>
            f.type.startsWith("image/")
          );
          if (!image) return false;
          void insertImageFile(image);
          return true;
        },
        handleDrop: (_view, event) => {
          const image = Array.from(event.dataTransfer?.files ?? []).find((f) =>
            f.type.startsWith("image/")
          );
          if (!image) return false;
          void insertImageFile(image);
          return true;
        }
      },
      onUpdate: ({ editor: e }) => {
        onChangeRef.current?.(e.getJSON() as ProseMirrorDoc);
      }
    },
    []
  );

  // Refresh the toolbar's active/availability states on every transaction.
  const toolbar = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h1: e.isActive("heading", { level: 1 }),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            task: e.isActive("taskList"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo()
          }
        : null
  });

  async function insertImageFile(file: File) {
    if (!editor) return;
    const dataUrl = await fileToDataUrl(file);
    editor.chain().focus().setImage({ src: dataUrl }).run();
  }

  function insertImageUrl() {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (url?.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
  }

  const toolbarItem =
    "inline-flex size-8 items-center justify-center rounded-md text-[#31302e] transition-colors hover:bg-[#f6f5f4]";

  const toolbarActive = `bg-[#f6f5f4] text-[#0075de]`;

  if (readOnly) {
    return (
      <div className={cn("notes-editor notes-render", className)}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className={cn("notes-editor flex flex-col gap-2", className)}>
      <div
        className="flex flex-wrap items-center gap-0.5 rounded-lg border border-[#e6e6e6] bg-white p-1.5"
        role="toolbar"
        aria-label="Formatting toolbar"
      >
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={toolbar?.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn(toolbarItem, toolbar?.bold && toolbarActive)}
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={toolbar?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={cn(toolbarItem, toolbar?.italic && toolbarActive)}
        >
          <Italic className="size-4" />
        </button>

        <span className="mx-1 size-px bg-[#e6e6e6]" aria-hidden="true" />

        <button
          type="button"
          aria-label="Heading 1"
          aria-pressed={toolbar?.h1}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(toolbarItem, toolbar?.h1 && toolbarActive)}
        >
          <Heading1 className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Heading 2"
          aria-pressed={toolbar?.h2}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(toolbarItem, toolbar?.h2 && toolbarActive)}
        >
          <Heading2 className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Heading 3"
          aria-pressed={toolbar?.h3}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(toolbarItem, toolbar?.h3 && toolbarActive)}
        >
          <Heading3 className="size-4" />
        </button>

        <span className="mx-1 size-px bg-[#e6e6e6]" aria-hidden="true" />

        <button
          type="button"
          aria-label="Bulleted list"
          aria-pressed={toolbar?.bullet}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={cn(toolbarItem, toolbar?.bullet && toolbarActive)}
        >
          <List className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          aria-pressed={toolbar?.ordered}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={cn(toolbarItem, toolbar?.ordered && toolbarActive)}
        >
          <ListOrdered className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Task list"
          aria-pressed={toolbar?.task}
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          className={cn(toolbarItem, toolbar?.task && toolbarActive)}
        >
          <ListChecks className="size-4" />
        </button>

        <span className="mx-1 size-px bg-[#e6e6e6]" aria-hidden="true" />

        <button
          type="button"
          aria-label="Insert image by URL"
          onClick={insertImageUrl}
          className={toolbarItem}
        >
          <ImageIcon className="size-4" />
        </button>

        <span className="mx-1 size-px bg-[#e6e6e6]" aria-hidden="true" />

        <button
          type="button"
          aria-label="Undo"
          aria-disabled={!toolbar?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
          className={cn(toolbarItem, !toolbar?.canUndo && "opacity-40")}
        >
          <Undo2 className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Redo"
          aria-disabled={!toolbar?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
          className={cn(toolbarItem, !toolbar?.canRedo && "opacity-40")}
        >
          <Redo2 className="size-4" />
        </button>
      </div>

      <EditorContent editor={editor} className="rounded-lg border border-[#e6e6e6] bg-white p-4" />
    </div>
  );
}
