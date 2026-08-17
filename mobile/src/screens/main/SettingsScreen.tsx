import { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { RefreshCw, LogOut } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { authApi } from "../../services/apiClient";
import { tokenStorage } from "../../services/tokenStorage";
import { notificationService } from "../../services/notificationService";
import { syncEngine } from "../../services/syncEngine";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { colors, radius, spacing } from "../../theme";

export function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const isOnline = useSyncStore((state) => state.isOnline);
  const syncStatus = useSyncStore((state) => state.status);
  const pendingCount = useSyncStore((state) => state.pendingCount);

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      const fcm = await tokenStorage.getItem("lifeos_fcm_device_token");
      setFcmToken(fcm);

      const scheduled = notificationService.getScheduledNotifications();
      setScheduledCount(scheduled.length);
    }
    loadInfo();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncEngine.syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRegisterFcm = async () => {
    const token = await notificationService.registerDeviceToken();
    setFcmToken(token);
    Alert.alert("FCM Registered", `Device token successfully synced with backend for push notifications.`);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await notificationService.unregisterDeviceToken();
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
        <ThemedText variant="heading2">Settings & Sync</ThemedText>
        <ThemedText variant="bodySm" color={colors.inkMuted}>
          Offline status, notifications & account
        </ThemedText>
      </View>

      {/* Offline Sync Status Card */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText variant="title" style={styles.sectionTitle}>
            Offline-First Sync Status
          </ThemedText>
          <TouchableOpacity
            onPress={handleManualSync}
            disabled={isSyncing || !isOnline}
            style={[styles.syncIconBtn, (!isOnline || isSyncing) && { opacity: 0.5 }]}
          >
            <RefreshCw size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Network Connection:</ThemedText>
          <ThemedText variant="bodySm" color={isOnline ? colors.success : colors.error} style={styles.infoValue}>
            {isOnline ? "Online" : "Offline (Airplane Mode)"}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Sync Engine State:</ThemedText>
          <ThemedText variant="bodySm" style={[styles.infoValue, { textTransform: "capitalize" }]}>
            {syncStatus}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Pending Local Mutations:</ThemedText>
          <ThemedText
            variant="bodySm"
            color={pendingCount > 0 ? colors.warning : colors.success}
            style={styles.infoValue}
          >
            {pendingCount} records
          </ThemedText>
        </View>

        <Button
          title={isSyncing ? "Syncing..." : "Sync Now"}
          variant="outline"
          size="sm"
          onPress={handleManualSync}
          disabled={isSyncing || !isOnline}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      {/* Notifications Card (FR-13.5) */}
      <Card style={styles.card}>
        <ThemedText variant="title" style={styles.sectionTitle}>
          Mobile Notifications (FR-13.5)
        </ThemedText>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>FCM Server Push:</ThemedText>
          <ThemedText variant="bodySm" color={fcmToken ? colors.success : colors.warning} style={styles.infoValue}>
            {fcmToken ? "Registered" : "Not Registered"}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Notifee Local Triggers:</ThemedText>
          <ThemedText variant="bodySm" color={colors.success} style={styles.infoValue}>
            {scheduledCount} active offline reminders
          </ThemedText>
        </View>

        <Button
          title="Refresh FCM Device Token"
          variant="outline"
          size="sm"
          onPress={handleRegisterFcm}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      {/* Account Profile Card */}
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
          <ThemedText variant="bodySm" style={styles.infoValue}>{user?.role?.toUpperCase() || "USER"}</ThemedText>
        </View>
      </Card>

      <Button
        title="Log Out"
        variant="secondary"
        size="lg"
        fullWidth
        loading={loggingOut}
        onPress={handleLogout}
        icon={<LogOut size={16} color={colors.ink} />}
        style={styles.logoutButton}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md, marginTop: spacing.xs },
  card: { padding: spacing.md, marginBottom: spacing.md },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  syncIconBtn: {
    padding: spacing.xs,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.full
  },
  sectionTitle: { color: colors.ink },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xxs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  infoValue: {
    fontWeight: "600"
  },
  logoutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl
  }
});
