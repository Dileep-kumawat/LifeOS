import { Text, TextProps } from "react-native";
import { type as textStyles } from "../../theme";

export interface ThemedTextProps extends TextProps {
  variant?: keyof typeof textStyles;
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
        textStyles[variant],
        color ? { color } : undefined,
        style
      ]}
      {...props}
    />
  );
}
