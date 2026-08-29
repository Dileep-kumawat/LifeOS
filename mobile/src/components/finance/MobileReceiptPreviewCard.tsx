import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput as RNTextInput } from "react-native";
import { Sparkles, CheckCircle2, AlertCircle, Receipt, Eye, Edit3, Store, DollarSign, Calendar, Tag, ListOrdered } from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { colors, radius, spacing } from "../../theme";
import type { ParsedReceiptResult } from "@lifeos/shared";

export interface MobileReceiptPreviewCardProps {
  parsedReceipt: ParsedReceiptResult;
  onMerchantChange?: (merchant: string) => void;
  onAmountChange?: (amount: number | null) => void;
  onDateChange?: (date: string | null) => void;
}

export function MobileReceiptPreviewCard({
  parsedReceipt,
  onMerchantChange,
  onAmountChange,
  onDateChange
}: MobileReceiptPreviewCardProps) {
  const [merchant, setMerchant] = useState(parsedReceipt.merchant.value || "");
  const [amountStr, setAmountStr] = useState(
    parsedReceipt.amount.value !== null ? String(parsedReceipt.amount.value) : ""
  );
  const [dateStr, setDateStr] = useState(parsedReceipt.date.value || "");
  const [activeTab, setActiveTab] = useState<"fields" | "raw">("fields");

  useEffect(() => {
    setMerchant(parsedReceipt.merchant.value || "");
    setAmountStr(
      parsedReceipt.amount.value !== null ? String(parsedReceipt.amount.value) : ""
    );
    setDateStr(parsedReceipt.date.value || "");
  }, [parsedReceipt]);

  const handleMerchantChange = (text: string) => {
    setMerchant(text);
    onMerchantChange?.(text);
  };

  const handleAmountChange = (text: string) => {
    setAmountStr(text);
    const parsed = parseFloat(text);
    onAmountChange?.(!isNaN(parsed) && parsed > 0 ? parsed : null);
  };

  const handleDateChange = (text: string) => {
    setDateStr(text);
    onDateChange?.(text || null);
  };

  const confidencePercent = Math.round(parsedReceipt.overallConfidence * 100);

  const lowConfidenceFields: string[] = [];
  if (parsedReceipt.merchant.isLowConfidence || !parsedReceipt.merchant.value) {
    lowConfidenceFields.push("Merchant");
  }
  if (parsedReceipt.amount.isLowConfidence || parsedReceipt.amount.value === null) {
    lowConfidenceFields.push("Amount");
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
      <Card style={styles.emptyCard}>
        <Receipt size={36} color={colors.inkMuted} style={{ alignSelf: "center", marginBottom: spacing.xs }} />
        <ThemedText variant="heading3" style={{ textAlign: "center" }}>
          No Receipt Data Detected
        </ThemedText>
        <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center", marginTop: 4 }}>
          The OCR engine could not recognize readable fields. Please retake the photo with better lighting or enter expense manually.
        </ThemedText>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      {/* Header Badges */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View style={styles.pillBadge}>
            <Sparkles size={12} color={colors.primary} />
            <ThemedText variant="caption" color={colors.inkSecondary} style={styles.badgeText}>
              Receipt OCR
            </ThemedText>
          </View>

          <View
            style={[
              styles.pillBadge,
              confidencePercent >= 80
                ? styles.badgeHigh
                : confidencePercent >= 50
                  ? styles.badgeMedium
                  : styles.badgeLow
            ]}
          >
            {confidencePercent >= 80 ? (
              <CheckCircle2 size={12} color={colors.accentGreen} />
            ) : (
              <AlertCircle size={12} color={colors.accentOrange} />
            )}
            <ThemedText
              variant="caption"
              color={
                confidencePercent >= 80
                  ? colors.accentGreen
                  : confidencePercent >= 50
                    ? colors.accentOrange
                    : colors.error
              }
              style={styles.badgeText}
            >
              {confidencePercent}%
            </ThemedText>
          </View>
        </View>

        {/* View Switcher */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            onPress={() => setActiveTab("fields")}
            style={[styles.tabBtn, activeTab === "fields" && styles.tabBtnActive]}
          >
            <Edit3 size={12} color={activeTab === "fields" ? colors.primary : colors.inkMuted} />
            <ThemedText
              variant="caption"
              color={activeTab === "fields" ? colors.primary : colors.inkMuted}
              style={{ fontWeight: "600", fontSize: 11 }}
            >
              Fields
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("raw")}
            style={[styles.tabBtn, activeTab === "raw" && styles.tabBtnActive]}
          >
            <Eye size={12} color={activeTab === "raw" ? colors.primary : colors.inkMuted} />
            <ThemedText
              variant="caption"
              color={activeTab === "raw" ? colors.primary : colors.inkMuted}
              style={{ fontWeight: "600", fontSize: 11 }}
            >
              Raw Text
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Warning cue if low confidence */}
      {lowConfidenceFields.length > 0 && (
        <View style={styles.warningBox}>
          <AlertCircle size={14} color={colors.accentOrange} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="caption" color={colors.accentOrangeDeep} style={{ fontWeight: "700" }}>
              {lowConfidenceFields.length} field{lowConfidenceFields.length > 1 ? "s" : ""} need review:{" "}
              {lowConfidenceFields.join(", ")}
            </ThemedText>
            <ThemedText variant="caption" color={colors.accentOrangeDeep} style={{ fontSize: 11 }}>
              Please verify or edit highlighted fields before confirming.
            </ThemedText>
          </View>
        </View>
      )}

      {/* Extracted Fields Tab */}
      {activeTab === "fields" ? (
        <View style={styles.fieldsContainer}>
          {/* Merchant */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <View style={styles.labelWithIcon}>
                <Store size={12} color={colors.primary} />
                <ThemedText variant="eyebrow" color={colors.inkMuted}>
                  Merchant
                </ThemedText>
              </View>
              {parsedReceipt.merchant.isLowConfidence ? (
                <View style={styles.checkBadge}>
                  <ThemedText variant="caption" color={colors.accentOrangeDeep} style={styles.checkBadgeText}>
                    Check Merchant
                  </ThemedText>
                </View>
              ) : (
                <ThemedText variant="caption" color={colors.inkFaint} style={{ fontSize: 10 }}>
                  {Math.round(parsedReceipt.merchant.confidence * 100)}%
                </ThemedText>
              )}
            </View>
            <RNTextInput
              value={merchant}
              onChangeText={handleMerchantChange}
              placeholder="e.g. Starbucks, Target..."
              placeholderTextColor={colors.inkFaint}
              style={[
                styles.textInput,
                parsedReceipt.merchant.isLowConfidence && styles.inputWarning
              ]}
            />
          </View>

          {/* Amount & Date side-by-side */}
          <View style={styles.rowTwoCols}>
            {/* Amount */}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <View style={styles.labelRow}>
                <View style={styles.labelWithIcon}>
                  <DollarSign size={12} color={colors.accentGreen} />
                  <ThemedText variant="eyebrow" color={colors.inkMuted}>
                    Amount
                  </ThemedText>
                </View>
                {parsedReceipt.amount.isLowConfidence && (
                  <View style={styles.checkBadge}>
                    <ThemedText variant="caption" color={colors.accentOrangeDeep} style={styles.checkBadgeText}>
                      Check
                    </ThemedText>
                  </View>
                )}
              </View>
              <RNTextInput
                value={amountStr}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={colors.inkFaint}
                style={[
                  styles.textInput,
                  styles.boldInput,
                  parsedReceipt.amount.isLowConfidence && styles.inputWarning
                ]}
              />
            </View>

            {/* Date */}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <View style={styles.labelRow}>
                <View style={styles.labelWithIcon}>
                  <Calendar size={12} color={colors.primary} />
                  <ThemedText variant="eyebrow" color={colors.inkMuted}>
                    Date
                  </ThemedText>
                </View>
                {parsedReceipt.date.isLowConfidence && (
                  <View style={styles.checkBadge}>
                    <ThemedText variant="caption" color={colors.accentOrangeDeep} style={styles.checkBadgeText}>
                      Check
                    </ThemedText>
                  </View>
                )}
              </View>
              <RNTextInput
                value={dateStr}
                onChangeText={handleDateChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.inkFaint}
                style={[
                  styles.textInput,
                  parsedReceipt.date.isLowConfidence && styles.inputWarning
                ]}
              />
            </View>
          </View>

          {/* Suggested Category */}
          {parsedReceipt.category?.value && (
            <View style={styles.categoryRow}>
              <View style={styles.labelWithIcon}>
                <Tag size={12} color="#9333EA" />
                <ThemedText variant="eyebrow" color={colors.inkMuted}>
                  Suggested Category:
                </ThemedText>
              </View>
              <View style={styles.categoryPill}>
                <ThemedText variant="caption" color="#6B21A8" style={{ fontWeight: "700" }}>
                  {parsedReceipt.category.value}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Line Items Preview (if detected) */}
          {parsedReceipt.lineItems && parsedReceipt.lineItems.length > 0 && (
            <View style={styles.lineItemsContainer}>
              <View style={styles.labelWithIcon}>
                <ListOrdered size={12} color={colors.inkMuted} />
                <ThemedText variant="eyebrow" color={colors.inkMuted}>
                  Line Items ({parsedReceipt.lineItems.length})
                </ThemedText>
              </View>
              <ScrollView
                style={styles.lineItemsScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {parsedReceipt.lineItems.map((item, idx) => (
                  <View key={idx} style={styles.lineItemRow}>
                    <ThemedText variant="caption" color={colors.ink} style={{ flex: 1 }} numberOfLines={1}>
                      {item.description}
                    </ThemedText>
                    {item.amount !== undefined && (
                      <ThemedText variant="caption" color={colors.inkSecondary} style={{ fontWeight: "600" }}>
                        ₹{item.amount.toFixed(2)}
                      </ThemedText>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      ) : (
        <RNTextInput
          value={parsedReceipt.rawText}
          editable={false}
          multiline
          numberOfLines={8}
          style={styles.rawTextArea}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface
  },
  emptyCard: {
    padding: spacing.xl,
    backgroundColor: colors.canvasSoft
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    paddingBottom: spacing.xs
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  badgeText: {
    fontWeight: "600",
    fontSize: 11
  },
  badgeHigh: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0"
  },
  badgeMedium: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A"
  },
  badgeLow: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA"
  },
  tabToggle: {
    flexDirection: "row",
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.xs
  },
  tabBtnActive: {
    backgroundColor: colors.surface
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A"
  },
  fieldsContainer: {
    gap: spacing.sm
  },
  inputGroup: {
    gap: 3
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  labelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  checkBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.xs
  },
  checkBadgeText: {
    fontSize: 9,
    fontWeight: "700"
  },
  rowTwoCols: {
    flexDirection: "row",
    gap: spacing.sm
  },
  textInput: {
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  boldInput: {
    fontWeight: "700"
  },
  inputWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A"
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  categoryPill: {
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full
  },
  lineItemsContainer: {
    marginTop: 2,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: spacing.xs
  },
  lineItemsScroll: {
    maxHeight: 90,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.xs,
    padding: 6
  },
  lineItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2
  },
  rawTextArea: {
    minHeight: 120,
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.inkSecondary,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    textAlignVertical: "top"
  }
});
