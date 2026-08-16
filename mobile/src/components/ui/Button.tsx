import {
  Pressable,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  StyleSheet
} from "react-native";
import { colors, spacing, radius } from "../../theme";
import { ThemedText } from "./ThemedText";

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "utility" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  fullWidth = false
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isUtility = variant === "utility";
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";

  const getBackgroundColor = (pressed: boolean) => {
    if (isPrimary) return pressed ? colors.primaryActive : colors.primary;
    if (isSecondary) return pressed ? colors.canvasSoft : colors.surface;
    if (isUtility) return pressed ? colors.canvasSoft : colors.surface;
    if (isDanger) return pressed ? "#c0392b" : "#e74c3c";
    return "transparent";
  };

  const getTextColor = () => {
    if (isPrimary || isDanger) return colors.onPrimary;
    if (isGhost) return colors.primary;
    return colors.ink;
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.pill,
        isSecondary && styles.pill,
        isUtility && styles.roundedUtility,
        isGhost && styles.ghost,
        isDanger && styles.pill,
        size === "sm" && styles.sizeSm,
        size === "md" && styles.sizeMd,
        size === "lg" && styles.sizeLg,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: isSecondary || isUtility ? colors.hairline : "transparent",
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <ThemedText
          variant={size === "sm" ? "caption" : "button"}
          style={{ color: getTextColor(), fontWeight: isUtility ? "600" : "500" }}
        >
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexDirection: "row"
  },
  pill: {
    borderRadius: radius.full
  },
  roundedUtility: {
    borderRadius: radius.md
  },
  ghost: {
    borderRadius: radius.md,
    borderWidth: 0
  },
  sizeSm: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    minHeight: 32
  },
  sizeMd: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 44
  },
  sizeLg: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 50
  },
  fullWidth: {
    width: "100%"
  }
});
