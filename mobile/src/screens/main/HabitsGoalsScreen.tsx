import { View, StyleSheet } from "react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { colors, spacing } from "../../theme";

export function HabitsGoalsScreen() {
  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <ThemedText variant="heading2">Goals & Habits</ThemedText>
        <ThemedText variant="bodySm" color={colors.inkMuted}>
          Daily Tracking & Long-term Targets
        </ThemedText>
      </View>
      <Card style={styles.card}>
        <ThemedText variant="bodyMd" color={colors.inkMuted}>
          Habits and Goals module ready for Prompt 4 (Full Feature Port & Offline Sync). Local schema mirrored in SQLite.
        </ThemedText>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md, marginTop: spacing.xs },
  card: { padding: spacing.md }
});
