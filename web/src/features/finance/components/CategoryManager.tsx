import { useState } from "react";
import { Plus, Edit2, Trash2, Tag, AlertTriangle, Check, X } from "lucide-react";
import type { Category, TransactionType } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/Button";

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreateCategory: (name: string, type: TransactionType) => Promise<string | void>;
  onRenameCategory: (id: string, newName: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function CategoryManager({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory
}: CategoryManagerProps) {
  const [activeTab, setActiveTab] = useState<TransactionType>("expense");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const handleCreate = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onCreateCategory(trimmed, activeTab);
      setNewCategoryName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRename = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onRenameCategory(id, trimmed);
      setEditingId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (
      !window.confirm(
        `Delete category "${cat.name}"?\nAny existing transactions in this category will be reassigned to "Other".`
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onDeleteCategory(cat.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Tag className="size-5 text-primary" />
            Category Management
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg border border-border bg-muted/30">
            <button
              type="button"
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                activeTab === "expense"
                  ? "bg-background text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("expense")}
            >
              Expense Categories ({categories.filter((c) => c.type === "expense").length})
            </button>
            <button
              type="button"
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                activeTab === "income"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("income")}
            >
              Income Categories ({categories.filter((c) => c.type === "income").length})
            </button>
          </div>

          {/* Reassign Warning Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              Deleting a category reassigns its transactions to <strong>"Other"</strong> so your
              historical financial data is preserved.
            </span>
          </div>

          {/* Add Category Form */}
          <div className="flex items-center gap-2">
            <Input
              placeholder={`New ${activeTab} category name...`}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => void handleCreate()}
              disabled={isSubmitting || !newCategoryName.trim()}
            >
              <Plus className="size-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Category List */}
          <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
            {filteredCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No custom {activeTab} categories found.
              </p>
            ) : (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-accent/40"
                >
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 text-xs"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8 size-8 p-0"
                        onClick={() => void handleSaveRename(cat.id)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 size-8 p-0"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  )}

                  {editingId !== cat.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleStartRename(cat)}
                        title="Rename category"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 text-muted-foreground hover:text-rose-600"
                        onClick={() => void handleDelete(cat)}
                        title="Delete category"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
