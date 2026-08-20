import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalTransaction } from "../../db/schema";
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "@lifeos/shared";

interface TransactionFormModalProps {
  visible: boolean;
  onClose: () => void;
  transactionToEdit?: LocalTransaction | null;
  onSave: (txData: {
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
    note: string;
    receiptAttachment: string | null;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function TransactionFormModal({
  visible,
  onClose,
  transactionToEdit,
  onSave,
  onDelete
}: TransactionFormModalProps) {
  const [amountStr, setAmountStr] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("Food");
  const [dateStr, setDateStr] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = type === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;

  useEffect(() => {
    if (transactionToEdit) {
      setAmountStr(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
      setCategory(transactionToEdit.category);
      setDateStr(transactionToEdit.date ? transactionToEdit.date.split("T")[0] : "");
      setNote(transactionToEdit.note || "");
    } else {
      setAmountStr("");
      setType("expense");
      setCategory("Food");
      setDateStr(new Date().toISOString().split("T")[0]);
      setNote("");
    }
    setError(null);
  }, [transactionToEdit, visible]);

  const handleSave = async () => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await onSave({
        amount: numAmount,
        type,
        category,
        date: dateStr.trim() ? `${dateStr.trim()}T12:00:00.000Z` : new Date().toISOString(),
        note: note.trim(),
        receiptAttachment: null
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save transaction");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (transactionToEdit && onDelete) {
      try {
        setIsSaving(true);
        await onDelete(transactionToEdit.id);
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete transaction");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={transactionToEdit ? "Edit Transaction" : "New Transaction"}
      subtitle="Log income and expenses offline"
    >
      <View style={styles.formContainer}>
        {error && (
          <View style={styles.errorBox}>
            <ThemedText variant="caption" color={colors.error}>
              {error}
            </ThemedText>
          </View>
        )}

        {/* Type Toggle: Expense / Income */}
        <View style={styles.typeSegment}>
          <TouchableOpacity
            onPress={() => {
              setType("expense");
              setCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
            }}
            style={[styles.segmentBtn, type === "expense" && styles.expenseBtnSelected]}
          >
            <ThemedText
              variant="bodySm"
              color={type === "expense" ? colors.onPrimary : colors.ink}
              style={{ fontWeight: "600" }}
            >
              Expense
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setType("income");
              setCategory(DEFAULT_INCOME_CATEGORIES[0]);
            }}
            style={[styles.segmentBtn, type === "income" && styles.incomeBtnSelected]}
          >
            <ThemedText
              variant="bodySm"
              color={type === "income" ? colors.onPrimary : colors.ink}
              style={{ fontWeight: "600" }}
            >
              Income
            </ThemedText>
          </TouchableOpacity>
        </View>

        <TextInput
          label="Amount ($)"
          placeholder="0.00"
          value={amountStr}
          onChangeText={setAmountStr}
          keyboardType="decimal-pad"
        />

        {/* Category Picker Chips */}
        <View style={styles.section}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            Category
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {categories.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.categoryChip, isSelected && styles.chipSelected]}
                >
                  <ThemedText
                    variant="caption"
                    color={isSelected ? colors.onPrimary : colors.ink}
                    style={{ fontWeight: "600" }}
                  >
                    {cat}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <TextInput
          label="Date (YYYY-MM-DD)"
          placeholder="2026-08-17"
          value={dateStr}
          onChangeText={setDateStr}
        />

        <TextInput
          label="Note (optional)"
          placeholder="e.g. Grocery store run or Client payment"
          value={note}
          onChangeText={setNote}
        />

        <View style={styles.buttonContainer}>
          <Button
            title={
              isSaving ? "Saving..." : transactionToEdit ? "Update Transaction" : "Log Transaction"
            }
            onPress={handleSave}
            disabled={isSaving}
          />

          {transactionToEdit && onDelete && (
            <Button
              title="Delete Transaction"
              variant="outline"
              onPress={handleDelete}
              disabled={isSaving}
              style={{ marginTop: spacing.xs, borderColor: colors.error }}
              textStyle={{ color: colors.error }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: spacing.sm
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: spacing.sm,
    borderRadius: radius.md
  },
  typeSegment: {
    flexDirection: "row",
    backgroundColor: colors.canvasSoft,
    padding: 3,
    borderRadius: radius.lg
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.md
  },
  expenseBtnSelected: {
    backgroundColor: colors.error
  },
  incomeBtnSelected: {
    backgroundColor: colors.success
  },
  section: {
    marginTop: spacing.xs
  },
  sectionLabel: {
    marginBottom: spacing.xs,
    fontWeight: "600"
  },
  chipScroll: {
    flexDirection: "row"
  },
  categoryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginRight: 6
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  buttonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg
  }
});
