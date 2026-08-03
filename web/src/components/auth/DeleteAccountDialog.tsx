import { useState } from "react";
import { Button } from "../ui/Button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/Dialog";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => Promise<void>;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirmDelete
}: DeleteAccountDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete();
    } finally {
      setIsDeleting(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="text-red-600">Delete Account</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete your account?
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2 text-sm text-[#31302e]">
        <p>
          Your account will be <strong>soft-deleted immediately</strong> and you will be signed out of all active devices.
        </p>
        <p className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-800">
          <strong>Important:</strong> All calendar events, goals, habits, and notes will be permanently purged after a <strong>30-day grace period</strong>.
        </p>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          isLoading={isDeleting}
        >
          Delete Account
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
