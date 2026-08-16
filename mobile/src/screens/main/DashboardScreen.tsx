import { View, StyleSheet } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { SyncStatusIndicator } from "../../components/ui/SyncStatusIndicator";
import { syncEngine } from "../../services/syncEngine";
import { colors, spacing } from "../../theme";

export function DashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const status = useSyncStore((state) => state.status);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);

  const handleSyncPress = () => {
    syncEngine.syncNow().catch(() => {});
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText variant="heading2">Welcome back, {user?.name || "there"}</ThemedText>
            <ThemedText variant="bodySm" color={colors.inkMuted}>
              LifeOS Mobile Dashboard
            </ThemedText>
          </View>
          <SyncStatusIndicator />
        </View>
      </View>

      <Card style={styles.card}>
        <ThemedText variant="title" style={styles.cardTitle}>
          Offline Sync Engine (Phase 5)
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.cardBody}>
          • Sync State: <ThemedText variant="bodyMd" color={colors.primary}>{status}</ThemedText>
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.cardBody}>
          • Locally Pending Changes: {pendingCount}
        </ThemedText>
        <ThemedText variant="bodyMd" style={styles.cardBody}>
          • Last Synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "Never"}
        </ThemedText>
        <View style={styles.syncButtonWrapper}>
          <Button
            title="Sync With Cloud"
            variant="secondary"
            size="sm"
            loading={status === "syncing"}
            onPress={handleSyncPress}
          />
        </View>
      </Card>

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
        <ThemedText variant="bodyMd" style={styles.cardBody}>
          ✓ Offline Sync Engine (Push/Pull/Tombstones) Ready
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
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
  },
  syncButtonWrapper: {
    marginTop: spacing.sm
  }
});
