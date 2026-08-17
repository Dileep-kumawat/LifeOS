import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalBudget } from "../../db/schema";
import { DEFAULT_EXPENSE_CATEGORIES } from "@lifeos/shared";

interface BudgetFormModalProps {
  visible: boolean;
  onClose: () => void;
  budgetToEdit?: LocalBudget | null;
  onSave: (budgetData: {
    category: string;
    limit: number;
    period: "monthly";
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function BudgetFormModal({
  visible,
  onClose,
  budgetToEdit,
  onSave,
  onDelete
}: BudgetFormModalProps) {
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [limitStr, setLimitStr] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (budgetToEdit) {
      setCategory(budgetToEdit.category);
      setLimitStr(String(budgetToEdit.limit));
    } else {
      setCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
      setLimitStr("");
    }
    setError(null);
  }, [budgetToEdit, visible]);

  const handleSave = async () => {
    const numLimit = parseFloat(limitStr);
    if (isNaN(numLimit) || numLimit <= 0) {
      setError("Please enter a valid budget limit greater than 0");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await onSave({
        category,
        limit: numLimit,
        period: "monthly"
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save budget");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (budgetToEdit && onDelete) {
      try {
        setIsSaving(true);
        await onDelete(budgetToEdit.id);
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete budget");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={budgetToEdit ? "Edit Category Budget" : "New Category Budget"}
      subtitle="Set monthly spending thresholds"
    >
      <View style={styles.formContainer}>
        {error && (
          <View style={styles.errorBox}>
            <ThemedText variant="caption" color={colors.error}>
              {error}
            </ThemedText>
          </View>
        )}

        {/* Category Picker Chips */}
        <View style={styles.section}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            Expense Category
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {DEFAULT_EXPENSE_CATEGORIES.map((cat) => {
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
          label="Monthly Spend Limit ($)"
          placeholder="e.g. 500"
          value={limitStr}
          onChangeText={setLimitStr}
          keyboardType="decimal-pad"
        />

        <View style={styles.buttonContainer}>
          <Button
            title={isSaving ? "Saving..." : budgetToEdit ? "Update Budget" : "Set Budget"}
            onPress={handleSave}
            disabled={isSaving}
          />

          {budgetToEdit && onDelete && (
            <Button
              title="Delete Budget"
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
