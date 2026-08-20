import { useState } from "react";
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle
} from "react-native";
import { colors, spacing, radius } from "../../theme";
import { ThemedText } from "./ThemedText";

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextInput({ label, error, containerStyle, style, ...props }: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ThemedText variant="caption" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <RNTextInput
        placeholderTextColor={colors.inkFaint}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error ? styles.inputError : undefined,
          style
        ]}
        {...props}
      />
      {error ? (
        <ThemedText variant="eyebrow" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: spacing.sm
  },
  label: {
    marginBottom: spacing.xxs + 1,
    color: colors.inkSecondary,
    fontWeight: "600",
    fontSize: 13
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radius.md, // 8px for modern clean inputs
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    fontSize: 15,
    color: colors.ink,
    minHeight: 44
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1.5
  },
  errorText: {
    marginTop: spacing.xxs,
    color: colors.error,
    fontSize: 12
  }
});
