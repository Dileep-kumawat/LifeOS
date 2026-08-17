import { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Folder, Plus, Trash2 } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalNoteFolder } from "../../db/schema";

interface FolderManagerModalProps {
  visible: boolean;
  onClose: () => void;
  folders: LocalNoteFolder[];
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
}

export function FolderManagerModal({
  visible,
  onClose,
  folders,
  onCreateFolder,
  onDeleteFolder
}: FolderManagerModalProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    try {
      setIsSubmitting(true);
      await onCreateFolder(newFolderName.trim());
      setNewFolderName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Manage Folders"
      subtitle="Organize your notes into folders"
    >
      <View style={styles.container}>
        {/* Create Folder Row */}
        <View style={styles.createRow}>
          <TextInput
            placeholder="New folder name..."
            value={newFolderName}
            onChangeText={setNewFolderName}
            style={{ flex: 1 }}
          />
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isSubmitting || !newFolderName.trim()}
            style={[styles.addBtn, !newFolderName.trim() && styles.btnDisabled]}
          >
            <Plus size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>

        {/* Existing Folders List */}
        <View style={styles.folderList}>
          {folders.length === 0 ? (
            <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center", paddingVertical: spacing.md }}>
              No folders yet.
            </ThemedText>
          ) : (
            folders.map((f) => (
              <View key={f.id} style={styles.folderItem}>
                <View style={styles.folderInfo}>
                  <Folder size={16} color={colors.primary} />
                  <ThemedText variant="bodySm" numberOfLines={1}>
                    {f.name}
                  </ThemedText>
                </View>
                <TouchableOpacity onPress={() => onDeleteFolder(f.id)}>
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  addBtn: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center"
  },
  btnDisabled: {
    opacity: 0.5
  },
  folderList: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.md
  },
  folderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1
  }
});
