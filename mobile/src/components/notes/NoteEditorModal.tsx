import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Folder, Tag, History, X, Plus, RotateCcw } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalNote, LocalNoteFolder, LocalNoteVersion } from "../../db/schema";
import { noteRepo } from "../../db/repositories/noteRepo";
import {
  convertTextToProseMirrorDoc,
  convertProseMirrorDocToText
} from "./proseMirrorUtils";

interface NoteEditorModalProps {
  visible: boolean;
  onClose: () => void;
  noteToEdit?: LocalNote | null;
  folders: LocalNoteFolder[];
  onSave: (noteData: {
    title: string;
    content: string; // JSON TipTap/ProseMirror string
    contentText: string;
    folderId: string | null;
    tags: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function NoteEditorModal({
  visible,
  onClose,
  noteToEdit,
  folders,
  onSave,
  onDelete
}: NoteEditorModalProps) {
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<LocalNoteVersion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title);
      setBodyText(convertProseMirrorDocToText(noteToEdit.content, noteToEdit.contentText));
      setSelectedFolderId(noteToEdit.folderId);
      try {
        setTags(JSON.parse(noteToEdit.tags || "[]"));
      } catch {
        setTags([]);
      }
      // Fetch version history
      noteRepo.listNoteVersions(noteToEdit.id).then(setVersions).catch(() => {});
    } else {
      setTitle("");
      setBodyText("");
      setSelectedFolderId(null);
      setTags([]);
      setVersions([]);
    }
    setShowHistory(false);
    setNewTagInput("");
    setError(null);
  }, [noteToEdit, visible]);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleInsertFormat = (prefix: string) => {
    setBodyText((prev) => (prev ? prev + "\n" + prefix : prefix));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const { proseMirrorJson, contentText } = convertTextToProseMirrorDoc(bodyText);

      await onSave({
        title: title.trim(),
        content: proseMirrorJson,
        contentText: contentText.trim(),
        folderId: selectedFolderId,
        tags: JSON.stringify(tags)
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = async (version: LocalNoteVersion) => {
    setTitle(version.title);
    setBodyText(version.contentText || convertProseMirrorDocToText(version.content));
    setSelectedFolderId(version.folderId);
    try {
      setTags(JSON.parse(version.tags || "[]"));
    } catch {}
    setShowHistory(false);
  };

  const handleDelete = async () => {
    if (noteToEdit && onDelete) {
      try {
        setIsSaving(true);
        await onDelete(noteToEdit.id);
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete note");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={noteToEdit ? "Edit Note" : "New Note"}
      subtitle="TipTap & ProseMirror compatible rich text"
    >
      <View style={styles.formContainer}>
        {error && (
          <View style={styles.errorBox}>
            <ThemedText variant="caption" color={colors.error}>
              {error}
            </ThemedText>
          </View>
        )}

        <TextInput
          placeholder="Note Title (optional)"
          value={title}
          onChangeText={setTitle}
          style={styles.titleInput}
        />

        {/* Folder selection chips */}
        <View style={styles.folderRow}>
          <Folder size={14} color={colors.inkMuted} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              onPress={() => setSelectedFolderId(null)}
              style={[styles.folderChip, selectedFolderId === null && styles.chipSelected]}
            >
              <ThemedText
                variant="caption"
                color={selectedFolderId === null ? colors.onPrimary : colors.ink}
              >
                No Folder
              </ThemedText>
            </TouchableOpacity>
            {folders.map((f) => {
              const isSelected = selectedFolderId === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setSelectedFolderId(f.id)}
                  style={[styles.folderChip, isSelected && styles.chipSelected]}
                >
                  <ThemedText
                    variant="caption"
                    color={isSelected ? colors.onPrimary : colors.ink}
                  >
                    {f.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Formatting Quick Toolbar */}
        <View style={styles.formatToolbar}>
          <TouchableOpacity onPress={() => handleInsertFormat("# ")} style={styles.formatBtn}>
            <ThemedText variant="caption" style={{ fontWeight: "700" }}>H1</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleInsertFormat("## ")} style={styles.formatBtn}>
            <ThemedText variant="caption" style={{ fontWeight: "700" }}>H2</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleInsertFormat("- ")} style={styles.formatBtn}>
            <ThemedText variant="caption">• List</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleInsertFormat("1. ")} style={styles.formatBtn}>
            <ThemedText variant="caption">1. Num</ThemedText>
          </TouchableOpacity>

          {noteToEdit && versions.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={[styles.formatBtn, styles.historyBtn, showHistory && styles.chipSelected]}
            >
              <History size={14} color={showHistory ? colors.onPrimary : colors.primary} />
              <ThemedText
                variant="caption"
                color={showHistory ? colors.onPrimary : colors.primary}
                style={{ fontWeight: "600" }}
              >
                v{versions.length}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Version History Drawer */}
        {showHistory ? (
          <View style={styles.historyDrawer}>
            <ThemedText variant="caption" color={colors.inkMuted} style={{ fontWeight: "600", marginBottom: spacing.xs }}>
              Version History Snapshots
            </ThemedText>
            {versions.map((ver) => (
              <View key={ver.id} style={styles.versionRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodySm" style={{ fontWeight: "600" }}>
                    Version {ver.versionNumber}: {ver.title || "Untitled"}
                  </ThemedText>
                  <ThemedText variant="caption" color={colors.inkFaint}>
                    {new Date(ver.createdAt).toLocaleString()} • {ver.changeSource}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={() => handleRestoreVersion(ver)}
                  style={styles.restoreBtn}
                >
                  <RotateCcw size={12} color={colors.primary} />
                  <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: "600" }}>
                    Restore
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <TextInput
            placeholder="Type your notes here... (Supports # H1, ## H2, - bullet lists)"
            value={bodyText}
            onChangeText={setBodyText}
            multiline
            numberOfLines={10}
            style={styles.bodyInput}
          />
        )}

        {/* Tags Section */}
        <View style={styles.tagSection}>
          <View style={styles.tagHeader}>
            <Tag size={14} color={colors.inkMuted} />
            <ThemedText variant="caption" color={colors.inkMuted} style={{ fontWeight: "600" }}>
              Tags
            </ThemedText>
          </View>

          <View style={styles.tagWrap}>
            {tags.map((t) => (
              <View key={t} style={styles.tagChip}>
                <ThemedText variant="caption" color={colors.inkSecondary}>
                  {t}
                </ThemedText>
                <TouchableOpacity onPress={() => handleRemoveTag(t)}>
                  <X size={12} color={colors.inkMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.addTagRow}>
            <TextInput
              placeholder="Add tag..."
              value={newTagInput}
              onChangeText={setNewTagInput}
              style={{ flex: 1 }}
            />
            <TouchableOpacity onPress={handleAddTag} style={styles.addTagBtn}>
              <Plus size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={isSaving ? "Saving..." : noteToEdit ? "Save Changes" : "Create Note"}
            onPress={handleSave}
            disabled={isSaving}
          />

          {noteToEdit && onDelete && (
            <Button
              title="Delete Note"
              variant="outline"
              onPress={handleDelete}
              disabled={isSaving}
              style={{ marginTop: spacing.xs, borderColor: colors.error }}
              textStyle={{ color: colors.error }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: spacing.sm
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: spacing.sm,
    borderRadius: radius.md
  },
  titleInput: {
    fontWeight: "600",
    fontSize: 16
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  chipScroll: {
    flex: 1
  },
  folderChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginRight: 6
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  formatToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline
  },
  formatBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.xs
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
    backgroundColor: colors.accentSky
  },
  historyDrawer: {
    backgroundColor: colors.canvasSoft,
    padding: spacing.sm,
    borderRadius: radius.md,
    maxHeight: 200
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.primary
  },
  bodyInput: {
    minHeight: 140,
    textAlignVertical: "top"
  },
  tagSection: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  tagHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  addTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 4
  },
  addTagBtn: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center"
  },
  buttonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg
  }
});
