import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../theme";

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  edges?: ("top" | "left" | "right" | "bottom")[];
  refreshControl?: React.ReactElement;
}

export function ScreenContainer({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  backgroundColor = colors.canvasSoft,
  edges = ["left", "right"],
  refreshControl
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }, style]} edges={edges}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  keyboardAvoid: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.md
  },
  content: {
    flex: 1,
    padding: spacing.md
  }
});
