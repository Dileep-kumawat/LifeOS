import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Folder, Tag, Clock } from "lucide-react-native";
import { Card } from "../ui/Card";
import { ThemedText } from "../ui/ThemedText";
import { SyncBadge } from "../ui/SyncBadge";
import { colors, radius, spacing } from "../../theme";
import type { LocalNote, LocalNoteFolder } from "../../db/schema";

interface NoteCardProps {
  note: LocalNote;
  folder?: LocalNoteFolder;
  onPress: (note: LocalNote) => void;
}

export function NoteCard({ note, folder, onPress }: NoteCardProps) {
  let tags: string[] = [];
  try {
    tags = JSON.parse(note.tags || "[]");
  } catch {}

  const updatedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

  const previewSnippet = note.contentText
    ? note.contentText.substring(0, 100) + (note.contentText.length > 100 ? "..." : "")
    : "Empty note";

  return (
    <Card style={styles.card}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(note)}>
        <View style={styles.headerRow}>
          <ThemedText variant="heading3" numberOfLines={1} style={styles.title}>
            {note.title || "Untitled Note"}
          </ThemedText>
          <SyncBadge status={note.syncStatus} />
        </View>

        <ThemedText variant="bodySm" color={colors.inkSecondary} numberOfLines={2} style={styles.snippet}>
          {previewSnippet}
        </ThemedText>

        <View style={styles.footerRow}>
          <View style={styles.metaLeft}>
            {folder && (
              <View style={styles.folderBadge}>
                <Folder size={11} color={colors.primary} />
                <ThemedText variant="caption" color={colors.primary} numberOfLines={1}>
                  {folder.name}
                </ThemedText>
              </View>
            )}

            {tags.slice(0, 2).map((t) => (
              <View key={t} style={styles.tagBadge}>
                <Tag size={10} color={colors.inkMuted} />
                <ThemedText variant="caption" color={colors.inkMuted}>
                  {t}
                </ThemedText>
              </View>
            ))}

            {tags.length > 2 && (
              <ThemedText variant="caption" color={colors.inkFaint}>
                +{tags.length - 2}
              </ThemedText>
            )}
          </View>

          <View style={styles.dateWrap}>
            <Clock size={11} color={colors.inkFaint} />
            <ThemedText variant="caption" color={colors.inkFaint}>
              {updatedDate}
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    flex: 1,
    marginRight: spacing.xs
  },
  snippet: {
    marginTop: 4,
    marginBottom: spacing.sm
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: spacing.xs
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1
  },
  folderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.accentSky,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    maxWidth: 120
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs
  },
  dateWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  }
});
