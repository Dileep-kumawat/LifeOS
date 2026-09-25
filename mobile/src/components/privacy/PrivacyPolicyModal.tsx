import { View, StyleSheet } from "react-native";
import { Modal } from "../ui/Modal";
import { ThemedText } from "../ui/ThemedText";
import { Button } from "../ui/Button";
import { colors, radius, spacing } from "../../theme";

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Privacy Policy & AI Disclosure"
      subtitle="Data collection, GDPR/DPDP rights & AI model disclosures"
    >
      <View style={styles.container}>
        {/* Section 1 */}
        <View style={styles.section}>
          <ThemedText variant="title" style={styles.sectionHeading}>
            1. Data Protection Overview
          </ThemedText>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.paragraph}>
            LifeOS complies with the EU General Data Protection Regulation (GDPR) and the India
            Digital Personal Data Protection Act (DPDP Act, 2023). We process data solely to deliver
            personal productivity, time tracking, knowledge management, and financial insights.
          </ThemedText>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <ThemedText variant="title" style={styles.sectionHeading}>
            2. Third-Party AI Processing (NFR-6.2)
          </ThemedText>
          <View style={styles.highlightBox}>
            <ThemedText variant="bodySm" style={styles.fallbackTitle}>
              Configured LLM Fallback Chain: Mistral AI → Groq → Google Gemini
            </ThemedText>
            <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.paragraph}>
              When using AI features (assistant chat, daily summaries, or periodic recommendations),
              your prompt and relevant task/note context are processed by external providers.
            </ThemedText>
            <View style={styles.alertBox}>
              <ThemedText variant="caption" style={styles.alertText}>
                <ThemedText variant="caption" style={styles.boldText}>
                  Model Training Notice:{" "}
                </ThemedText>
                On free/developer tiers (such as Google AI Studio free tier), provider terms permit
                submitted data to be retained and used to train or improve models. On enterprise
                tiers with Zero Data Retention (ZDR), customer data is not used for model training.
                Production deployments should utilize enterprise keys with ZDR agreements.
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <ThemedText variant="title" style={styles.sectionHeading}>
            3. Account Deletion & 30-Day Purge
          </ThemedText>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.paragraph}>
            When you request account deletion, your account is immediately placed into a soft-deleted
            state, revoking all active sessions and blocking access. After a 30-day grace period, a
            permanent cascade purge removes all records across all 25 user collections (calendar,
            notes, habits, finances, study plans, AI messages, and tombstones).
          </ThemedText>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <ThemedText variant="title" style={styles.sectionHeading}>
            4. Data Portability (Export)
          </ThemedText>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.paragraph}>
            You can export a complete machine-readable JSON archive of all your personal data at any
            time via the &quot;Export Account Data&quot; button in Settings. Secrets (passwords, token
            hashes, and private keys) are strictly excluded for your security.
          </ThemedText>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <ThemedText variant="title" style={styles.sectionHeading}>
            5. Privacy Contact & Grievance
          </ThemedText>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.paragraph}>
            For privacy inquiries, rights requests, or grievance redressal under DPDP, please
            contact the Data Protection Officer at:
          </ThemedText>
          <View style={styles.codeBadge}>
            <ThemedText variant="caption" style={styles.codeText}>
              privacy@lifeos.example.com
            </ThemedText>
          </View>
        </View>

        <Button
          title="Close Policy"
          variant="outline"
          size="md"
          fullWidth
          onPress={onClose}
          style={styles.closeBtn}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  section: {
    gap: spacing.xxs
  },
  sectionHeading: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  paragraph: {
    lineHeight: 19
  },
  highlightBox: {
    backgroundColor: colors.canvasSoft,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: spacing.xs
  },
  fallbackTitle: {
    fontWeight: "600",
    color: colors.ink,
    fontSize: 13
  },
  alertBox: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    padding: spacing.xs,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)"
  },
  alertText: {
    color: "#92400e",
    lineHeight: 17
  },
  boldText: {
    fontWeight: "700",
    color: "#78350f"
  },
  codeBadge: {
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignSelf: "flex-start",
    marginTop: 2
  },
  codeText: {
    fontFamily: "monospace",
    color: colors.primary,
    fontWeight: "600"
  },
  closeBtn: {
    marginTop: spacing.xs
  }
});
