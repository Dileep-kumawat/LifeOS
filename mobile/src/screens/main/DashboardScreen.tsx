import { View, StyleSheet } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { colors, spacing } from "../../theme";

export function DashboardScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <ThemedText variant="heading2">
          Welcome back, {user?.name || "there"}
        </ThemedText>
        <ThemedText variant="bodySm" color={colors.inkMuted}>
          LifeOS Mobile Dashboard
        </ThemedText>
      </View>

      <Card style={styles.card}>
        <ThemedText variant="title" style={styles.cardTitle}>
          System Status
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.cardBody}>
          ✓ Mobile Scaffolding & Navigation Active
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.cardBody}>
          ✓ Online-First Auth & Zustand Store Ready
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.cardBody}>
          ✓ Local SQLite Schema (Phases 1–4) Initialized
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.cardBody}>
          ✓ SecureStore Hardware Token Encryption Active
        </ThemedText>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
    marginTop: spacing.xs
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.md
  },
  cardTitle: {
    marginBottom: spacing.sm,
    color: colors.primary
  },
  cardBody: {
    marginBottom: spacing.xs,
    color: colors.inkSecondary
  }
});
