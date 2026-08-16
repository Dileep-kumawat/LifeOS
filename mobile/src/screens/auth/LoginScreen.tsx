import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { loginSchema } from "@lifeos/shared";
import { authApi } from "../../services/apiClient";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { colors, spacing } from "../../theme";

export function LoginScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErrors({});
    const validationResult = loginSchema.safeParse({ email, password });
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
      await authApi.login({ email, password });
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to log in. Please check your credentials.";
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <ThemedText variant="heading1" style={styles.title}>
          LifeOS
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.subtitle}>
          Sign in to your personal operating system
        </ThemedText>
      </View>

      <Card style={styles.card}>
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

        <TextInput
          label="Password"
          placeholder="••••••••••"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <View style={styles.forgotRow}>
          <Button
            title="Forgot password?"
            variant="ghost"
            size="sm"
            onPress={() => navigation.navigate("ForgotPassword")}
          />
        </View>

        <Button
          title="Sign In"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleLogin}
          style={styles.signInButton}
        />
      </Card>

      <View style={styles.footer}>
        <ThemedText variant="bodySm" color={colors.inkMuted}>
          Don't have an account?{" "}
        </ThemedText>
        <Button
          title="Register"
          variant="ghost"
          size="sm"
          onPress={() => navigation.navigate("Register")}
        />
      </View>
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
    letterSpacing: -1
  },
  subtitle: {
    color: colors.inkMuted,
    marginTop: spacing.xxs,
    textAlign: "center"
  },
  card: {
    padding: spacing.lg
  },
  generalError: {
    backgroundColor: "#fff0f0",
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: spacing.md
  },
  signInButton: {
    marginTop: spacing.xs
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl
  }
});
