import { View, ViewProps, StyleSheet } from "react-native";
import { colors, radius, spacing, shadows } from "../../theme";

export interface CardProps extends ViewProps {
  elevated?: boolean;
  variant?: "surface" | "canvasSoft";
}

export function Card({
  elevated = false,
  variant = "surface",
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === "canvasSoft" ? styles.canvasSoft : styles.surface,
        elevated ? shadows.raised : styles.flatBorder,
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg, // 12px per DESIGN.md
    padding: spacing.md
  },
  surface: {
    backgroundColor: colors.surface
  },
  canvasSoft: {
    backgroundColor: colors.canvasSoft
  },
  flatBorder: {
    borderWidth: 1,
    borderColor: colors.hairline
  }
});
