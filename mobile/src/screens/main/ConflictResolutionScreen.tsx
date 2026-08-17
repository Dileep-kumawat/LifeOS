import { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Smartphone,
  Cloud,
  Edit3
} from "lucide-react-native";
import { useSyncStore } from "../../store/syncStore";
import { syncEngine } from "../../services/syncEngine";
import { ThemedText } from "../../components/ui/ThemedText";
import { Button } from "../../components/ui/Button";
import { colors, radius, spacing } from "../../theme";

export function ConflictResolutionScreen() {
  const navigation = useNavigation<any>();
  const conflicts = useSyncStore((state) => state.conflicts);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(
    conflicts[0]?.id || null
  );
  const [isResolving, setIsResolving] = useState(false);

  // Manual Merge Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTitle, setMergeTitle] = useState("");
  const [mergeContent, setMergeContent] = useState("");
  const [mergeAmount, setMergeAmount] = useState("");
  const [mergeCategory, setMergeCategory] = useState("");
  const [mergeNote, setMergeNote] = useState("");

  const activeConflict =
    conflicts.find((c) => c.id === selectedConflictId || c.entityId === selectedConflictId) ||
    conflicts[0];

  const localData = activeConflict ? JSON.parse(activeConflict.localData || "{}") : {};
  const remoteData = activeConflict ? JSON.parse(activeConflict.remoteData || "{}") : {};
  const conflictingFields: string[] = activeConflict
    ? JSON.parse(activeConflict.conflictingFields || "[]")
    : [];

  const handleOpenMergeModal = () => {
    if (!activeConflict) return;
    if (activeConflict.module === "notes") {
      setMergeTitle(localData.title || remoteData.title || "");
      const localText = localData.contentText || "";
      const remoteText = remoteData.contentText || "";
      setMergeContent(
        localText === remoteText
          ? localText
          : `${localText}\n\n--- [Remote Version Edits] ---\n${remoteText}`
      );
    } else if (activeConflict.module === "transactions") {
      setMergeAmount(String(localData.amount || remoteData.amount || ""));
      setMergeCategory(localData.category || remoteData.category || "");
      setMergeNote(localData.note || remoteData.note || "");
    }
    setIsMergeModalOpen(true);
  };

  const handleResolve = async (
    resolution: "keep_local" | "keep_server" | "manual_merge",
    customData?: any
  ) => {
    if (!activeConflict) return;
    setIsResolving(true);
    try {
      await syncEngine.resolveConflict(activeConflict.id, resolution, customData);
      setIsMergeModalOpen(false);

      // Select next remaining conflict or go back if done
      const remaining = conflicts.filter((c) => c.id !== activeConflict.id);
      if (remaining.length > 0) {
        setSelectedConflictId(remaining[0].id);
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert("Resolution Error", err.message || "Failed to resolve conflict");
    } finally {
      setIsResolving(false);
    }
  };

  const handleSaveManualMerge = () => {
    if (!activeConflict) return;
    let mergedData: any = {};
    if (activeConflict.module === "notes") {
      mergedData = {
        title: mergeTitle.trim(),
        contentText: mergeContent,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: mergeContent }]
            }
          ]
        }
      };
    } else if (activeConflict.module === "transactions") {
      mergedData = {
        amount: Number(mergeAmount) || localData.amount || remoteData.amount,
        category: mergeCategory.trim() || localData.category || remoteData.category,
        note: mergeNote.trim()
      };
    }
    handleResolve("manual_merge", mergedData);
  };

  if (!activeConflict || conflicts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Check size={48} color={colors.success} />
        <ThemedText variant="heading2" style={{ marginTop: spacing.md }}>
          All Conflicts Resolved
        </ThemedText>
        <ThemedText variant="bodyMd" color={colors.inkSecondary} style={{ textAlign: "center", marginTop: spacing.xs }}>
          Your local and remote databases are synchronized cleanly with no pending conflicts.
        </ThemedText>
        <Button
          title="Back to App"
          variant="primary"
          style={{ marginTop: spacing.lg }}
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <ThemedText variant="heading3">Conflict Resolution</ThemedText>
          <ThemedText variant="caption" color={colors.warning}>
            {conflicts.length} pending {conflicts.length === 1 ? "conflict" : "conflicts"}
          </ThemedText>
        </View>
      </View>

      {/* Tabs if multiple conflicts */}
      {conflicts.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.conflictTabs}
        >
          {conflicts.map((c, i) => {
            const isSelected = (c.id === activeConflict.id);
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedConflictId(c.id)}
                style={[styles.tab, isSelected && styles.tabActive]}
              >
                <ThemedText
                  variant="caption"
                  color={isSelected ? colors.primary : colors.inkMuted}
                  style={{ fontWeight: "600" }}
                >
                  {c.module.toUpperCase()} #{i + 1}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Conflict Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <AlertTriangle size={18} color={colors.warning} />
            <ThemedText variant="bodyMd" style={{ fontWeight: "600" }}>
              Conflicting {activeConflict.module === "notes" ? "Note" : "Financial Record"} Edits
            </ThemedText>
          </View>
          <ThemedText variant="caption" color={colors.inkSecondary}>
            Different edits were made on your device and another synced device. Choose which version to keep or manually merge the changes.
          </ThemedText>
          {conflictingFields.length > 0 && (
            <View style={styles.fieldsBadgeContainer}>
              <ThemedText variant="caption" color={colors.inkMuted}>
                Conflicting fields:
              </ThemedText>
              {conflictingFields.map((f) => (
                <View key={f} style={styles.fieldBadge}>
                  <ThemedText variant="caption" color={colors.warning} style={{ fontWeight: "600" }}>
                    {f}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Side-by-Side / Stacked Comparison */}
        <View style={styles.comparisonContainer}>
          {/* Local Version Card */}
          <View style={[styles.versionCard, styles.localCard]}>
            <View style={styles.versionHeader}>
              <View style={styles.versionTag}>
                <Smartphone size={14} color={colors.primary} />
                <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: "600" }}>
                  Your Device (Local)
                </ThemedText>
              </View>
            </View>

            {activeConflict.module === "notes" && (
              <View style={styles.versionFields}>
                <ThemedText variant="caption" color={colors.inkMuted}>
                  Title:
                </ThemedText>
                <ThemedText variant="bodyMd" style={styles.fieldText}>
                  {localData.title || "(Untitled)"}
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.xs }}>
                  Body Content:
                </ThemedText>
                <ThemedText variant="bodySm" style={styles.fieldContent}>
                  {localData.contentText || "(Empty content)"}
                </ThemedText>
              </View>
            )}

            {activeConflict.module === "transactions" && (
              <View style={styles.versionFields}>
                <ThemedText variant="caption" color={colors.inkMuted}>Amount:</ThemedText>
                <ThemedText variant="bodyMd" style={styles.fieldText}>${localData.amount ?? 0}</ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.xs }}>Category:</ThemedText>
                <ThemedText variant="bodySm">{localData.category || "General"}</ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.xs }}>Note:</ThemedText>
                <ThemedText variant="bodySm">{localData.note || "(No note)"}</ThemedText>
              </View>
            )}

            <Button
              title="Keep Local"
              variant="secondary"
              size="sm"
              style={{ marginTop: spacing.md }}
              disabled={isResolving}
              onPress={() => handleResolve("keep_local")}
            />
          </View>

          {/* Remote / Server Version Card */}
          <View style={[styles.versionCard, styles.remoteCard]}>
            <View style={styles.versionHeader}>
              <View style={styles.versionTag}>
                <Cloud size={14} color={colors.inkSecondary} />
                <ThemedText variant="caption" color={colors.inkSecondary} style={{ fontWeight: "600" }}>
                  Server / Other Device
                </ThemedText>
              </View>
            </View>

            {activeConflict.module === "notes" && (
              <View style={styles.versionFields}>
                <ThemedText variant="caption" color={colors.inkMuted}>
                  Title:
                </ThemedText>
                <ThemedText variant="bodyMd" style={styles.fieldText}>
                  {remoteData.title || "(Untitled)"}
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.xs }}>
                  Body Content:
                </ThemedText>
                <ThemedText variant="bodySm" style={styles.fieldContent}>
                  {remoteData.contentText || "(Empty content)"}
                </ThemedText>
              </View>
            )}

            {activeConflict.module === "transactions" && (
              <View style={styles.versionFields}>
                <ThemedText variant="caption" color={colors.inkMuted}>Amount:</ThemedText>
                <ThemedText variant="bodyMd" style={styles.fieldText}>${remoteData.amount ?? 0}</ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.xs }}>Category:</ThemedText>
                <ThemedText variant="bodySm">{remoteData.category || "General"}</ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.xs }}>Note:</ThemedText>
                <ThemedText variant="bodySm">{remoteData.note || "(No note)"}</ThemedText>
              </View>
            )}

            <Button
              title="Keep Server"
              variant="secondary"
              size="sm"
              style={{ marginTop: spacing.md }}
              disabled={isResolving}
              onPress={() => handleResolve("keep_server")}
            />
          </View>
        </View>

        {/* Manual Merge Option */}
        <View style={styles.manualMergeContainer}>
          <Button
            title="Manual Merge & Edit"
            variant="primary"
            size="md"
            fullWidth
            disabled={isResolving}
            onPress={handleOpenMergeModal}
          />
        </View>
      </ScrollView>

      {/* Manual Merge Modal */}
      <Modal visible={isMergeModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Edit3 size={18} color={colors.primary} />
                <ThemedText variant="heading3">Merge & Edit Changes</ThemedText>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {activeConflict.module === "notes" && (
                <>
                  <ThemedText variant="caption" color={colors.inkMuted}>Title:</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={mergeTitle}
                    onChangeText={setMergeTitle}
                    placeholder="Note Title"
                    placeholderTextColor={colors.inkFaint}
                  />

                  <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.sm }}>
                    Combined Content:
                  </ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={mergeContent}
                    onChangeText={setMergeContent}
                    multiline
                    placeholder="Note Content"
                    placeholderTextColor={colors.inkFaint}
                  />
                </>
              )}

              {activeConflict.module === "transactions" && (
                <>
                  <ThemedText variant="caption" color={colors.inkMuted}>Amount ($):</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={mergeAmount}
                    onChangeText={setMergeAmount}
                    keyboardType="decimal-pad"
                  />
                  <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.sm }}>Category:</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={mergeCategory}
                    onChangeText={setMergeCategory}
                  />
                  <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: spacing.sm }}>Note:</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={mergeNote}
                    onChangeText={setMergeNote}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setIsMergeModalOpen(false)}
              />
              <Button
                title="Save & Resolve"
                variant="primary"
                size="md"
                loading={isResolving}
                onPress={handleSaveManualMerge}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvasSoft
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.canvasSoft
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  backButton: {
    marginRight: spacing.sm
  },
  headerTitleContainer: {
    flex: 1
  },
  conflictTabs: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.surface
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  tabActive: {
    backgroundColor: "#e8f0fe",
    borderColor: colors.primary
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: spacing.xs
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  fieldsBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xxs
  },
  fieldBadge: {
    backgroundColor: "#fff9db",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#fcc419"
  },
  comparisonContainer: {
    gap: spacing.md
  },
  versionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  localCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary
  },
  remoteCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.inkSecondary
  },
  versionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  versionTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  versionFields: {
    gap: 2
  },
  fieldText: {
    fontWeight: "600",
    color: colors.ink
  },
  fieldContent: {
    color: colors.inkSecondary,
    backgroundColor: colors.canvasSoft,
    padding: spacing.xs,
    borderRadius: radius.sm
  },
  manualMergeContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "85%",
    padding: spacing.lg
  },
  modalHeader: {
    marginBottom: spacing.md
  },
  modalBody: {
    marginBottom: spacing.md
  },
  input: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.hairline,
    color: colors.ink,
    fontSize: 15
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm
  }
});
