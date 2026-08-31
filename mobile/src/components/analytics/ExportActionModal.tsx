import { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Share,
  Platform
} from "react-native";
import { Download, FileSpreadsheet, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Button } from "../ui/Button";
import { analyticsApiService } from "../../services/analyticsApiService";
import { colors, spacing, radius } from "../../theme";

export interface ExportActionModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: "productivity" | "finance";
  startDate: string;
  endDate: string;
}

export function ExportActionModal({
  visible,
  onClose,
  defaultType = "productivity",
  startDate,
  endDate
}: ExportActionModalProps) {
  const [selectedType, setSelectedType] = useState<"productivity" | "finance">(defaultType);
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "pdf">("csv");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const data = await analyticsApiService.exportAnalytics({
        type: selectedType,
        format: selectedFormat,
        startDate,
        endDate
      });

      const title = `LifeOS ${selectedType.toUpperCase()} Report (${startDate} to ${endDate})`;
      const filename = `lifeos-${selectedType}-${startDate}-to-${endDate}.${selectedFormat}`;

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          const blob = new Blob([data], {
            type: selectedFormat === "csv" ? "text/csv;charset=utf-8;" : "application/pdf"
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } else {
        const shareContent =
          typeof data === "string" && data.length < 50000
            ? data
            : `${title}\n\nGenerated from LifeOS for ${startDate} to ${endDate}.`;

        await Share.share({
          title,
          message: shareContent
        });
      }

      setSuccessMsg("Export generated successfully!");
      setTimeout(() => {
        setIsLoading(false);
        setSuccessMsg(null);
        onClose();
      }, 1800);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Failed to generate export file.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !isLoading && onClose()}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Download size={18} color={colors.primary} />
              <ThemedText variant="heading3">Export Report</ThemedText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isLoading}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          <ThemedText variant="caption" color={colors.inkMuted} style={{ marginBottom: 12 }}>
            Generate and share analytics data for {startDate} to {endDate}.
          </ThemedText>

          {/* 1. Domain Selector */}
          <View style={styles.sectionGroup}>
            <ThemedText variant="caption" style={styles.sectionLabel}>
              Report Category
            </ThemedText>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isLoading}
                onPress={() => setSelectedType("productivity")}
                style={[
                  styles.selectorPill,
                  selectedType === "productivity" && styles.selectorPillActive
                ]}
              >
                <ThemedText
                  variant="caption"
                  style={[
                    styles.selectorText,
                    selectedType === "productivity" && styles.selectorTextActive
                  ]}
                >
                  Productivity
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isLoading}
                onPress={() => setSelectedType("finance")}
                style={[
                  styles.selectorPill,
                  selectedType === "finance" && styles.selectorPillActive
                ]}
              >
                <ThemedText
                  variant="caption"
                  style={[
                    styles.selectorText,
                    selectedType === "finance" && styles.selectorTextActive
                  ]}
                >
                  Finance
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Format Selector */}
          <View style={styles.sectionGroup}>
            <ThemedText variant="caption" style={styles.sectionLabel}>
              File Format
            </ThemedText>
            <View style={styles.formatCardsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isLoading}
                onPress={() => setSelectedFormat("csv")}
                style={[
                  styles.formatCard,
                  selectedFormat === "csv" && styles.formatCardActive
                ]}
              >
                <FileSpreadsheet
                  size={20}
                  color={selectedFormat === "csv" ? colors.primary : colors.inkMuted}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <ThemedText variant="bodySm" style={{ fontWeight: "700" }}>
                    CSV
                  </ThemedText>
                  <ThemedText variant="caption" color={colors.inkMuted} style={{ fontSize: 10 }}>
                    Tabular data
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isLoading}
                onPress={() => setSelectedFormat("pdf")}
                style={[
                  styles.formatCard,
                  selectedFormat === "pdf" && styles.formatCardActive
                ]}
              >
                <FileText
                  size={20}
                  color={selectedFormat === "pdf" ? "#DC2626" : colors.inkMuted}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <ThemedText variant="bodySm" style={{ fontWeight: "700" }}>
                    PDF
                  </ThemedText>
                  <ThemedText variant="caption" color={colors.inkMuted} style={{ fontSize: 10 }}>
                    Styled report
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Messages */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <AlertCircle size={14} color={colors.error} />
              <ThemedText variant="caption" color={colors.error} style={{ flex: 1, marginLeft: 6 }}>
                {errorMsg}
              </ThemedText>
            </View>
          )}

          {successMsg && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={14} color={colors.success} />
              <ThemedText
                variant="caption"
                color={colors.success}
                style={{ flex: 1, marginLeft: 6, fontWeight: "600" }}
              >
                {successMsg}
              </ThemedText>
            </View>
          )}

          {/* Actions */}
          <View style={styles.footerRow}>
            <Button
              title="Cancel"
              variant="secondary"
              size="sm"
              disabled={isLoading}
              onPress={onClose}
              style={{ flex: 1, marginRight: spacing.xs }}
            />
            <Button
              title={isLoading ? "Generating..." : "Export & Share"}
              variant="primary"
              size="sm"
              disabled={isLoading}
              onPress={handleExport}
              style={{ flex: 1, marginLeft: spacing.xs }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  closeBtn: {
    padding: 4
  },
  sectionGroup: {
    marginBottom: spacing.sm,
    gap: 4
  },
  sectionLabel: {
    fontWeight: "600",
    color: colors.ink
  },
  typeSelectorRow: {
    flexDirection: "row",
    backgroundColor: colors.canvasSoft,
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 4
  },
  selectorPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  selectorPillActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  selectorText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.inkMuted
  },
  selectorTextActive: {
    color: colors.primary,
    fontWeight: "700"
  },
  formatCardsRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  formatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.canvasSoft,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  formatCardActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0, 117, 222, 0.06)"
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    marginBottom: spacing.xs
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    marginBottom: spacing.xs
  },
  footerRow: {
    flexDirection: "row",
    marginTop: spacing.md
  }
});
