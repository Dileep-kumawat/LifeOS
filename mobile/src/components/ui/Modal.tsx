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
          {/* Sheet Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <ThemedText variant="heading3">{title}</ThemedText>
              {subtitle && (
                <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: 2 }}>
                  {subtitle}
                </ThemedText>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.inkSecondary} />
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end"
  },
  overlayTouch: {
    flex: 1
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    width: "100%",
    ...shadows.overlay
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.xxs
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.hairline
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
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
    maxHeight: 560
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  }
});

