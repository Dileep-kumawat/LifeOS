import React, { useState, useRef } from "react";
import {
  Upload,
  Camera,
  Loader2,
  AlertTriangle,
  FilePlus,
  RefreshCw,
  Folder,
  Tag as TagIcon
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/Dialog";
import { Button } from "../../components/Button";
import { OCRPreviewCard } from "./OCRPreviewCard";
import { FolderPicker } from "./FolderPicker";
import { TagInput } from "./TagInput";
import { ocrApi } from "./ocrApi";
import { convertOcrToNoteDraft, convertTextToProseMirrorDocument, type OcrNoteDraft } from "@lifeos/shared";
import type { NoteFolder } from "./types";

export type ScanFlowState = "scanning" | "processing" | "review" | "error";

export interface NotesScanModalProps {
  open: boolean;
  onClose: () => void;
  folders: NoteFolder[];
  allTags?: string[];
  initialFolderId?: string | null;
  onSaveNote: (noteData: {
    title: string;
    content: ReturnType<typeof convertTextToProseMirrorDocument>;
    folderId: string | null;
    tags: string[];
  }) => Promise<void>;
  onOpenBlankNote?: () => void;
  // Optional controlled state for Storybook stories
  forcedState?: ScanFlowState;
  mockDraft?: OcrNoteDraft;
}

export function NotesScanModal({
  open,
  onClose,
  folders,
  allTags = [],
  initialFolderId = null,
  onSaveNote,
  onOpenBlankNote,
  forcedState,
  mockDraft
}: NotesScanModalProps) {
  const [internalState, setInternalState] = useState<ScanFlowState>("scanning");
  const currentState = forcedState || internalState;

  const [draft, setDraft] = useState<OcrNoteDraft | null>(mockDraft || null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);
  const [tags, setTags] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setInternalState("scanning");
    setDraft(null);
    setSelectedFolderId(initialFolderId);
    setTags([]);
    setErrorMessage(null);
    setIsSaving(false);
    setIsDragOver(false);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPEG, PNG, WebP).");
      setInternalState("error");
      return;
    }

    try {
      setInternalState("processing");
      setErrorMessage(null);

      const ocrResult = await ocrApi.extractFromFile(file);

      if (!ocrResult.extractedText || !ocrResult.extractedText.trim()) {
        setErrorMessage("No readable text could be extracted from this image. Please try a clearer picture.");
        setInternalState("error");
        return;
      }

      const generatedDraft = convertOcrToNoteDraft(ocrResult);
      setDraft(generatedDraft);
      setInternalState("review");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to extract text from the selected image.");
      setInternalState("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      setIsSaving(true);
      const proseMirrorDoc = convertTextToProseMirrorDocument(draft.bodyText);
      await onSaveNote({
        title: draft.title.trim(),
        content: proseMirrorDoc,
        folderId: selectedFolderId,
        tags
      });
      handleModalClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartBlank = () => {
    handleModalClose();
    onOpenBlankNote?.();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleModalClose()}>
      <DialogContent className="max-w-2xl bg-[#ffffff] p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#000000]">
            <Camera className="size-5 text-[#0075de]" />
            Scan Note from Image
          </DialogTitle>
          <DialogDescription className="text-xs text-[#615d59]">
            Photographed text → editable note pre-fill (FR-5.3)
          </DialogDescription>
        </DialogHeader>

        {/* State 1: Scanning / Image Selection */}
        {currentState === "scanning" && (
          <div className="flex flex-col gap-4 py-3">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragOver
                  ? "border-[#0075de] bg-[#0075de]/5"
                  : "border-[#e6e6e6] bg-[#f6f5f4] hover:border-[#a39e98] hover:bg-[#f6f5f4]/80"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                data-testid="ocr-file-input"
              />
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-white shadow-xs border border-[#e6e6e6]">
                <Upload className="size-6 text-[#0075de]" />
              </div>
              <h4 className="text-sm font-semibold text-[#000000]">
                Choose an image or drag & drop here
              </h4>
              <p className="mt-1 text-xs text-[#615d59]">
                Supports JPEG, PNG, WebP up to 10MB (whiteboard, documents, book pages)
              </p>
              <Button size="sm" className="mt-4 pointer-events-none">
                Browse Files
              </Button>
            </div>
          </div>
        )}

        {/* State 2: Processing / OCR in Progress */}
        {currentState === "processing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Loader2 className="size-10 animate-spin text-[#0075de]" />
            <h4 className="text-sm font-semibold text-[#000000]">Extracting Text from Image...</h4>
            <p className="max-w-sm text-xs text-[#615d59]">
              Running OCR analysis and computing confidence scores. Your pre-filled note draft will appear shortly.
            </p>
          </div>
        )}

        {/* State 3: Review / Pre-filled Draft Confirmation */}
        {currentState === "review" && (draft || mockDraft) && (
          <div className="flex flex-col gap-4 py-2">
            <OCRPreviewCard
              draft={draft || mockDraft!}
              onTitleChange={(newTitle) => {
                if (draft) setDraft({ ...draft, title: newTitle });
              }}
              onBodyChange={(newBody) => {
                if (draft) setDraft({ ...draft, bodyText: newBody });
              }}
            />

            {/* Folder & Tag Assignment */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#e6e6e6] bg-[#f6f5f4] p-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#615d59]">
                  <Folder className="size-3 text-[#0075de]" />
                  Save in Folder
                </span>
                <FolderPicker
                  folders={folders}
                  value={selectedFolderId}
                  onChange={setSelectedFolderId}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#615d59]">
                  <TagIcon className="size-3 text-[#0075de]" />
                  Tags
                </span>
                <TagInput value={tags} suggestions={allTags} onChange={setTags} />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e6e6] pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInternalState("scanning")}
                disabled={isSaving}
              >
                <RefreshCw className="mr-1.5 size-3.5" />
                Scan Another Image
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleModalClose} disabled={isSaving}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Create Note"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* State 4: Error / Fallback State */}
        {currentState === "error" && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
              <AlertTriangle className="size-5 shrink-0 text-rose-600" />
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-rose-950">OCR Extraction Failed</h4>
                <p>{errorMessage || "Failed to process image. Please try again or create a blank note."}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleStartBlank}>
                <FilePlus className="mr-1.5 size-3.5" />
                Start Blank Note
              </Button>
              <Button size="sm" onClick={() => setInternalState("scanning")}>
                <RefreshCw className="mr-1.5 size-3.5" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
