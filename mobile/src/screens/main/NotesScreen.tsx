import { View, StyleSheet } from "react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { colors, spacing } from "../../theme";

export function NotesScreen() {
  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <ThemedText variant="heading2">Notes & Docs</ThemedText>
        <ThemedText variant="bodySm" color={colors.inkMuted}>
          Rich text, folders & version history
        </ThemedText>
      </View>
      <Card style={styles.card}>
        <ThemedText variant="bodyMd" color={colors.inkMuted}>
          Notes module with NoteVersion history (FR-5.6) ready for Prompt 4 and conflict resolution. Local schema mirrored in SQLite.
        </ThemedText>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md, marginTop: spacing.xs },
  card: { padding: spacing.md }
});
