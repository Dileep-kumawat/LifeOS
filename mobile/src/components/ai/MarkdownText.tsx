import React from "react";
import { View, StyleSheet, TextStyle } from "react-native";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";

interface MarkdownTextProps {
  content: string;
  style?: TextStyle;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, style }) => {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <View style={styles.container}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <View key={lineIdx} style={styles.paragraphSpacer} />;
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <ThemedText key={lineIdx} variant="heading3" style={[styles.header3, style]}>
              {renderFormattedInline(trimmed.replace(/^###\s+/, ""))}
            </ThemedText>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <ThemedText key={lineIdx} variant="heading2" style={[styles.header2, style]}>
              {renderFormattedInline(trimmed.replace(/^##\s+/, ""))}
            </ThemedText>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <ThemedText key={lineIdx} variant="heading1" style={[styles.header1, style]}>
              {renderFormattedInline(trimmed.replace(/^#\s+/, ""))}
            </ThemedText>
          );
        }

        // Unordered list item (- or *)
        if (/^[-*]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[-*]\s+/, "");
          return (
            <View key={lineIdx} style={styles.listRow}>
              <View style={styles.bulletDot} />
              <ThemedText variant="bodyMd" style={[styles.listText, style]}>
                {renderFormattedInline(bulletText)}
              </ThemedText>
            </View>
          );
        }

        // Ordered list item (1. 2. etc)
        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (orderedMatch) {
          const num = orderedMatch[1];
          const itemText = orderedMatch[2];
          return (
            <View key={lineIdx} style={styles.listRow}>
              <ThemedText variant="caption" style={styles.orderNumber}>
                {num}.
              </ThemedText>
              <ThemedText variant="bodyMd" style={[styles.listText, style]}>
                {renderFormattedInline(itemText)}
              </ThemedText>
            </View>
          );
        }

        // Code block line / quote
        if (trimmed.startsWith("```")) {
          return null; // Skip markdown fences
        }

        // Regular paragraph line
        return (
          <ThemedText key={lineIdx} variant="bodyMd" style={[styles.paragraph, style]}>
            {renderFormattedInline(trimmed)}
          </ThemedText>
        );
      })}
    </View>
  );
};

function renderFormattedInline(text: string): React.ReactNode[] {
  // Regex to match **bold**, *italic*, and `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const segments = text.split(regex);

  segments.forEach((seg, idx) => {
    if (!seg) return;

    if (seg.startsWith("**") && seg.endsWith("**")) {
      parts.push(
        <ThemedText key={idx} variant="bodyMd" style={styles.boldText}>
          {seg.slice(2, -2)}
        </ThemedText>
      );
    } else if (seg.startsWith("*") && seg.endsWith("*")) {
      parts.push(
        <ThemedText key={idx} variant="bodyMd" style={styles.italicText}>
          {seg.slice(1, -1)}
        </ThemedText>
      );
    } else if (seg.startsWith("`") && seg.endsWith("`")) {
      parts.push(
        <ThemedText key={idx} variant="caption" style={styles.inlineCode}>
          {seg.slice(1, -1)}
        </ThemedText>
      );
    } else {
      parts.push(seg);
    }
  });

  return parts;
}

const styles = StyleSheet.create({
  container: {
    gap: 3
  },
  paragraphSpacer: {
    height: 4
  },
  paragraph: {
    color: colors.ink,
    lineHeight: 22
  },
  header1: {
    marginTop: spacing.xs,
    marginBottom: 4,
    color: colors.ink
  },
  header2: {
    marginTop: spacing.xs,
    marginBottom: 3,
    color: colors.ink
  },
  header3: {
    marginTop: 4,
    marginBottom: 2,
    color: colors.ink
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingLeft: spacing.xs,
    marginVertical: 2
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: 8
  },
  orderNumber: {
    fontWeight: "700",
    color: colors.primary,
    width: 18,
    marginTop: 2
  },
  listText: {
    flex: 1,
    color: colors.ink,
    lineHeight: 22
  },
  boldText: {
    fontWeight: "700",
    color: colors.ink
  },
  italicText: {
    fontStyle: "italic",
    color: colors.inkSecondary
  },
  inlineCode: {
    fontFamily: "monospace",
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.hairline,
    color: colors.primary
  }
});
