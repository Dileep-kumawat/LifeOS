import { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput
} from "react-native";
import { Calendar, Check, X, AlertCircle } from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Button } from "../ui/Button";
import { colors, spacing, radius } from "../../theme";

export type MobileDateRangePreset = "this_week" | "this_month" | "last_3_months" | "custom";

export interface MobileDateRangeValue {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  preset: MobileDateRangePreset;
}

export interface MobileDateRangePickerProps {
  value: MobileDateRangeValue;
  onChange: (val: MobileDateRangeValue) => void;
}

export function formatLocalYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeMobilePresetRange(preset: MobileDateRangePreset): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const todayStr = formatLocalYMD(now);

  switch (preset) {
    case "this_week": {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { startDate: formatLocalYMD(start), endDate: todayStr };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatLocalYMD(start), endDate: todayStr };
    }
    case "last_3_months": {
      const start = new Date(now);
      start.setDate(now.getDate() - 89);
      return { startDate: formatLocalYMD(start), endDate: todayStr };
    }
    case "custom":
    default: {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      return { startDate: formatLocalYMD(start), endDate: todayStr };
    }
  }
}

export function DateRangePicker({ value, onChange }: MobileDateRangePickerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presets: Array<{ id: MobileDateRangePreset; label: string }> = [
    { id: "this_week", label: "This Week" },
    { id: "this_month", label: "This Month" },
    { id: "last_3_months", label: "3 Months" },
    { id: "custom", label: "Custom" }
  ];

  const handlePresetSelect = (preset: MobileDateRangePreset) => {
    if (preset === "custom") {
      setCustomStart(value.startDate);
      setCustomEnd(value.endDate);
      setErrorMsg(null);
      setIsModalVisible(true);
      return;
    }

    const range = computeMobilePresetRange(preset);
    onChange({
      ...range,
      preset
    });
  };

  const handleApplyCustom = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setErrorMsg("Invalid date format (use YYYY-MM-DD)");
      return;
    }

    if (start.getTime() > end.getTime()) {
      setErrorMsg("Start date cannot be after end date");
      return;
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 366) {
      setErrorMsg("Range cannot exceed 366 days (1 year)");
      return;
    }

    setErrorMsg(null);
    setIsModalVisible(false);
    onChange({
      startDate: customStart,
      endDate: customEnd,
      preset: "custom"
    });
  };

  return (
    <View style={styles.container}>
      {/* Preset Pill Buttons */}
      <View style={styles.presetsRow}>
        {presets.map((p) => {
          const isSelected = value.preset === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.7}
              onPress={() => handlePresetSelect(p.id)}
              style={[
                styles.presetPill,
                isSelected ? styles.presetPillActive : styles.presetPillInactive
              ]}
            >
              <ThemedText
                variant="caption"
                style={[
                  styles.presetText,
                  isSelected ? styles.presetTextActive : styles.presetTextInactive
                ]}
              >
                {p.label}
              </ThemedText>
              {isSelected && <Check size={12} color={colors.primary} style={{ marginLeft: 3 }} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date Range Description Label */}
      <View style={styles.rangeInfoRow}>
        <Calendar size={13} color={colors.inkMuted} />
        <ThemedText variant="caption" color={colors.inkMuted} style={styles.rangeInfoText}>
          {value.startDate} to {value.endDate}
        </ThemedText>
      </View>

      {/* Custom Range Selection Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText variant="heading3">Custom Date Range</ThemedText>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={20} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ThemedText variant="caption" color={colors.inkMuted} style={{ marginBottom: 12 }}>
                Enter date boundaries in YYYY-MM-DD format (maximum 366 days).
              </ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText variant="caption" style={styles.inputLabel}>
                  Start Date
                </ThemedText>
                <TextInput
                  value={customStart}
                  onChangeText={setCustomStart}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.inkFaint}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText variant="caption" style={styles.inputLabel}>
                  End Date
                </ThemedText>
                <TextInput
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.inkFaint}
                  style={styles.textInput}
                />
              </View>

              {errorMsg && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={14} color={colors.error} />
                  <ThemedText variant="caption" color={colors.error} style={{ flex: 1, marginLeft: 6 }}>
                    {errorMsg}
                  </ThemedText>
                </View>
              )}

              <View style={styles.modalFooter}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  onPress={() => setIsModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing.xs }}
                />
                <Button
                  title="Apply Range"
                  variant="primary"
                  size="sm"
                  onPress={handleApplyCustom}
                  style={{ flex: 1, marginLeft: spacing.xs }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs
  },
  presetsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.canvasSoft,
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 4
  },
  presetPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  presetPillActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  presetPillInactive: {
    backgroundColor: "transparent"
  },
  presetText: {
    fontSize: 11,
    fontWeight: "600"
  },
  presetTextActive: {
    color: colors.primary,
    fontWeight: "700"
  },
  presetTextInactive: {
    color: colors.inkMuted
  },
  rangeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    gap: 4
  },
  rangeInfoText: {
    fontSize: 11,
    fontWeight: "500"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  closeBtn: {
    padding: 4
  },
  modalBody: {
    gap: spacing.sm
  },
  inputGroup: {
    gap: 4
  },
  inputLabel: {
    fontWeight: "600",
    color: colors.ink
  },
  textInput: {
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
    fontFamily: "Inter_400Regular"
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)"
  },
  modalFooter: {
    flexDirection: "row",
    marginTop: spacing.md
  }
});
