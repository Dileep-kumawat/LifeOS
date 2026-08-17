import { Text, TextProps } from "react-native";
import { typography } from "../../theme";

export interface ThemedTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: string;
}

export function ThemedText({
  variant = "bodyMd",
  color,
  style,
  ...props
}: ThemedTextProps) {
  return (
    <Text
      style={[
        typography[variant],
        color ? { color } : undefined,
        style
      ]}
      {...props}
    />
  );
}
