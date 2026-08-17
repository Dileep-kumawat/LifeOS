import { View, StyleSheet, TouchableOpacity } from "react-native";
import { AlertTriangle, Info, X, ChevronRight } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useSyncStore } from "../../store/syncStore";
import { ThemedText } from "./ThemedText";
import { colors, radius, spacing } from "../../theme";

export function ConflictNoticeBanner() {
  const navigation = useNavigation<any>();
  const conflictNotices = useSyncStore((state) => state.conflictNotices);
  const dismissNotice = useSyncStore((state) => state.dismissNotice);
  const conflicts = useSyncStore((state) => state.conflicts);

  if (conflictNotices.length === 0 && conflicts.length === 0) {
    return null;
  }

  const handleOpenConflictScreen = () => {
    try {
      navigation.navigate("ConflictResolution");
    } catch {
      // Navigation handler fallback
    }
  };

  return (
    <View style={styles.wrapper}>
      {conflicts.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.banner, styles.conflictBanner]}
          onPress={handleOpenConflictScreen}
        >
          <View style={styles.iconContainer}>
            <AlertTriangle size={16} color={colors.warning} />
          </View>
          <View style={styles.textContainer}>
            <ThemedText variant="caption" style={styles.title}>
              {conflicts.length} Unresolved Sync {conflicts.length === 1 ? "Conflict" : "Conflicts"}
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkSecondary} style={styles.subtitle}>
              Tap to review and resolve conflicting changes.
            </ThemedText>
          </View>
          <ChevronRight size={16} color={colors.inkMuted} />
        </TouchableOpacity>
      )}

      {conflictNotices.map((notice, idx) => {
        const isCalendarNotice = notice.toLowerCase().includes("overwritten") || notice.toLowerCase().includes("calendar");
        return (
          <View key={`notice-${idx}`} style={[styles.banner, styles.noticeBanner]}>
            <View style={styles.iconContainer}>
              <Info size={16} color={isCalendarNotice ? colors.primary : colors.inkSecondary} />
            </View>
            <View style={styles.textContainer}>
              <ThemedText variant="caption" color={colors.ink} style={styles.noticeText}>
                {notice}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => dismissNotice(idx)}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
    gap: spacing.xs,
    backgroundColor: "transparent"
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1
  },
  conflictBanner: {
    backgroundColor: "#fff9db",
    borderColor: "#fcc419"
  },
  noticeBanner: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline
  },
  iconContainer: {
    marginRight: spacing.xs
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.xs
  },
  title: {
    fontWeight: "600",
    color: colors.ink
  },
  subtitle: {
    fontSize: 11
  },
  noticeText: {
    fontWeight: "500"
  },
  closeButton: {
    padding: spacing.xxs
  }
});
