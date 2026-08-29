import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput as RNTextInput } from "react-native";
import { Sparkles, CheckCircle2, AlertCircle, FileText, Eye, Edit3 } from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { colors, radius, spacing } from "../../theme";
import type { OcrNoteDraft, OcrNoteLine } from "@lifeos/shared";

export interface MobileOCRPreviewCardProps {
  draft: OcrNoteDraft;
  onTitleChange?: (title: string) => void;
  onBodyChange?: (bodyText: string) => void;
}

export function MobileOCRPreviewCard({
  draft,
  onTitleChange,
  onBodyChange
}: MobileOCRPreviewCardProps) {
  const [title, setTitle] = useState(draft.title || "");
  const [bodyText, setBodyText] = useState(draft.bodyText || "");
  const [lines, setLines] = useState<OcrNoteLine[]>(draft.lines || []);
  const [activeTab, setActiveTab] = useState<"lines" | "full">("lines");

  useEffect(() => {
    setTitle(draft.title || "");
    setBodyText(draft.bodyText || "");
    setLines(draft.lines || []);
  }, [draft]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const handleBodyChange = (newBody: string) => {
    setBodyText(newBody);
    onBodyChange?.(newBody);

    const newLines = newBody.split("\n").filter((l) => l.trim().length > 0);
    setLines(
      newLines.map((text) => ({
        text,
        isLowConfidence: false
      }))
    );
  };

  const handleLineTextChange = (index: number, newText: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], text: newText };
    setLines(updated);

    const fullText = updated.map((l) => l.text).join("\n");
    setBodyText(fullText);
    onBodyChange?.(fullText);
  };

  const lowConfidenceCount = lines.filter((l) => l.isLowConfidence).length;
  const confidencePercent =
    typeof draft.overallConfidence === "number"
      ? Math.round(draft.overallConfidence * 100)
      : null;

  const isEmpty = !bodyText.trim() && lines.length === 0;

  if (isEmpty) {
    return (
      <Card style={styles.emptyCard}>
        <FileText size={36} color={colors.inkMuted} style={{ alignSelf: "center", marginBottom: spacing.xs }} />
        <ThemedText variant="heading3" style={{ textAlign: "center" }}>
          No Text Detected
        </ThemedText>
        <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center", marginTop: 4 }}>
          The OCR engine could not recognize readable text in this photo. Please retake with better lighting or start a blank note.
        </ThemedText>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      {/* Badges & Meta strip */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View style={styles.pillBadge}>
            <Sparkles size={12} color={colors.primary} />
            <ThemedText variant="caption" color={colors.inkSecondary} style={styles.badgeText}>
              OCR Draft
            </ThemedText>
          </View>

          {confidencePercent !== null && (
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
                {confidencePercent}% Confidence
              </ThemedText>
            </View>
          )}
        </View>

        {/* View Switcher */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            onPress={() => setActiveTab("lines")}
            style={[styles.tabBtn, activeTab === "lines" && styles.tabBtnActive]}
          >
            <Eye size={12} color={activeTab === "lines" ? colors.primary : colors.inkMuted} />
            <ThemedText
              variant="caption"
              color={activeTab === "lines" ? colors.primary : colors.inkMuted}
              style={{ fontWeight: "600" }}
            >
              Lines
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("full")}
            style={[styles.tabBtn, activeTab === "full" && styles.tabBtnActive]}
          >
            <Edit3 size={12} color={activeTab === "full" ? colors.primary : colors.inkMuted} />
            <ThemedText
              variant="caption"
              color={activeTab === "full" ? colors.primary : colors.inkMuted}
              style={{ fontWeight: "600" }}
            >
              Plain Text
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Low-confidence Warning Cue */}
      {lowConfidenceCount > 0 && (
        <View style={styles.warningBox}>
          <AlertCircle size={14} color={colors.accentOrange} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="caption" color={colors.accentOrangeDeep} style={{ fontWeight: "700" }}>
              {lowConfidenceCount} line{lowConfidenceCount > 1 ? "s" : ""} flagged for review
            </ThemedText>
            <ThemedText variant="caption" color={colors.accentOrangeDeep} style={{ fontSize: 11 }}>
              Highlighted in amber. Please verify for any OCR mistranscriptions.
            </ThemedText>
          </View>
        </View>
      )}

      {/* Title Field */}
      <View style={styles.section}>
        <ThemedText variant="eyebrow" color={colors.inkMuted}>
          Title (Heuristic Pre-fill)
        </ThemedText>
        <RNTextInput
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Note title..."
          placeholderTextColor={colors.inkFaint}
          style={styles.titleInput}
        />
      </View>

      {/* Extracted Body Content */}
      <View style={styles.section}>
        <ThemedText variant="eyebrow" color={colors.inkMuted}>
          Extracted Content ({lines.length} lines)
        </ThemedText>

        {activeTab === "lines" ? (
          <ScrollView
            style={styles.linesScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {lines.map((line, idx) => (
              <View
                key={idx}
                style={[
                  styles.lineRow,
                  line.isLowConfidence && styles.lineRowWarning
                ]}
              >
                <ThemedText variant="caption" color={colors.inkFaint} style={styles.lineIndex}>
                  {idx + 1}
                </ThemedText>
                <RNTextInput
                  value={line.text}
                  onChangeText={(text) => handleLineTextChange(idx, text)}
                  style={styles.lineInput}
                  multiline={false}
                />
                {line.isLowConfidence && (
                  <View style={styles.checkPill}>
                    <ThemedText variant="caption" color={colors.accentOrangeDeep} style={{ fontSize: 10, fontWeight: "700" }}>
                      Check
                    </ThemedText>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <RNTextInput
            value={bodyText}
            onChangeText={handleBodyChange}
            placeholder="Extracted note text..."
            placeholderTextColor={colors.inkFaint}
            multiline
            numberOfLines={6}
            style={styles.textArea}
          />
        )}
      </View>
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
  section: {
    gap: 4
  },
  titleInput: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  linesScroll: {
    maxHeight: 180
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 4
  },
  lineRowWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A"
  },
  lineIndex: {
    width: 20,
    textAlign: "right",
    fontSize: 11
  },
  lineInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 2
  },
  checkPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: "#FEF3C7"
  },
  textArea: {
    minHeight: 100,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    textAlignVertical: "top"
  }
});
