import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { createTransactionSchema } from "@lifeos/shared";
import type { Category, Transaction, TransactionType } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { Label } from "../../../components/ui/Label";
import { Button } from "../../../components/Button";

export interface TransactionFormValues {
  amount: number;
  type: TransactionType;
  category: string;
  date: Date;
  note: string;
  receiptAttachment: string | null;
}

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormValues) => Promise<void>;
  categories: Category[];
  initialData?: Transaction | null;
  prefillData?: Partial<TransactionFormValues> | null;
  fieldConfidence?: Record<string, { confidence: number; isLowConfidence: boolean }>;
  onAddCategory?: (name: string, type: TransactionType) => Promise<string>;
}

export function TransactionForm({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
  prefillData,
  fieldConfidence,
  onAddCategory
}: TransactionFormProps) {
  const [isAddingInlineCategory, setIsAddingInlineCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultDateString = initialData?.date
    ? new Date(initialData.date).toISOString().split("T")[0]
    : prefillData?.date
      ? new Date(prefillData.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(createTransactionSchema) as any,
    defaultValues: {
      amount: initialData?.amount ?? prefillData?.amount ?? 0,
      type: initialData?.type ?? prefillData?.type ?? "expense",
      category: initialData?.category ?? prefillData?.category ?? "",
      date: new Date(defaultDateString),
      note: initialData?.note ?? prefillData?.note ?? "",
      receiptAttachment: initialData?.receiptAttachment ?? prefillData?.receiptAttachment ?? null
    }
  });

  const selectedType = watch("type");
  const selectedCategory = watch("category");
  const selectedDate = watch("date");

  const formattedDateValue = selectedDate
    ? new Date(selectedDate).toISOString().split("T")[0]
    : defaultDateString;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          amount: initialData.amount,
          type: initialData.type,
          category: initialData.category,
          date: new Date(initialData.date),
          note: initialData.note || "",
          receiptAttachment: initialData.receiptAttachment || null
        });
      } else if (prefillData) {
        reset({
          amount: (prefillData.amount ?? "") as any,
          type: prefillData.type ?? "expense",
          category: prefillData.category ?? (categories.filter((c) => c.type === (prefillData.type ?? "expense"))[0]?.name || "Food"),
          date: prefillData.date ? new Date(prefillData.date) : new Date(),
          note: prefillData.note ?? "",
          receiptAttachment: prefillData.receiptAttachment ?? null
        });
      } else {
        const filtered = categories.filter((c) => c.type === "expense");
        const defaultCat = filtered.length > 0 ? filtered[0].name : "Food";
        reset({
          amount: "" as any,
          type: "expense",
          category: defaultCat,
          date: new Date(),
          note: "",
          receiptAttachment: null
        });
      }
      setIsAddingInlineCategory(false);
      setInlineCategoryName("");
    }
  }, [isOpen, initialData, prefillData, reset, categories]);

  const availableCategories = categories.filter((c) => c.type === selectedType);

  const handleFormSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInlineCategory = async () => {
    const trimmed = inlineCategoryName.trim();
    if (!trimmed) return;
    if (onAddCategory) {
      const createdName = await onAddCategory(trimmed, selectedType);
      setValue("category", createdName, { shouldValidate: true });
    } else {
      setValue("category", trimmed, { shouldValidate: true });
    }
    setIsAddingInlineCategory(false);
    setInlineCategoryName("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {initialData ? "Edit Transaction" : "New Transaction"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4 mt-2">
          {/* Income vs Expense Toggle */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm border transition-all ${
                  selectedType === "expense"
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                }`}
                onClick={() => {
                  setValue("type", "expense");
                  const expenseCats = categories.filter((c) => c.type === "expense");
                  if (expenseCats.length > 0) setValue("category", expenseCats[0].name);
                }}
              >
                <ArrowDownLeft className="size-4" />
                Expense
              </button>

              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm border transition-all ${
                  selectedType === "income"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                }`}
                onClick={() => {
                  setValue("type", "income");
                  const incomeCats = categories.filter((c) => c.type === "income");
                  if (incomeCats.length > 0) setValue("category", incomeCats[0].name);
                }}
              >
                <ArrowUpRight className="size-4" />
                Income
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="amount"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Amount (₹)
              </Label>
              {fieldConfidence?.amount?.isLowConfidence && (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                  Check Amount
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={`pl-7 text-base font-semibold ${
                  fieldConfidence?.amount?.isLowConfidence
                    ? "border-amber-400 bg-amber-50/40 focus-visible:ring-amber-400"
                    : ""
                }`}
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive font-medium">{errors.amount.message}</p>
            )}
          </div>

          {/* Category Select + Inline Add */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="category"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Category
              </Label>
              {!isAddingInlineCategory && (
                <button
                  type="button"
                  onClick={() => setIsAddingInlineCategory(true)}
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Plus className="size-3" />
                  Add Custom
                </button>
              )}
            </div>

            {isAddingInlineCategory ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New category name..."
                  value={inlineCategoryName}
                  onChange={(e) => setInlineCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateInlineCategory();
                    }
                  }}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={() => void handleCreateInlineCategory()}>
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingInlineCategory(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCategory}
                onChange={(e) => setValue("category", e.target.value, { shouldValidate: true })}
              >
                {availableCategories.length === 0 && (
                  <option value="">No categories available</option>
                )}
                {availableCategories.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
            {errors.category && (
              <p className="text-xs text-destructive font-medium">{errors.category.message}</p>
            )}
          </div>

          {/* Date Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="date"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Date
              </Label>
              {fieldConfidence?.date?.isLowConfidence && (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                  Check Date
                </span>
              )}
            </div>
            <Input
              id="date"
              type="date"
              value={formattedDateValue}
              className={
                fieldConfidence?.date?.isLowConfidence
                  ? "border-amber-400 bg-amber-50/40 focus-visible:ring-amber-400"
                  : ""
              }
              onChange={(e) => setValue("date", new Date(e.target.value), { shouldValidate: true })}
            />
            {errors.date && (
              <p className="text-xs text-destructive font-medium">{errors.date.message}</p>
            )}
          </div>

          {/* Note Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="note"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Merchant / Note
              </Label>
              {fieldConfidence?.merchant?.isLowConfidence && (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                  Check Merchant
                </span>
              )}
            </div>
            <Input
              id="note"
              placeholder="e.g. Starbucks or Weekly grocery run"
              className={
                fieldConfidence?.merchant?.isLowConfidence
                  ? "border-amber-400 bg-amber-50/40 focus-visible:ring-amber-400"
                  : ""
              }
              {...register("note")}
            />
            {errors.note && (
              <p className="text-xs text-destructive font-medium">{errors.note.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : initialData
                  ? "Update Transaction"
                  : "Create Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
