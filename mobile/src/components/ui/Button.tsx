import React from "react";
import {
  Pressable,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  StyleSheet
} from "react-native";

import { colors, spacing, radius } from "../../theme";
import { ThemedText } from "./ThemedText";

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "utility" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isUtility = variant === "utility";
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";
  const isOutline = variant === "outline";

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return isPrimary ? "#88b7e8" : colors.canvasSoft;
    if (isPrimary) return pressed ? colors.primaryActive : colors.primary;
    if (isSecondary) return pressed ? colors.canvasSoft : colors.surface;
    if (isUtility) return pressed ? colors.canvasSoft : colors.surface;
    if (isDanger) return pressed ? "#c0392b" : colors.error;
    if (isOutline) return pressed ? colors.canvasSoft : "transparent";
    return "transparent";
  };

  const getTextColor = () => {
    if (disabled) return isPrimary ? colors.onPrimary : colors.inkFaint;
    if (isPrimary || isDanger) return colors.onPrimary;
    if (isGhost) return colors.primary;
    if (isOutline) return colors.primary;
    return colors.ink;
  };

  const getBorderColor = () => {
    if (isSecondary || isUtility) return colors.hairline;
    if (isOutline) return colors.inputBorder;
    return "transparent";
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
        isOutline && styles.roundedUtility,
        size === "sm" && styles.sizeSm,
        size === "md" && styles.sizeMd,
        size === "lg" && styles.sizeLg,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          transform: [{ scale: pressed && !disabled && !loading ? 0.98 : 1 }]
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
          <ThemedText
            variant={size === "sm" ? "caption" : "button"}
            style={[
              {
                color: getTextColor(),
                fontWeight: isPrimary || isDanger ? "600" : isUtility ? "600" : "500",
                letterSpacing: -0.1
              },
              textStyle
            ]}
          >
            {title}
          </ThemedText>
        </>
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
    paddingVertical: spacing.xxs + 1,
    paddingHorizontal: spacing.sm,
    minHeight: 32
  },
  sizeMd: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 44
  },
  sizeLg: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 50
  },
  fullWidth: {
    width: "100%"
  }
});

