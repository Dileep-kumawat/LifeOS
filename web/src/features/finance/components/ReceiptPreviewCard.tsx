import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Receipt,
  Store,
  DollarSign,
  Calendar,
  Tag,
  Eye,
  Edit3,
  ListOrdered
} from "lucide-react";
import { cn } from "../../../lib/utils";
import type { ParsedReceiptResult } from "@lifeos/shared";

export interface ReceiptPreviewCardProps {
  parsedReceipt: ParsedReceiptResult;
  onMerchantChange?: (merchant: string) => void;
  onAmountChange?: (amount: number | null) => void;
  onDateChange?: (date: string | null) => void;
  className?: string;
}

export function ReceiptPreviewCard({
  parsedReceipt,
  onMerchantChange,
  onAmountChange,
  onDateChange,
  className
}: ReceiptPreviewCardProps) {
  const [merchant, setMerchant] = useState(parsedReceipt.merchant.value || "");
  const [amountStr, setAmountStr] = useState(
    parsedReceipt.amount.value !== null ? String(parsedReceipt.amount.value) : ""
  );
  const [dateStr, setDateStr] = useState(parsedReceipt.date.value || "");
  const [category, setCategory] = useState(parsedReceipt.category?.value || "");
  const [activeTab, setActiveTab] = useState<"fields" | "raw">("fields");

  useEffect(() => {
    setMerchant(parsedReceipt.merchant.value || "");
    setAmountStr(
      parsedReceipt.amount.value !== null ? String(parsedReceipt.amount.value) : ""
    );
    setDateStr(parsedReceipt.date.value || "");
    setCategory(parsedReceipt.category?.value || "");
  }, [parsedReceipt]);

  const handleMerchantChange = (val: string) => {
    setMerchant(val);
    onMerchantChange?.(val);
  };

  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    const parsed = parseFloat(val);
    onAmountChange?.(!isNaN(parsed) && parsed > 0 ? parsed : null);
  };

  const handleDateChange = (val: string) => {
    setDateStr(val);
    onDateChange?.(val || null);
  };

  const overallConfidencePercent = Math.round(parsedReceipt.overallConfidence * 100);

  const lowConfidenceFields: string[] = [];
  if (parsedReceipt.merchant.isLowConfidence || !parsedReceipt.merchant.value) {
    lowConfidenceFields.push("Merchant Name");
  }
  if (parsedReceipt.amount.isLowConfidence || parsedReceipt.amount.value === null) {
    lowConfidenceFields.push("Total Amount");
  }
  if (parsedReceipt.date.isLowConfidence || !parsedReceipt.date.value) {
    lowConfidenceFields.push("Date");
  }

  const isEmpty =
    !parsedReceipt.rawText.trim() &&
    !parsedReceipt.merchant.value &&
    parsedReceipt.amount.value === null;

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e6e6e6] bg-[#f6f5f4] p-8 text-center",
          className
        )}
      >
        <Receipt className="mb-2 size-10 text-[#a39e98]" />
        <h4 className="text-sm font-semibold text-[#000000]">No Receipt Data Detected</h4>
        <p className="mt-1 max-w-sm text-xs text-[#615d59]">
          The OCR engine could not recognize readable fields on this receipt. Please upload a
          clearer, well-lit photo or enter the expense manually.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-xs",
        className
      )}
    >
      {/* Header Bar with Confidence & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6e6e6] pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f5f4] px-2.5 py-1 text-[11px] font-semibold text-[#31302e] border border-[#e6e6e6]">
            <Sparkles className="size-3 text-[#0075de]" />
            Receipt OCR
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
              overallConfidencePercent >= 80
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : overallConfidencePercent >= 50
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
            )}
          >
            {overallConfidencePercent >= 80 ? (
              <CheckCircle2 className="size-3 text-emerald-600" />
            ) : (
              <AlertCircle className="size-3 text-amber-600" />
            )}
            {overallConfidencePercent}% Confidence
          </span>

          <span className="text-[11px] text-[#a39e98] capitalize">
            via {parsedReceipt.source === "server_fallback" ? "Server OCR" : "On-Device ML"}
          </span>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-[#f6f5f4] p-0.5 border border-[#e6e6e6]">
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              activeTab === "fields"
                ? "bg-white text-[#0075de] shadow-xs"
                : "text-[#615d59] hover:text-[#000000]"
            )}
          >
            <Edit3 className="size-3" />
            Extracted Fields
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              activeTab === "raw"
                ? "bg-white text-[#0075de] shadow-xs"
                : "text-[#615d59] hover:text-[#000000]"
            )}
          >
            <Eye className="size-3" />
            Raw Text
          </button>
        </div>
      </div>

      {/* Warning Cue for Low Confidence / Missing Fields */}
      {lowConfidenceFields.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">
              {lowConfidenceFields.length} field
              {lowConfidenceFields.length > 1 ? "s" : ""} flagged for review:{" "}
              {lowConfidenceFields.join(", ")}
            </span>
            <span className="text-[11px] text-amber-800/90">
              Please check and correct any unreadable or estimated values before saving to Finance.
            </span>
          </div>
        </div>
      )}

      {/* Content Area */}
      {activeTab === "fields" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Merchant Name */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#615d59] flex items-center gap-1.5">
                <Store className="size-3.5 text-[#0075de]" />
                Merchant / Description
              </label>
              {parsedReceipt.merchant.isLowConfidence ? (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  Low Confidence
                </span>
              ) : (
                <span className="text-[10px] text-[#a39e98]">
                  {Math.round(parsedReceipt.merchant.confidence * 100)}%
                </span>
              )}
            </div>
            <input
              type="text"
              value={merchant}
              onChange={(e) => handleMerchantChange(e.target.value)}
              placeholder="e.g. Starbucks, Target, Uber..."
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm font-semibold text-[#000000] placeholder:text-[#a39e98] focus:outline-none transition-colors",
                parsedReceipt.merchant.isLowConfidence || !merchant
                  ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:bg-white"
                  : "border-[#e6e6e6] bg-[#f6f5f4] focus:border-[#0075de] focus:bg-white"
              )}
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#615d59] flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-emerald-600" />
                Total Amount
              </label>
              {parsedReceipt.amount.isLowConfidence || parsedReceipt.amount.value === null ? (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  Check Amount
                </span>
              ) : (
                <span className="text-[10px] text-[#a39e98]">
                  {Math.round(parsedReceipt.amount.confidence * 100)}%
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm font-bold text-[#000000] placeholder:text-[#a39e98] focus:outline-none transition-colors",
                  parsedReceipt.amount.isLowConfidence || !amountStr
                    ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:bg-white"
                    : "border-[#e6e6e6] bg-[#f6f5f4] focus:border-[#0075de] focus:bg-white"
                )}
              />
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#615d59] flex items-center gap-1.5">
                <Calendar className="size-3.5 text-[#0075de]" />
                Transaction Date
              </label>
              {parsedReceipt.date.isLowConfidence || !parsedReceipt.date.value ? (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  Uncertain Date
                </span>
              ) : (
                <span className="text-[10px] text-[#a39e98]">
                  {Math.round(parsedReceipt.date.confidence * 100)}%
                </span>
              )}
            </div>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => handleDateChange(e.target.value)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm font-medium text-[#000000] focus:outline-none transition-colors",
                parsedReceipt.date.isLowConfidence || !dateStr
                  ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:bg-white"
                  : "border-[#e6e6e6] bg-[#f6f5f4] focus:border-[#0075de] focus:bg-white"
              )}
            />
          </div>

          {/* Category Suggestion */}
          {category && (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#615d59] flex items-center gap-1.5">
                  <Tag className="size-3.5 text-purple-600" />
                  Suggested Category
                </label>
                <span className="text-[10px] text-[#a39e98]">Heuristic Match</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-900 border border-purple-200">
                  <Tag className="size-3 text-purple-600" />
                  {category}
                </span>
                <span className="text-xs text-[#615d59]">
                  (Pre-selected in transaction form, fully editable)
                </span>
              </div>
            </div>
          )}

          {/* Optional Line Items Preview */}
          {parsedReceipt.lineItems && parsedReceipt.lineItems.length > 0 && (
            <div className="flex flex-col gap-1.5 sm:col-span-2 border-t border-[#e6e6e6] pt-3 mt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#615d59] flex items-center gap-1.5">
                <ListOrdered className="size-3.5 text-[#a39e98]" />
                Detected Line Items ({parsedReceipt.lineItems.length})
              </span>
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-md bg-[#f6f5f4] p-2 border border-[#e6e6e6]">
                {parsedReceipt.lineItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs text-[#31302e] py-0.5"
                  >
                    <span className="truncate pr-2">{item.description}</span>
                    {item.amount !== undefined && (
                      <span className="font-mono font-medium shrink-0">
                        ${item.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#615d59]">
            Full Extracted OCR Text
          </label>
          <textarea
            readOnly
            value={parsedReceipt.rawText}
            rows={8}
            className="w-full rounded-md border border-[#e6e6e6] bg-[#f6f5f4] p-3 font-mono text-xs leading-relaxed text-[#31302e] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
