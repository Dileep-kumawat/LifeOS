import { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, TextInput, Switch } from "react-native";
import { RefreshCw, LogOut, Sparkles, Check, Bell } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { authApi } from "../../services/apiClient";
import { aiChatService } from "../../services/aiChatService";
import { tokenStorage } from "../../services/tokenStorage";
import { notificationService } from "../../services/notificationService";
import { notificationApiService } from "../../services/notificationApiService";
import { syncEngine } from "../../services/syncEngine";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { NotificationModal } from "../../components/notifications/NotificationModal";
import { colors, radius, spacing } from "../../theme";

export function SettingsScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const isOnline = useSyncStore((state) => state.isOnline);
  const syncStatus = useSyncStore((state) => state.status);
  const pendingCount = useSyncStore((state) => state.pendingCount);

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  // Daily Summary & Focus Preferences State
  const [deliveryTime, setDeliveryTime] = useState("07:00");
  const [channelPush, setChannelPush] = useState(true);
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelEmail, setChannelEmail] = useState(false);
  const [dndDuringFocus, setDndDuringFocus] = useState(false);
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
          const unread = await notificationApiService.getUnreadCount();
          setUnreadCount(unread);
        } catch {
          /* ignore unread fetch error */
        }

        try {
          const { preferences } = await aiChatService.getNotificationPreferences();
          if (preferences?.dailySummary) {
            setDeliveryTime(preferences.dailySummary.deliveryTime || "07:00");
            const channels = preferences.dailySummary.channels || ["push", "in_app"];
            setChannelPush(channels.includes("push"));
            setChannelInApp(channels.includes("in_app"));
            setChannelEmail(channels.includes("email"));
          }
          if (typeof preferences?.dndDuringFocus === "boolean") {
            setDndDuringFocus(preferences.dndDuringFocus);
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
        },
        dndDuringFocus
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
    Alert.alert(
      "Push Token Registered",
      `Device token successfully synced with backend for push notifications.`
    );
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

  const handleNotificationNavigation = (screenName: string, params?: Record<string, any>) => {
    if (navigation?.navigate) {
      navigation.navigate(screenName, params);
    }
  };

  return (
    <ScreenContainer scrollable includeDockPadding>
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
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Network Connection:
          </ThemedText>
          <ThemedText
            variant="bodySm"
            color={isOnline ? colors.success : colors.error}
            style={styles.infoValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {isOnline ? "Online" : "Offline Mode"}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Sync Engine State:
          </ThemedText>
          <ThemedText
            variant="bodySm"
            style={[styles.infoValue, { textTransform: "capitalize" }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {syncStatus}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Pending Local Mutations:
          </ThemedText>
          <ThemedText
            variant="bodySm"
            color={pendingCount > 0 ? colors.warning : colors.success}
            style={styles.infoValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {pendingCount} record{pendingCount === 1 ? "" : "s"}
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

      {/* Notifications Card */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText variant="title" style={styles.sectionTitle} numberOfLines={1}>
            Notifications
          </ThemedText>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.inboxTriggerBtn}
            onPress={() => setNotificationModalVisible(true)}
          >
            <Bell size={13} color={colors.primary} />
            <ThemedText variant="caption" color={colors.primary} style={styles.inboxBadgeText}>
              {unreadCount > 0 ? `Inbox (${unreadCount})` : "Inbox"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Push Notifications:
          </ThemedText>
          <ThemedText
            variant="bodySm"
            color={fcmToken ? colors.success : colors.warning}
            style={styles.infoValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {fcmToken ? "Registered (Active)" : "Not Configured"}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Scheduled Reminders:
          </ThemedText>
          <ThemedText
            variant="bodySm"
            color={colors.success}
            style={styles.infoValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {scheduledCount} active offline
          </ThemedText>
        </View>

        {/* Clean, Full-Width Action Button */}
        <View style={styles.notificationActions}>
          <Button
            title={unreadCount > 0 ? `Open Notifications (${unreadCount})` : "Open Notifications"}
            variant="primary"
            size="md"
            fullWidth
            onPress={() => setNotificationModalVisible(true)}
            icon={<Bell size={16} color="#ffffff" />}
          />
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleRegisterFcm}
            style={styles.syncTokenBtn}
          >
            <RefreshCw size={12} color={colors.inkMuted} />
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.syncTokenText}>
              Sync Push Device Token
            </ThemedText>
          </TouchableOpacity>
        </View>
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
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Delivery Time (HH:MM):
          </ThemedText>
          <TextInput
            value={deliveryTime}
            onChangeText={setDeliveryTime}
            placeholder="07:00"
            placeholderTextColor={colors.inkMuted}
            style={styles.timeInput}
            maxLength={5}
            multiline={false}
            numberOfLines={1}
            scrollEnabled={false}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
        </View>

        {/* Channels toggles */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText variant="bodySm" numberOfLines={1} ellipsizeMode="tail">
              Push Notification
            </ThemedText>
            <ThemedText
              variant="caption"
              color={colors.inkMuted}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Direct to this device
            </ThemedText>
          </View>
          <Switch
            value={channelPush}
            onValueChange={setChannelPush}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText variant="bodySm" numberOfLines={1} ellipsizeMode="tail">
              In-App Notification
            </ThemedText>
            <ThemedText
              variant="caption"
              color={colors.inkMuted}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Notification modal & bell
            </ThemedText>
          </View>
          <Switch
            value={channelInApp}
            onValueChange={setChannelInApp}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText variant="bodySm" numberOfLines={1} ellipsizeMode="tail">
              Email Summary
            </ThemedText>
            <ThemedText
              variant="caption"
              color={colors.inkMuted}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Sent to account email
            </ThemedText>
          </View>
          <Switch
            value={channelEmail}
            onValueChange={setChannelEmail}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        {/* Focus DND Mode (FR-8.4) */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText variant="bodySm" numberOfLines={1} ellipsizeMode="tail">
              Focus Do Not Disturb
            </ThemedText>
            <ThemedText
              variant="caption"
              color={colors.inkMuted}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Mute non-critical alerts during timer
            </ThemedText>
          </View>
          <Switch
            value={dndDuringFocus}
            onValueChange={setDndDuringFocus}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        <Button
          title={
            savingPrefs
              ? "Saving..."
              : savedSuccess
                ? "Preferences Saved!"
                : "Save Delivery Preferences"
          }
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
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Name:
          </ThemedText>
          <ThemedText
            variant="bodySm"
            style={styles.infoValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user?.name || "N/A"}
          </ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Email:
          </ThemedText>
          <ThemedText
            variant="bodySm"
            style={styles.infoValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user?.email || "N/A"}
          </ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.infoLabel}>
            Role:
          </ThemedText>
          <ThemedText
            variant="bodySm"
            style={styles.infoValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user?.role?.toUpperCase() || "USER"}
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
        icon={<LogOut size={16} color={colors.ink} />}
        style={styles.logoutButton}
      />

      {/* Notification Modal */}
      <NotificationModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
        onNavigate={handleNotificationNavigation}
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
    marginBottom: spacing.xs,
    gap: spacing.xs
  },
  syncIconBtn: {
    padding: spacing.xs,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.full
  },
  inboxTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(0, 93, 178, 0.08)",
    borderRadius: radius.full,
    flexShrink: 0
  },
  inboxBadgeText: {
    fontWeight: "600",
    fontSize: 11
  },
  sectionTitle: {
    color: colors.ink,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: spacing.xs
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: spacing.sm
  },
  infoLabel: {
    flexShrink: 1
  },
  infoValue: {
    fontWeight: "600",
    maxWidth: "58%",
    textAlign: "right"
  },
  timeInput: {
    width: 82,
    height: 36,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 0,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    fontWeight: "700",
    fontSize: 14,
    color: colors.ink
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: spacing.sm
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: spacing.xs
  },
  notificationActions: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    alignItems: "center"
  },
  syncTokenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs
  },
  syncTokenText: {
    fontWeight: "500",
    fontSize: 11.5
  },
  logoutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl
  }
});
