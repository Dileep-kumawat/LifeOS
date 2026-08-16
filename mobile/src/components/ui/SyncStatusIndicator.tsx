import { TouchableOpacity, View, StyleSheet, ActivityIndicator } from "react-native";
import { CloudOff, CheckCircle2, AlertCircle } from "lucide-react-native";
import { useSyncStore } from "../../store/syncStore";
import { syncEngine } from "../../services/syncEngine";
import { ThemedText } from "./ThemedText";
import { colors, radius, spacing } from "../../theme";

interface SyncStatusIndicatorProps {
  compact?: boolean;
}

export function SyncStatusIndicator({ compact = false }: SyncStatusIndicatorProps) {
  const status = useSyncStore((state) => state.status);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const isOnline = useSyncStore((state) => state.isOnline);

  const handlePress = () => {
    syncEngine.syncNow().catch(() => {});
  };

  const renderContent = () => {
    if (!isOnline || status === "offline") {
      return (
        <View style={styles.content}>
          <CloudOff size={14} color={colors.inkMuted} />
          {!compact && (
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.text}>
              Offline {pendingCount > 0 ? `(${pendingCount})` : ""}
            </ThemedText>
          )}
        </View>
      );
    }

    if (status === "syncing") {
      return (
        <View style={styles.content}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          {!compact && (
            <ThemedText variant="caption" color={colors.primary} style={styles.text}>
              Syncing...
            </ThemedText>
          )}
        </View>
      );
    }

    if (status === "error") {
      return (
        <View style={styles.content}>
          <AlertCircle size={14} color={colors.error} />
          {!compact && (
            <ThemedText variant="caption" color={colors.error} style={styles.text}>
              Sync Error
            </ThemedText>
          )}
        </View>
      );
    }

    if (pendingCount > 0) {
      return (
        <View style={styles.content}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          {!compact && (
            <ThemedText variant="caption" color={colors.inkSecondary} style={styles.text}>
              {pendingCount} pending
            </ThemedText>
          )}
        </View>
      );
    }

    return (
      <View style={styles.content}>
        <CheckCircle2 size={14} color={colors.success} />
        {!compact && (
          <ThemedText variant="caption" color={colors.success} style={styles.text}>
            Synced
          </ThemedText>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[
        styles.container,
        status === "syncing" && styles.containerSyncing,
        compact ? styles.compact : styles.regular
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  containerSyncing: {
    borderColor: colors.primary,
    backgroundColor: colors.canvasSoft
  },
  regular: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  compact: {
    padding: spacing.xs
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  text: {
    fontWeight: "500"
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  spinner: {
    transform: [{ scale: 0.7 }]
  }
});
