import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Camera, Image as ImageIcon, RefreshCw, AlertTriangle, FilePlus, Folder, Tag, X, Plus } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import { MobileOCRPreviewCard } from "./MobileOCRPreviewCard";
import { useOcrCapture } from "../../hooks/useOcrCapture";
import { convertOcrToNoteDraft, convertTextToProseMirrorDocument, type OcrNoteDraft } from "@lifeos/shared";
import type { LocalNoteFolder } from "../../db/schema";

export interface NotesScanModalProps {
  visible: boolean;
  onClose: () => void;
  folders: LocalNoteFolder[];
  onSave: (noteData: {
    title: string;
    content: string; // JSON TipTap/ProseMirror string
    contentText: string;
    folderId: string | null;
    tags: string;
  }) => Promise<void>;
  onOpenEditorWithDraft?: (draftData: {
    title: string;
    bodyText: string;
    folderId: string | null;
    tags: string[];
  }) => void;
  onOpenBlankNote?: () => void;
}

export function NotesScanModal({
  visible,
  onClose,
  folders,
  onSave,
  onOpenEditorWithDraft,
  onOpenBlankNote
}: NotesScanModalProps) {
  const ocrCapture = useOcrCapture();
  const [draft, setDraft] = useState<OcrNoteDraft | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      ocrCapture.reset();
      setDraft(null);
      setSelectedFolderId(null);
      setTags([]);
      setNewTagInput("");
      setCustomError(null);
      setIsSaving(false);
    }
  }, [visible]);

  const handleCaptureCamera = async () => {
    setCustomError(null);
    const result = await ocrCapture.captureFromCamera();
    if (result) {
      if (!result.extractedText || !result.extractedText.trim()) {
        setCustomError("No readable text could be recognized. Please try a clearer photo.");
        return;
      }
      const noteDraft = convertOcrToNoteDraft(result);
      setDraft(noteDraft);
    }
  };

  const handlePickGallery = async () => {
    setCustomError(null);
    const result = await ocrCapture.pickFromGallery();
    if (result) {
      if (!result.extractedText || !result.extractedText.trim()) {
        setCustomError("No readable text could be recognized. Please try a clearer photo.");
        return;
      }
      const noteDraft = convertOcrToNoteDraft(result);
      setDraft(noteDraft);
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSaveNote = async () => {
    if (!draft) return;
    try {
      setIsSaving(true);
      setCustomError(null);

      const proseMirrorDoc = convertTextToProseMirrorDocument(draft.bodyText);
      await onSave({
        title: draft.title.trim(),
        content: JSON.stringify(proseMirrorDoc),
        contentText: draft.bodyText.trim(),
        folderId: selectedFolderId,
        tags: JSON.stringify(tags)
      });

      onClose();
    } catch (err: any) {
      setCustomError(err.message || "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInEditor = () => {
    if (!draft) return;
    onClose();
    onOpenEditorWithDraft?.({
      title: draft.title.trim(),
      bodyText: draft.bodyText.trim(),
      folderId: selectedFolderId,
      tags
    });
  };

  const handleStartBlank = () => {
    onClose();
    onOpenBlankNote?.();
  };

  // Determine current active sub-state
  const isProcessing = ocrCapture.isProcessing;
  const isCapturing = ocrCapture.isCapturing;
  const hasError = Boolean(customError || ocrCapture.error);
  const isReview = Boolean(draft && !isProcessing && !isCapturing && !hasError);
  const isScanPrompt = !isReview && !isProcessing && !isCapturing && !hasError;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isReview ? "Review Scanned Note" : "Scan Note"}
      subtitle="Photographed text → editable note pre-fill (FR-5.3)"
    >
      <View style={styles.contentContainer}>
        {/* Processing State */}
        {isProcessing && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText variant="bodyMd" style={{ fontWeight: "700", marginTop: spacing.sm }}>
              Extracting Text...
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center", marginTop: 4 }}>
              Running on-device OCR and analyzing text structures...
            </ThemedText>
          </View>
        )}

        {/* Error State */}
        {hasError && !isProcessing && (
          <View style={styles.errorContainer}>
            <View style={styles.errorBanner}>
              <AlertTriangle size={20} color={colors.error} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodySm" color={colors.error} style={{ fontWeight: "700" }}>
                  OCR Extraction Failed
                </ThemedText>
                <ThemedText variant="caption" color={colors.error}>
                  {customError || ocrCapture.error || "Unable to extract text from the selected image."}
                </ThemedText>
              </View>
            </View>

            <View style={styles.errorBtnRow}>
              <Button
                title="Start Blank Note"
                variant="outline"
                icon={<FilePlus size={16} color={colors.ink} />}
                onPress={handleStartBlank}
                style={{ flex: 1 }}
              />
              <Button
                title="Try Again"
                icon={<RefreshCw size={16} color={colors.onPrimary} />}
                onPress={() => {
                  ocrCapture.reset();
                  setCustomError(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* Scan Entry / Options State */}
        {isScanPrompt && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCaptureCamera}
              style={styles.optionCard}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.accentSky }]}>
                <Camera size={24} color={colors.primary} />
              </View>
              <ThemedText variant="bodyMd" style={{ fontWeight: "700" }}>
                Take Photo
              </ThemedText>
              <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center" }}>
                Use your camera to photograph physical notes, documents, or whiteboards.
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickGallery}
              style={styles.optionCard}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.accentPurple }]}>
                <ImageIcon size={24} color={colors.accentPurpleDeep} />
              </View>
              <ThemedText variant="bodyMd" style={{ fontWeight: "700" }}>
                Upload from Gallery
              </ThemedText>
              <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center" }}>
                Select an existing photo or screenshot from your library.
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Review State */}
        {isReview && draft && (
          <ScrollView
            style={styles.reviewScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <MobileOCRPreviewCard
              draft={draft}
              onTitleChange={(newTitle) => setDraft({ ...draft, title: newTitle })}
              onBodyChange={(newBody) => setDraft({ ...draft, bodyText: newBody })}
            />

            {/* Folder selection chips */}
            <View style={styles.folderSection}>
              <View style={styles.sectionHeader}>
                <Folder size={14} color={colors.inkMuted} />
                <ThemedText variant="caption" color={colors.inkMuted} style={{ fontWeight: "600" }}>
                  Save in Folder
                </ThemedText>
              </View>
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
                      <ThemedText variant="caption" color={isSelected ? colors.onPrimary : colors.ink}>
                        {f.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Tags Section */}
            <View style={styles.tagSection}>
              <View style={styles.sectionHeader}>
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
                  containerStyle={styles.addTagInputContainer}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                />
                <TouchableOpacity activeOpacity={0.8} onPress={handleAddTag} style={styles.addTagBtn}>
                  <Plus size={18} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <Button
                title={isSaving ? "Saving..." : "Create Note"}
                onPress={handleSaveNote}
                disabled={isSaving}
                style={{ flex: 1 }}
              />

              {onOpenEditorWithDraft && (
                <Button
                  title="Full Editor"
                  variant="outline"
                  onPress={handleOpenInEditor}
                  disabled={isSaving}
                  style={{ flex: 1 }}
                />
              )}
            </View>

            <TouchableOpacity
              onPress={() => {
                ocrCapture.reset();
                setDraft(null);
              }}
              style={styles.rescanBtn}
            >
              <RefreshCw size={14} color={colors.primary} />
              <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: "600" }}>
                Scan Another Photo
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: spacing.sm
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl
  },
  optionsContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  optionCard: {
    flex: 1,
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 6
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  reviewScroll: {
    maxHeight: 480
  },
  folderSection: {
    marginTop: spacing.xs,
    gap: spacing.xxs
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  chipScroll: {
    flexDirection: "row",
    marginTop: 4
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
  tagSection: {
    gap: spacing.xxs,
    marginTop: spacing.xs
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4
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
    width: "100%",
    marginTop: 4
  },
  addTagInputContainer: {
    flex: 1,
    marginBottom: 0
  },
  addTagBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center"
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs
  },
  errorContainer: {
    gap: spacing.md,
    paddingVertical: spacing.xs
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  errorBtnRow: {
    flexDirection: "row",
    gap: spacing.xs
  }
});
