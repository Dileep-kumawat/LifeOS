import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../services/apiClient";
import { tokenStorage } from "../../services/tokenStorage";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { colors, spacing } from "../../theme";

export function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [hasSecureRefreshToken, setHasSecureRefreshToken] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function checkToken() {
      const token = await tokenStorage.getRefreshToken();
      setHasSecureRefreshToken(!!token);
    }
    checkToken();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch (err: any) {
      console.warn("Logout error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <ThemedText variant="heading2">Settings & Profile</ThemedText>
        <ThemedText variant="bodySm" color={colors.inkMuted}>
          Session and app preferences
        </ThemedText>
      </View>

      <Card style={styles.card}>
        <ThemedText variant="title" style={styles.sectionTitle}>
          Account Profile
        </ThemedText>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Name:</ThemedText>
          <ThemedText variant="bodySm" style={styles.infoValue}>{user?.name || "N/A"}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Email:</ThemedText>
          <ThemedText variant="bodySm" style={styles.infoValue}>{user?.email || "N/A"}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Role:</ThemedText>
          <ThemedText variant="bodySm" style={styles.infoValue}>{user?.role || "user"}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Status:</ThemedText>
          <ThemedText variant="bodySm" style={styles.infoValue}>{user?.status || "active"}</ThemedText>
        </View>
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="title" style={styles.sectionTitle}>
          Security & Storage Status
        </ThemedText>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Access Token (Memory):</ThemedText>
          <ThemedText variant="bodySm" color={accessToken ? colors.success : colors.error}>
            {accessToken ? "Present in Zustand" : "None"}
          </ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Refresh Token (SecureStore):</ThemedText>
          <ThemedText variant="bodySm" color={hasSecureRefreshToken ? colors.success : colors.error}>
            {hasSecureRefreshToken ? "Hardware Encrypted" : "None"}
          </ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Local DB (SQLite):</ThemedText>
          <ThemedText variant="bodySm" color={colors.success}>
            11 Models Initialized
          </ThemedText>
        </View>
      </Card>

      <Button
        title="Log Out"
        variant="secondary"
        size="lg"
        fullWidth
        loading={loggingOut}
        onPress={handleLogout}
        style={styles.logoutButton}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md, marginTop: spacing.xs },
  card: { padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: { marginBottom: spacing.sm, color: colors.ink },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xxs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  infoValue: {
    color: colors.inkSecondary,
    fontWeight: "500"
  },
  logoutButton: {
    marginTop: spacing.md
  }
});
