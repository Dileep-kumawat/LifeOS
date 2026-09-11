import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { financeApi } from "./api";
import { ReceiptScanModal } from "./components/ReceiptScanModal";
import { Button } from "../../components/Button";
import type { TransactionType } from "./types";

export function ReceiptScanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  const { data: categories = [] } = useQuery({
    queryKey: ["finance", "categories"],
    queryFn: () => financeApi.listCategories()
  });

  const handleClose = () => {
    setIsOpen(false);
    navigate("/finance");
  };

  const handleConfirm = async (data: {
    amount: number;
    type: TransactionType;
    category: string;
    date: Date;
    note: string;
    receiptAttachment: string | null;
  }) => {
    try {
      await financeApi.createTransaction({
        amount: data.amount,
        type: data.type,
        category: data.category,
        date: data.date.toISOString(),
        note: data.note,
        receiptAttachment: data.receiptAttachment || undefined
      });
      queryClient.invalidateQueries({ queryKey: ["finance", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "summary"] });
      toast.success("Transaction recorded from receipt scan!");
      handleClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save transaction");
      throw err;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/finance")}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Back to Finance
        </Button>
        <h1 className="text-xl font-bold text-[#1a1c1c]">OCR Receipt Scanner</h1>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#c1c6d5]/40 shadow-xs flex flex-col items-center justify-center min-h-[350px]">
        <ReceiptScanModal
          open={isOpen}
          onClose={handleClose}
          categories={categories}
          onConfirmTransaction={handleConfirm}
          onOpenBlankForm={() => navigate("/finance?action=new")}
        />
        <p className="text-sm text-[#717784] mt-4">
          Scan receipts to automatically extract merchant, amount, category, and date.
        </p>
      </div>
    </div>
  );
}
