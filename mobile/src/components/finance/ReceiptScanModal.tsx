import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Camera, Image as ImageIcon, RefreshCw, AlertTriangle, FilePlus, Receipt, CheckCircle2, Edit3 } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import { MobileReceiptPreviewCard } from "./MobileReceiptPreviewCard";
import { useOcrCapture } from "../../hooks/useOcrCapture";
import { parseReceiptOcr, type ParsedReceiptResult, DEFAULT_EXPENSE_CATEGORIES } from "@lifeos/shared";

export interface ReceiptScanModalProps {
  visible: boolean;
  onClose: () => void;
  categories?: string[];
  onSave: (txData: {
    amount: number;
    type: "expense";
    category: string;
    date: string;
    note: string;
    receiptAttachment: string | null;
  }) => Promise<void>;
  onOpenFormWithPrefill?: (
    prefill: {
      amount?: number;
      type: "expense";
      category?: string;
      date?: string;
      note?: string;
      receiptAttachment?: string | null;
    },
    fieldConfidence?: Record<string, { confidence: number; isLowConfidence: boolean }>
  ) => void;
  onOpenBlankForm?: () => void;
}

export function ReceiptScanModal({
  visible,
  onClose,
  categories = DEFAULT_EXPENSE_CATEGORIES,
  onSave,
  onOpenFormWithPrefill,
  onOpenBlankForm
}: ReceiptScanModalProps) {
  const ocrCapture = useOcrCapture();
  const [parsedResult, setParsedResult] = useState<ParsedReceiptResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      ocrCapture.reset();
      setParsedResult(null);
      setCustomError(null);
      setIsSaving(false);
    }
  }, [visible]);

  const handleCaptureCamera = async () => {
    setCustomError(null);
    const result = await ocrCapture.captureFromCamera();
    if (result) {
      if (!result.extractedText || !result.extractedText.trim()) {
        setCustomError("No readable text could be recognized on this receipt. Please try a clearer photo.");
        return;
      }
      const parsed = parseReceiptOcr(result, { categories });
      setParsedResult(parsed);
    }
  };

  const handlePickGallery = async () => {
    setCustomError(null);
    const result = await ocrCapture.pickFromGallery();
    if (result) {
      if (!result.extractedText || !result.extractedText.trim()) {
        setCustomError("No readable text could be recognized on this receipt. Please try a clearer photo.");
        return;
      }
      const parsed = parseReceiptOcr(result, { categories });
      setParsedResult(parsed);
    }
  };

  const handleSaveTransaction = async () => {
    if (!parsedResult) return;

    const amount = parsedResult.amount.value;
    if (amount === null || isNaN(amount) || amount <= 0) {
      setCustomError("Please enter a valid positive total amount.");
      return;
    }

    const resolvedCategory = parsedResult.category?.value || categories[0] || "Food";
    const resolvedDate = parsedResult.date.value
      ? `${parsedResult.date.value}T12:00:00.000Z`
      : new Date().toISOString();

    try {
      setIsSaving(true);
      setCustomError(null);

      await onSave({
        amount,
        type: "expense",
        category: resolvedCategory,
        date: resolvedDate,
        note: parsedResult.merchant.value || "Scanned Receipt",
        receiptAttachment: null
      });

      onClose();
    } catch (err: any) {
      setCustomError(err.message || "Failed to save receipt transaction");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInFullForm = () => {
    if (!parsedResult) return;
    onClose();

    const fieldConfidence: Record<string, { confidence: number; isLowConfidence: boolean }> = {
      amount: {
        confidence: parsedResult.amount.confidence,
        isLowConfidence: parsedResult.amount.isLowConfidence
      },
      merchant: {
        confidence: parsedResult.merchant.confidence,
        isLowConfidence: parsedResult.merchant.isLowConfidence
      },
      date: {
        confidence: parsedResult.date.confidence,
        isLowConfidence: parsedResult.date.isLowConfidence
      }
    };

    onOpenFormWithPrefill?.(
      {
        amount: parsedResult.amount.value ?? undefined,
        type: "expense",
        category: parsedResult.category?.value || categories[0] || "Food",
        date: parsedResult.date.value
          ? `${parsedResult.date.value}T12:00:00.000Z`
          : new Date().toISOString(),
        note: parsedResult.merchant.value || "",
        receiptAttachment: null
      },
      fieldConfidence
    );
  };

  const handleStartBlank = () => {
    onClose();
    onOpenBlankForm?.();
  };

  // Determine sub-states
  const isProcessing = ocrCapture.isProcessing;
  const isCapturing = ocrCapture.isCapturing;
  const hasError = Boolean(customError || ocrCapture.error);
  const isReview = Boolean(parsedResult && !isProcessing && !isCapturing && !hasError);
  const isScanPrompt = !isReview && !isProcessing && !isCapturing && !hasError;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isReview ? "Confirm Receipt Expense" : "Scan Receipt"}
      subtitle="Photographed receipt → structured expense pre-fill (FR-6.2, UC-3)"
    >
      <View style={styles.contentContainer}>
        {/* 1. Processing State */}
        {isProcessing && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText variant="bodyMd" style={{ fontWeight: "700", marginTop: spacing.sm }}>
              Extracting Receipt Data...
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center", marginTop: 4 }}>
              Analyzing merchant, amount, date, and category suggestions...
            </ThemedText>
          </View>
        )}

        {/* 2. Error State */}
        {hasError && !isProcessing && (
          <View style={styles.errorContainer}>
            <View style={styles.errorBanner}>
              <AlertTriangle size={20} color={colors.error} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodySm" color={colors.error} style={{ fontWeight: "700" }}>
                  Receipt Extraction Failed
                </ThemedText>
                <ThemedText variant="caption" color={colors.error}>
                  {customError || ocrCapture.error || "Unable to extract readable text from this receipt photo."}
                </ThemedText>
              </View>
            </View>

            <View style={styles.errorBtnRow}>
              <Button
                title="Log Manually"
                variant="outline"
                icon={<FilePlus size={16} color={colors.ink} />}
                onPress={handleStartBlank}
                style={{ flex: 1 }}
              />
              <Button
                title="Try Again"
                icon={<RefreshCw size={16} color={colors.onPrimary} />}
                onPress={() => {
                  ocrCapture.reset();
                  setCustomError(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* 3. Scanning Initial Prompt */}
        {isScanPrompt && (
          <View style={styles.promptContainer}>
            <View style={styles.promptIconBox}>
              <Receipt size={32} color={colors.primary} />
            </View>
            <ThemedText variant="heading3" style={{ textAlign: "center" }}>
              Scan a Paper Receipt
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.promptDescription}>
              Take a clear, top-down photo of your paper receipt or select a screenshot from your gallery to auto-fill amount, merchant, and date.
            </ThemedText>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => void handleCaptureCamera()}
                style={styles.primaryActionBtn}
                activeOpacity={0.8}
              >
                <Camera size={20} color={colors.onPrimary} />
                <ThemedText variant="bodyMd" color={colors.onPrimary} style={{ fontWeight: "700" }}>
                  Take Receipt Photo
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handlePickGallery()}
                style={styles.secondaryActionBtn}
                activeOpacity={0.8}
              >
                <ImageIcon size={20} color={colors.ink} />
                <ThemedText variant="bodyMd" color={colors.ink} style={{ fontWeight: "600" }}>
                  Choose from Gallery
                </ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleStartBlank}
              style={styles.manualEntryLink}
            >
              <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: "600" }}>
                Enter Expense Manually Instead
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Review State: Pre-filled Receipt Review */}
        {isReview && parsedResult && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.reviewScroll}
            nestedScrollEnabled
          >
            {customError && (
              <View style={styles.inlineErrorBox}>
                <AlertTriangle size={14} color={colors.error} />
                <ThemedText variant="caption" color={colors.error} style={{ flex: 1 }}>
                  {customError}
                </ThemedText>
              </View>
            )}

            <MobileReceiptPreviewCard
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

            {/* Action Bar */}
            <View style={styles.reviewActions}>
              <Button
                title={isSaving ? "Saving..." : "Confirm & Save Expense"}
                icon={<CheckCircle2 size={16} color={colors.onPrimary} />}
                onPress={handleSaveTransaction}
                disabled={isSaving}
              />

              <View style={styles.reviewSubActions}>
                <Button
                  title="Edit in Full Form"
                  variant="outline"
                  icon={<Edit3 size={15} color={colors.ink} />}
                  onPress={handleOpenInFullForm}
                  disabled={isSaving}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Rescan"
                  variant="outline"
                  icon={<RefreshCw size={15} color={colors.ink} />}
                  onPress={() => {
                    ocrCapture.reset();
                    setParsedResult(null);
                  }}
                  disabled={isSaving}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: spacing.xs
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl
  },
  promptContainer: {
    alignItems: "center",
    paddingVertical: spacing.md
  },
  promptIconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  promptDescription: {
    textAlign: "center",
    marginTop: 4,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md
  },
  actionButtons: {
    width: "100%",
    gap: spacing.sm
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 14,
    borderRadius: radius.md
  },
  manualEntryLink: {
    marginTop: spacing.md,
    padding: spacing.xs
  },
  errorContainer: {
    gap: spacing.md,
    paddingVertical: spacing.sm
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  errorBtnRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  reviewScroll: {
    gap: spacing.sm,
    paddingBottom: spacing.sm
  },
  inlineErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  reviewActions: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  reviewSubActions: {
    flexDirection: "row",
    gap: spacing.xs
  }
});
