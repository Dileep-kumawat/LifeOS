import { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Plus, Search, FolderPlus, Camera } from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { colors, radius, spacing } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { useDockHeight } from "../../navigation/FloatingDock";
import { noteRepo } from "../../db/repositories/noteRepo";
import { syncEngine } from "../../services/syncEngine";
import type { LocalNote, LocalNoteFolder } from "../../db/schema";

import { NoteCard } from "../../components/notes/NoteCard";
import { NoteEditorModal } from "../../components/notes/NoteEditorModal";
import { FolderManagerModal } from "../../components/notes/FolderManagerModal";
import { NotesScanModal } from "../../components/notes/NotesScanModal";

export function NotesScreen() {
  const dockHeight = useDockHeight();
  const user = useAuthStore((state) => state.user);
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [folders, setFolders] = useState<LocalNoteFolder[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [editingNote, setEditingNote] = useState<LocalNote | null>(null);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    const folderList = await noteRepo.listFolders(user.id);
    setFolders(folderList);

    const tagList = await noteRepo.listTags(user.id);
    setTags(tagList);

    const options: { folderId?: string | null; tag?: string; search?: string } = {};
    if (selectedFolderId !== "all") {
      options.folderId = selectedFolderId;
    }
    if (selectedTag) {
      options.tag = selectedTag;
    }
    if (searchQuery.trim()) {
      options.search = searchQuery.trim();
    }

    const noteList = await noteRepo.listNotes(user.id, options);
    setNotes(noteList);
  }, [user?.id, selectedFolderId, selectedTag, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveNote = async (noteData: {
    title: string;
    content: string;
    contentText: string;
    folderId: string | null;
    tags: string;
  }) => {
    if (!user?.id) return;

    if (editingNote) {
      await noteRepo.updateNote(editingNote.id, noteData);
    } else {
      await noteRepo.createNote({
        userId: user.id,
        ...noteData
      });
    }

    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteNote = async (id: string) => {
    if (!user?.id) return;
    await noteRepo.deleteNote(id);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleCreateFolder = async (name: string) => {
    if (!user?.id) return;
    await noteRepo.createFolder({
      userId: user.id,
      name,
      parentFolderId: null
    });
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteFolder = async (id: string) => {
    if (!user?.id) return;
    await noteRepo.deleteFolder(id);
    if (selectedFolderId === id) {
      setSelectedFolderId("all");
    }
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleOpenEditorWithDraft = (draftData: {
    title: string;
    bodyText: string;
    folderId: string | null;
    tags: string[];
  }) => {
    setEditingNote({
      id: "",
      userId: user?.id || "",
      title: draftData.title,
      content: "",
      contentText: draftData.bodyText,
      folderId: draftData.folderId,
      tags: JSON.stringify(draftData.tags),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as LocalNote);
    setIsNoteModalVisible(true);
  };

  const folderMap = new Map<string, LocalNoteFolder>();
  folders.forEach((f) => folderMap.set(f.id, f));

  return (
    <ScreenContainer scrollable={false}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <ThemedText variant="heading2">Notes</ThemedText>
        <View style={styles.topBtnRow}>
          <TouchableOpacity
            onPress={() => setIsScanModalVisible(true)}
            style={styles.scanBtn}
            accessibilityLabel="Scan note from camera"
          >
            <Camera size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsFolderModalVisible(true)} style={styles.folderBtn}>
            <FolderPlus size={18} color={colors.ink} />
          </TouchableOpacity>
          <Button
            title="New Note"
            icon={<Plus size={16} color={colors.onPrimary} />}
            onPress={() => {
              setEditingNote(null);
              setIsNoteModalVisible(true);
            }}
            style={styles.addBtn}
          />
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.inkMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search title, content..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Folder & Tag Horizontal Filters */}
      <View style={styles.filterStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {/* Folders */}
          <TouchableOpacity
            onPress={() => setSelectedFolderId("all")}
            style={[styles.filterChip, selectedFolderId === "all" && styles.filterChipSelected]}
          >
            <ThemedText
              variant="caption"
              color={selectedFolderId === "all" ? colors.onPrimary : colors.ink}
              style={{ fontWeight: "600" }}
            >
              All Notes
            </ThemedText>
          </TouchableOpacity>

          {folders.map((f) => {
            const isSelected = selectedFolderId === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setSelectedFolderId(isSelected ? "all" : f.id)}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              >
                <ThemedText
                  variant="caption"
                  color={isSelected ? colors.onPrimary : colors.ink}
                  style={{ fontWeight: "600" }}
                >
                  📁 {f.name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}

          {/* Tags */}
          {tags.map((t) => {
            const isSelected = selectedTag === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedTag(isSelected ? null : t)}
                style={[styles.filterChip, isSelected && styles.filterChipTagSelected]}
              >
                <ThemedText
                  variant="caption"
                  color={isSelected ? colors.onPrimary : colors.inkMuted}
                  style={{ fontWeight: "600" }}
                >
                  #{t}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notes List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={{ paddingBottom: dockHeight }}
        showsVerticalScrollIndicator={false}
      >
        {notes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="bodyMd" color={colors.inkMuted} style={{ textAlign: "center" }}>
              {searchQuery || selectedFolderId !== "all" || selectedTag
                ? "No notes matching the selected filters."
                : "No notes yet. Tap '+ New Note' to start writing with rich formatting."}
            </ThemedText>
          </Card>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              folder={note.folderId ? folderMap.get(note.folderId) : undefined}
              onPress={(n) => {
                setEditingNote(n);
                setIsNoteModalVisible(true);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Note Editor Modal */}
      <NoteEditorModal
        visible={isNoteModalVisible}
        onClose={() => setIsNoteModalVisible(false)}
        noteToEdit={editingNote}
        folders={folders}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />

      {/* Folder Manager Modal */}
      <FolderManagerModal
        visible={isFolderModalVisible}
        onClose={() => setIsFolderModalVisible(false)}
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      {/* Scan Note OCR Modal */}
      <NotesScanModal
        visible={isScanModalVisible}
        onClose={() => setIsScanModalVisible(false)}
        folders={folders}
        onSave={handleSaveNote}
        onOpenEditorWithDraft={handleOpenEditorWithDraft}
        onOpenBlankNote={() => {
          setEditingNote(null);
          setIsNoteModalVisible(true);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.xs
  },
  topBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  scanBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    height: 38,
    width: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  folderBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    height: 38,
    width: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  addBtn: {
    height: 38,
    paddingHorizontal: spacing.md
  },
  searchRow: {
    position: "relative",
    marginBottom: spacing.xs
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: 13,
    zIndex: 1
  },
  searchInput: {
    paddingLeft: 38,
    borderRadius: radius.full
  },
  filterStrip: {
    marginBottom: spacing.sm
  },
  filterScroll: {
    flexDirection: "row"
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginRight: 6
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterChipTagSelected: {
    backgroundColor: colors.accentPurpleDeep,
    borderColor: colors.accentPurpleDeep
  },
  listContainer: {
    flex: 1
  },
  emptyCard: {
    padding: spacing.xl,
    marginTop: spacing.md
  }
});
