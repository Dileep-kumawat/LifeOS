import { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, TextInput, Switch } from "react-native";
import { RefreshCw, LogOut, Sparkles, Check } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { authApi } from "../../services/apiClient";
import { aiChatService } from "../../services/aiChatService";
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

  // Daily Summary Preferences State
  const [deliveryTime, setDeliveryTime] = useState("07:00");
  const [channelPush, setChannelPush] = useState(true);
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelEmail, setChannelEmail] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      const fcm = await tokenStorage.getItem("lifeos_fcm_device_token");
      setFcmToken(fcm);

      const scheduled = notificationService.getScheduledNotifications();
      setScheduledCount(scheduled.length);

      if (isOnline) {
        try {
          const { preferences } = await aiChatService.getNotificationPreferences();
          if (preferences?.dailySummary) {
            setDeliveryTime(preferences.dailySummary.deliveryTime || "07:00");
            const channels = preferences.dailySummary.channels || ["push", "in_app"];
            setChannelPush(channels.includes("push"));
            setChannelInApp(channels.includes("in_app"));
            setChannelEmail(channels.includes("email"));
          }
        } catch {
          /* use defaults */
        }
      }
    }
    loadInfo();
  }, [isOnline]);

  const handleSaveSummaryPrefs = async () => {
    if (!isOnline) return;
    setSavingPrefs(true);
    try {
      const channels: ("push" | "in_app" | "email")[] = [];
      if (channelPush) channels.push("push");
      if (channelInApp) channels.push("in_app");
      if (channelEmail) channels.push("email");

      await aiChatService.updateNotificationPreferences({
        dailySummary: {
          deliveryTime,
          channels,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        }
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

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
            {fcmToken ? "Registered (Active)" : "Not Registered"}
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

      {/* AI Daily Summary Preferences Card */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Sparkles size={18} color={colors.primary} />
            <ThemedText variant="title" style={styles.sectionTitle}>
              AI Daily Summary Delivery
            </ThemedText>
          </View>
        </View>

        <ThemedText variant="caption" color={colors.inkMuted} style={{ marginBottom: spacing.xs }}>
          Configure automated morning AI summary delivery time and routing channels.
        </ThemedText>

        {/* Delivery Time Input */}
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted}>Delivery Time (HH:MM):</ThemedText>
          <TextInput
            value={deliveryTime}
            onChangeText={setDeliveryTime}
            placeholder="07:00"
            placeholderTextColor={colors.inkMuted}
            style={styles.timeInput}
            maxLength={5}
          />
        </View>

        {/* Channels toggles */}
        <View style={styles.toggleRow}>
          <View>
            <ThemedText variant="bodySm">Push Notification (FCM)</ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Direct to this mobile device
            </ThemedText>
          </View>
          <Switch
            value={channelPush}
            onValueChange={setChannelPush}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <View>
            <ThemedText variant="bodySm">In-App Notification</ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Notification inbox bell
            </ThemedText>
          </View>
          <Switch
            value={channelInApp}
            onValueChange={setChannelInApp}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <View>
            <ThemedText variant="bodySm">Email Summary</ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Sent to account email
            </ThemedText>
          </View>
          <Switch
            value={channelEmail}
            onValueChange={setChannelEmail}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        <Button
          title={savingPrefs ? "Saving..." : savedSuccess ? "Preferences Saved!" : "Save Delivery Preferences"}
          variant={savedSuccess ? "secondary" : "primary"}
          size="sm"
          onPress={handleSaveSummaryPrefs}
          disabled={savingPrefs || !isOnline}
          icon={savedSuccess ? <Check size={14} color={colors.success} /> : undefined}
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
  header: {
    marginBottom: spacing.md,
    marginTop: spacing.xs
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm
  },
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
  sectionTitle: {
    color: colors.ink,
    letterSpacing: -0.2
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  infoValue: {
    fontWeight: "600"
  },
  timeInput: {
    width: 76,
    height: 34,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13,
    color: colors.ink
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  logoutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl
  }
});

