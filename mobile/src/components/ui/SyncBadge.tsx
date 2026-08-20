import { View, StyleSheet, TextStyle, ViewStyle } from "react-native";
import { CloudUpload, AlertCircle, Check } from "lucide-react-native";
import { ThemedText } from "./ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { SyncStatus } from "../../db/schema";

interface SyncBadgeProps {
  status: SyncStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
  style?: ViewStyle;
}

export function SyncBadge({ status, size = "sm", showLabel = false, style }: SyncBadgeProps) {
  if (status === "synced" && !showLabel) {
    return null;
  }

  const isSmall = size === "sm";
  const iconSize = isSmall ? 12 : 14;

  let bg: string = colors.canvasSoft;
  let fg: string = colors.inkMuted;
  let label = "Synced";
  let Icon = Check;

  if (status === "pending") {
    bg = "#FEF3C7"; // Amber light
    fg = "#D97706"; // Amber dark
    label = "Offline (Pending Sync)";
    Icon = CloudUpload;
  } else if (status === "conflict") {
    bg = "#FEE2E2"; // Red light
    fg = colors.error;
    label = "Conflict";
    Icon = AlertCircle;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.badgeSm, style]}>
      <Icon size={iconSize} color={fg} />
      {showLabel && (
        <ThemedText
          variant={isSmall ? "caption" : "bodySm"}
          style={[styles.text, { color: fg } as TextStyle]}
        >
          {label}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  text: {
    fontWeight: "500"
  }
});
