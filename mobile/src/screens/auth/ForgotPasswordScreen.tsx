import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { forgotPasswordSchema } from "@lifeos/shared";
import { authApi } from "../../services/apiClient";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { colors, spacing } from "../../theme";

export function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setErrors({});
    setSuccessMessage(null);

    const validationResult = forgotPasswordSchema.safeParse({ email });
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      setSuccessMessage(res.message || "If an account exists, a password reset link has been dispatched.");
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to submit request.";
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <ThemedText variant="heading2" style={styles.title}>
          Reset Password
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.subtitle}>
          Enter your email to receive a password reset link
        </ThemedText>
      </View>

      <Card style={styles.card}>
        {successMessage ? (
          <View style={styles.successBox}>
            <ThemedText variant="caption" color={colors.success}>
              {successMessage}
            </ThemedText>
          </View>
        ) : null}

        {errors.general ? (
          <View style={styles.generalError}>
            <ThemedText variant="caption" color={colors.error}>
              {errors.general}
            </ThemedText>
          </View>
        ) : null}

        <TextInput
          label="Email address"
          placeholder="jane@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />

        <Button
          title="Send Reset Link"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleSubmit}
          style={styles.submitButton}
        />

        <Button
          title="Back to Sign In"
          variant="ghost"
          size="md"
          fullWidth
          onPress={() => navigation.navigate("Login")}
          style={styles.backButton}
        />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: "center"
  },
  title: {
    color: colors.ink,
    letterSpacing: -0.625
  },
  subtitle: {
    color: colors.inkMuted,
    marginTop: spacing.xxs,
    textAlign: "center"
  },
  card: {
    padding: spacing.lg
  },
  successBox: {
    backgroundColor: "#f0fff4",
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  generalError: {
    backgroundColor: "#fff0f0",
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  submitButton: {
    marginTop: spacing.xs
  },
  backButton: {
    marginTop: spacing.xs
  }
});
