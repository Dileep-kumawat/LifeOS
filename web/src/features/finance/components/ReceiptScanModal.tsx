import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  RefreshCw,
  AlertTriangle,
  FilePlus,
  CheckCircle2,
  Receipt
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/Dialog";
import { Button } from "../../../components/Button";
import { ReceiptPreviewCard } from "./ReceiptPreviewCard";
import { ocrApi } from "../../notes/ocrApi";
import { parseReceiptOcr, type ParsedReceiptResult } from "@lifeos/shared";
import type { Category, TransactionType } from "../types";

export type ReceiptScanState = "scanning" | "processing" | "review" | "error";

export interface ReceiptScanModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onConfirmTransaction: (data: {
    amount: number;
    type: TransactionType;
    category: string;
    date: Date;
    note: string;
    receiptAttachment: string | null;
  }) => Promise<void>;
  onOpenBlankForm?: () => void;
  // Storybook & Testing props:
  forcedState?: ReceiptScanState;
  mockParsedReceipt?: ParsedReceiptResult;
}

export function ReceiptScanModal({
  open,
  onClose,
  categories,
  onConfirmTransaction,
  onOpenBlankForm,
  forcedState,
  mockParsedReceipt
}: ReceiptScanModalProps) {
  const [state, setState] = useState<ReceiptScanState>(forcedState || "scanning");
  const [parsedResult, setParsedResult] = useState<ParsedReceiptResult | null>(
    mockParsedReceipt || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (forcedState) {
      setState(forcedState);
    }
    if (mockParsedReceipt) {
      setParsedResult(mockParsedReceipt);
    }
  }, [forcedState, mockParsedReceipt]);

  useEffect(() => {
    if (!open) {
      if (!forcedState) setState("scanning");
      if (!mockParsedReceipt) setParsedResult(null);
      setErrorMessage(null);
      setIsSaving(false);
    }
  }, [open, forcedState, mockParsedReceipt]);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setState("error");
      setErrorMessage("Please select a valid image file (JPEG, PNG, WebP, GIF, etc.).");
      return;
    }

    try {
      setState("processing");
      setErrorMessage(null);

      const ocrResult = await ocrApi.extractFromFile(file);

      if (!ocrResult.extractedText || !ocrResult.extractedText.trim()) {
        setState("error");
        setErrorMessage("No readable text detected on this receipt image. Please try a clearer photo.");
        return;
      }

      const categoryNames = categories.filter((c) => c.type === "expense").map((c) => c.name);
      const parsed = parseReceiptOcr(ocrResult, { categories: categoryNames });

      setParsedResult(parsed);
      setState("review");
    } catch (err: any) {
      setState("error");
      setErrorMessage(err.message || "Failed to process receipt image. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void handleProcessFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      void handleProcessFile(files[0]);
    }
  };

  const handleConfirmSave = async () => {
    if (!parsedResult) return;

    const amount = parsedResult.amount.value;
    if (amount === null || isNaN(amount) || amount <= 0) {
      setErrorMessage("Please verify and enter a valid positive total amount.");
      return;
    }

    const matchedCategory =
      parsedResult.category?.value ||
      categories.filter((c) => c.type === "expense")[0]?.name ||
      "Food";

    try {
      setIsSaving(true);
      setErrorMessage(null);

      await onConfirmTransaction({
        amount,
        type: "expense",
        category: matchedCategory,
        date: parsedResult.date.value ? new Date(parsedResult.date.value) : new Date(),
        note: parsedResult.merchant.value || "Scanned Receipt Expense",
        receiptAttachment: null
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Receipt className="size-5 text-[#0075de]" />
            {state === "review"
              ? "Confirm Receipt Expense"
              : state === "processing"
                ? "Analyzing Receipt..."
                : "Scan Receipt"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff"
            className="hidden"
          />

          {/* 1. Scanning State: Drag & Drop Dropzone */}
          {state === "scanning" && (
            <div className="flex flex-col gap-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-[#0075de] bg-[#0075de]/5"
                    : "border-[#e6e6e6] bg-[#f6f5f4] hover:border-[#a39e98] hover:bg-white"
                }`}
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-white border border-[#e6e6e6] shadow-xs mb-3">
                  <Upload className="size-6 text-[#0075de]" />
                </div>
                <h4 className="text-sm font-bold text-[#000000]">
                  Upload receipt photo or screenshot
                </h4>
                <p className="mt-1 text-xs text-[#615d59] max-w-xs">
                  Drag and drop a JPG, PNG, or WebP receipt image here, or browse files from your computer.
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0075de] border border-[#e6e6e6]">
                  <Camera className="size-3.5" />
                  Select Image File
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#615d59] pt-1">
                <span>Supports up to 10MB</span>
                {onOpenBlankForm && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBlankForm();
                    }}
                    className="text-[#0075de] hover:underline font-medium"
                  >
                    Enter Manually Instead
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. Processing State */}
          {state === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-4 flex size-14 items-center justify-center">
                <div className="absolute size-14 rounded-full border-4 border-[#0075de]/20" />
                <div className="size-14 animate-spin rounded-full border-4 border-[#0075de] border-t-transparent" />
                <Receipt className="size-6 text-[#0075de]" />
              </div>
              <h4 className="text-base font-bold text-[#000000]">Extracting Receipt Data</h4>
              <p className="mt-1 max-w-sm text-xs text-[#615d59]">
                Running OCR extraction and analyzing merchant name, amounts, date, and category...
              </p>
            </div>
          )}

          {/* 3. Error State */}
          {state === "error" && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
                <AlertTriangle className="size-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-sm">Receipt Extraction Failed</span>
                  <span className="text-xs text-red-800">
                    {errorMessage || "Unable to extract readable text from the provided image."}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {onOpenBlankForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onOpenBlankForm();
                    }}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <FilePlus className="size-4" />
                    Enter Manually
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => {
                    setState("scanning");
                    setErrorMessage(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="size-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* 4. Review State: Pre-filled Receipt Review */}
          {state === "review" && parsedResult && (
            <div className="flex flex-col gap-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-900">
                  <AlertTriangle className="size-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <ReceiptPreviewCard
                parsedReceipt={parsedResult}
                onMerchantChange={(m) =>
                  setParsedResult({
                    ...parsedResult,
                    merchant: { ...parsedResult.merchant, value: m }
                  })
                }
                onAmountChange={(a) =>
                  setParsedResult({
                    ...parsedResult,
                    amount: { ...parsedResult.amount, value: a }
                  })
                }
                onDateChange={(d) =>
                  setParsedResult({
                    ...parsedResult,
                    date: { ...parsedResult.date, value: d }
                  })
                }
              />

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e6e6e6]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setState("scanning");
                    setParsedResult(null);
                  }}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <RefreshCw className="size-3.5" />
                  Scan Another
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleConfirmSave}
                    className="flex items-center gap-1.5 font-semibold"
                  >
                    <CheckCircle2 className="size-4" />
                    {isSaving ? "Saving..." : "Confirm & Save Expense"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
