import React from "react";
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback
} from "react-native";
import { X } from "lucide-react-native";
import { ThemedText } from "./ThemedText";
import { colors, radius, spacing, shadows } from "../../theme";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  scrollable = true
}: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayTouch} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <ThemedText variant="heading3">{title}</ThemedText>
              {subtitle && (
                <ThemedText variant="caption" color={colors.inkMuted}>
                  {subtitle}
                </ThemedText>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          {scrollable ? (
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end"
  },
  overlayTouch: {
    flex: 1
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "90%",
    width: "100%",
    ...shadows.overlay
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  headerTextContainer: {
    flex: 1,
    marginRight: spacing.md
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft
  },
  contentScroll: {
    maxHeight: 550
  },
  content: {
    padding: spacing.lg
  }
});
