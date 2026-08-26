import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { registerSchema } from "@lifeos/shared";
import { authApi } from "../../services/apiClient";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { colors, spacing } from "../../theme";

export function RegisterScreen({ navigation }: { navigation: any }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setErrors({});
    const validationResult = registerSchema.safeParse({ name, email, password });
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
      await authApi.register({ name, email, password });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to register account.";
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.containerContent}>
      <View style={styles.header}>
        <ThemedText variant="heading1" style={styles.title}>
          Create Account
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.subtitle}>
          Get started with LifeOS
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
          label="Full Name"
          placeholder="Jane Doe"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />

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
          placeholder="Min 10 chars, letter + number"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <Button
          title="Create Account"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleRegister}
          style={styles.registerButton}
        />
      </Card>

      <View style={styles.footer}>
        <ThemedText variant="bodySm" color={colors.inkMuted}>
          Already have an account?{" "}
        </ThemedText>
        <Button
          title="Sign In"
          variant="ghost"
          size="sm"
          onPress={() => navigation.navigate("Login")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  containerContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: spacing.lg
  },
  header: {
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
  registerButton: {
    marginTop: spacing.sm
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg
  }
});
