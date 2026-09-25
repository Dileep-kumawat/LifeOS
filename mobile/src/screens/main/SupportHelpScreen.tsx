import { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  HelpCircle,
  Bot,
  Sparkles,
  Target,
  BookOpen,
  Calendar,
  CheckSquare,
  Wallet,
  FileText,
  GraduationCap,
  Timer,
  BarChart3,
  ShieldCheck,
  Users,
  Compass,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  Lock,
  Scale,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  HeartHandshake,
  X
} from "lucide-react-native";

import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PrivacyPolicyModal } from "../../components/privacy/PrivacyPolicyModal";
import { colors, radius, spacing, shadows } from "../../theme";

type TabKey = "all" | "audience" | "purpose" | "modules" | "terms" | "faq";

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Can I use LifeOS completely offline?",
    answer:
      "Yes. LifeOS is engineered with an offline-first architecture. On mobile and web, your data is cached locally so you can continue creating notes, logging transactions, running focus timers, and checking off habits. When your device reconnects to the internet, our background sync engine smoothly resolves and uploads all changes.",
    category: "General & Sync"
  },
  {
    question: "How does the AI Assistant know about my workspace?",
    answer:
      "When you converse with the AI Assistant, relevant contextual fragments from your notes, calendar events, habits, and syllabus topics are securely retrieved using vector embeddings (Retrieval-Augmented Generation / RAG). The assistant only accesses data within your personal workspace and never sees data from other users.",
    category: "AI & Privacy"
  },
  {
    question: "Is my personal data used to train AI models?",
    answer:
      "On enterprise deployment tiers with Zero Data Retention (ZDR) agreements, customer prompts and completions are strictly prohibited from being used for AI training. In free or developer demo tiers (such as Google AI Studio free tier), provider policies may permit data sampling for model quality improvement. Production deployments should always use enterprise ZDR keys.",
    category: "AI & Privacy"
  },
  {
    question: "How does the Spaced Repetition (SM-2) flashcard system work?",
    answer:
      "LifeOS implements the SuperMemo SM-2 spaced repetition algorithm. When reviewing a flashcard, you grade your recall on a scale of 0 to 5. The algorithm calculates an optimal next review interval (days) and ease factor, ensuring you review difficult cards frequently and well-remembered cards just before they fade from memory.",
    category: "Study & Flashcards"
  },
  {
    question: "How do I export all my data if I want a backup or to migrate?",
    answer:
      "Under GDPR Article 20 and India DPDP Act compliance, you retain full data sovereignty. Simply navigate to Settings → Privacy & Data Protection → click 'Export My Data'. You will instantly receive a complete, structured JSON archive containing your calendar events, habits, transactions, budgets, notes, and study plans.",
    category: "Account & Data"
  },
  {
    question: "What happens if I request to delete my account?",
    answer:
      "When you trigger account deletion in Settings, your account is immediately placed into a soft-deleted state, revoking active sessions and blocking logins. We provide a 30-day grace period during which you can contact support to cancel the request. After 30 days, an automated cascade worker permanently purges all records across all 25 user collections.",
    category: "Account & Data"
  }
];

export function SupportHelpScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToTab = (screenName: string) => {
    if (navigation?.navigate) {
      navigation.navigate("MainTabs", { screen: screenName });
    }
  };

  const navigateToAssistant = () => {
    if (navigation?.navigate) {
      navigation.navigate("MainTabs", { screen: "Assistant" });
    }
  };

  const navigateToSettings = () => {
    if (navigation?.navigate) {
      navigation.navigate("MainTabs", { screen: "Settings" });
    }
  };

  return (
    <ScreenContainer scrollable edges={["left", "right", "bottom"]}>
      <View style={styles.container}>
        {/* ─── Hero Header Card ─────────────────────────────────────── */}
        <Card style={styles.heroCard}>
          <View style={styles.badgePill}>
            <HelpCircle size={14} color={colors.primary} />
            <ThemedText variant="caption" style={styles.badgeText}>
              LifeOS Knowledge & Support Center
            </ThemedText>
          </View>

          <ThemedText variant="heading2" style={styles.heroTitle}>
            Support, Guidelines & Terms
          </ThemedText>

          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.heroSubtitle}>
            Everything you need to master your personal operating system. Understand our mission,
            explore module workflows, review terms and guidelines, or connect with our AI Assistant
            for direct help.
          </ThemedText>

          <View style={styles.heroActions}>
            <Button
              title="Chat with Assistant"
              variant="primary"
              size="md"
              onPress={navigateToAssistant}
              icon={<Bot size={16} color="#ffffff" />}
              style={styles.heroPrimaryBtn}
            />
            <Button
              title="View Privacy Policy"
              variant="outline"
              size="md"
              onPress={() => setPrivacyModalOpen(true)}
              icon={<ShieldCheck size={16} color={colors.primary} />}
            />
          </View>
        </Card>

        {/* ─── Search Bar ───────────────────────────────────────────── */}
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.inkFaint} style={styles.searchIcon} />
          <TextInput
            placeholder="Search help, terms, or guide..."
            placeholderTextColor={colors.inkFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
              <X size={14} color={colors.inkMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Navigation Filter Tabs ───────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {[
            { key: "all", label: "All Topics" },
            { key: "audience", label: "For Whom" },
            { key: "purpose", label: "What Purpose" },
            { key: "modules", label: "How to Use" },
            { key: "terms", label: "Terms & Guidelines" },
            { key: "faq", label: "FAQ" }
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as TabKey)}
                style={[styles.filterTabPill, isActive && styles.filterTabPillActive]}
                activeOpacity={0.7}
              >
                <ThemedText
                  variant="caption"
                  style={[styles.filterTabText, isActive && styles.filterTabTextActive]}
                >
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── SECTION 1: For Whom This App Is Made ─────────────────── */}
        {(activeTab === "all" || activeTab === "audience") && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "#e0f2fe" }]}>
                <Users size={16} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <ThemedText variant="title" style={styles.sectionTitle}>
                  For Whom This App Is Made
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted}>
                  Designed for individuals who demand intentional control over their time, knowledge,
                  and growth.
                </ThemedText>
              </View>
            </View>

            <View style={styles.cardsGrid}>
              {/* Persona 1 */}
              <Card style={styles.personaCard}>
                <View style={styles.personaHeader}>
                  <View style={[styles.personaIconWell, { backgroundColor: "#eff6ff" }]}>
                    <Target size={20} color={colors.primary} />
                  </View>
                  <View style={styles.personaTitleContainer}>
                    <ThemedText variant="bodyMd" style={styles.cardHeading}>
                      High Performers & Leaders
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkMuted}>
                      Executives, managers, and project leaders
                    </ThemedText>
                  </View>
                </View>
                <ThemedText variant="bodySm" color={colors.inkSecondary} style={styles.cardBodyText}>
                  Eliminate fragmented context switching between calendar apps, spreadsheets, and task
                  managers. LifeOS brings your quarterly objectives, daily time blocking, and key
                  deliverables into a single clean executive command center.
                </ThemedText>
              </Card>

              {/* Persona 2 */}
              <Card style={styles.personaCard}>
                <View style={styles.personaHeader}>
                  <View style={[styles.personaIconWell, { backgroundColor: "#f3e8ff" }]}>
                    <GraduationCap size={20} color="#9333ea" />
                  </View>
                  <View style={styles.personaTitleContainer}>
                    <ThemedText variant="bodyMd" style={styles.cardHeading}>
                      Students & Academics
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkMuted}>
                      Lifelong learners, university scholars, and test preppers
                    </ThemedText>
                  </View>
                </View>
                <ThemedText variant="bodySm" color={colors.inkSecondary} style={styles.cardBodyText}>
                  Map your syllabus topic by topic, track countdowns to exam day, take lecture notes in
                  clean Markdown, and retain concepts permanently using science-backed SM-2 spaced
                  repetition flashcards.
                </ThemedText>
              </Card>

              {/* Persona 3 */}
              <Card style={styles.personaCard}>
                <View style={styles.personaHeader}>
                  <View style={[styles.personaIconWell, { backgroundColor: "#fef3c7" }]}>
                    <Zap size={20} color="#d97706" />
                  </View>
                  <View style={styles.personaTitleContainer}>
                    <ThemedText variant="bodyMd" style={styles.cardHeading}>
                      Builders, Founders & Freelancers
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkMuted}>
                      Creators balancing runway, product milestones, and habits
                    </ThemedText>
                  </View>
                </View>
                <ThemedText variant="bodySm" color={colors.inkSecondary} style={styles.cardBodyText}>
                  Keep your financial runway in check with monthly category budgets and receipt
                  scanning, document architectures and brainstorms in nested notes, and protect deep
                  focus hours with integrated Pomodoro sessions.
                </ThemedText>
              </Card>

              {/* Persona 4 */}
              <Card style={styles.personaCard}>
                <View style={styles.personaHeader}>
                  <View style={[styles.personaIconWell, { backgroundColor: "#ecfdf5" }]}>
                    <HeartHandshake size={20} color="#059669" />
                  </View>
                  <View style={styles.personaTitleContainer}>
                    <ThemedText variant="bodyMd" style={styles.cardHeading}>
                      Mindful Achievers
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkMuted}>
                      Anyone seeking digital calm and sustainable routine
                    </ThemedText>
                  </View>
                </View>
                <ThemedText variant="bodySm" color={colors.inkSecondary} style={styles.cardBodyText}>
                  Escape notification fatigue and app bloat. LifeOS offers a warm paper-soft canvas with
                  zero ads, zero algorithmic feeds, and transparent privacy policies designed to support
                  mental clarity.
                </ThemedText>
              </Card>
            </View>
          </View>
        )}

        {/* ─── SECTION 2: What Purpose It Solves ────────────────────── */}
        {(activeTab === "all" || activeTab === "purpose") && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "#e0f2fe" }]}>
                <Compass size={16} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <ThemedText variant="title" style={styles.sectionTitle}>
                  What Purpose LifeOS Solves
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted}>
                  Breaking the modern productivity dilemma: uniting siloed life components into one
                  ecosystem.
                </ThemedText>
              </View>
            </View>

            <Card style={styles.purposeContainerCard}>
              {/* Problem Block */}
              <View style={styles.problemBox}>
                <ThemedText variant="caption" style={styles.problemTag}>
                  ✕ THE PROBLEM: THE 10-APP FRAGMENTATION TRAP
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkSecondary} style={styles.pillarDesc}>
                  You track calendar events in one tool, habits in another, notes in a third, study cards
                  in a separate mobile app, and budget in a spreadsheet. Your attention is fractured,
                  data is locked in isolated silos, and recurring subscription costs stack up.
                </ThemedText>
              </View>

              {/* Solution Block */}
              <View style={styles.solutionBox}>
                <View style={styles.solutionTitleRow}>
                  <CheckCircle2 size={15} color={colors.primary} />
                  <ThemedText variant="caption" style={styles.solutionTag}>
                    THE LIFEOS UNIFIED SOLUTION
                  </ThemedText>
                </View>
                <ThemedText variant="bodySm" color={colors.inkSecondary} style={styles.pillarDesc}>
                  A centralized, cohesive Personal Operating System where all life disciplines
                  interlock. A habit completion updates your weekly productivity analytics; a study
                  topic links directly to a focus timer; an expense scan alerts your monthly budget; and
                  an AI copilot knows your context.
                </ThemedText>
              </View>

              <View style={styles.divider} />

              <ThemedText variant="caption" style={styles.pillarsHeader}>
                FOUR ARCHITECTURAL PILLARS OF LIFEOS
              </ThemedText>

              <View style={styles.pillarsGrid}>
                <View style={styles.pillarCard}>
                  <View style={styles.pillarTitleRow}>
                    <Layers size={14} color={colors.primary} />
                    <ThemedText variant="caption" style={styles.pillarTitle}>
                      Total Cohesion
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" color={colors.inkMuted} style={styles.pillarText}>
                    Cross-module linking connects tasks, study syllabus, and Pomodoro timers.
                  </ThemedText>
                </View>

                <View style={styles.pillarCard}>
                  <View style={styles.pillarTitleRow}>
                    <Zap size={14} color={colors.primary} />
                    <ThemedText variant="caption" style={styles.pillarTitle}>
                      Local-First Sync
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" color={colors.inkMuted} style={styles.pillarText}>
                    Work offline freely; our delta engine reconciles state automatically.
                  </ThemedText>
                </View>

                <View style={styles.pillarCard}>
                  <View style={styles.pillarTitleRow}>
                    <Lock size={14} color={colors.primary} />
                    <ThemedText variant="caption" style={styles.pillarTitle}>
                      Data Sovereignty
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" color={colors.inkMuted} style={styles.pillarText}>
                    Full JSON data exports, 30-day grace periods, zero third-party ads.
                  </ThemedText>
                </View>

                <View style={styles.pillarCard}>
                  <View style={styles.pillarTitleRow}>
                    <Sparkles size={14} color={colors.primary} />
                    <ThemedText variant="caption" style={styles.pillarTitle}>
                      Contextual AI
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" color={colors.inkMuted} style={styles.pillarText}>
                    RAG-grounded summaries, habit tips, and conversational execution.
                  </ThemedText>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* ─── SECTION 3: How to Use LifeOS ─────────────────────────── */}
        {(activeTab === "all" || activeTab === "modules") && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "#e0f2fe" }]}>
                <BookOpen size={16} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <ThemedText variant="title" style={styles.sectionTitle}>
                  How to Use LifeOS
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted}>
                  A practical guide to the core modules and our recommended daily operating rhythm.
                </ThemedText>
              </View>
            </View>

            {/* Daily Operating Rhythm Card */}
            <Card style={styles.rhythmCard}>
              <View style={styles.rhythmHeader}>
                <Clock size={16} color={colors.primary} />
                <ThemedText variant="caption" style={styles.rhythmTag}>
                  RECOMMENDED DAILY OPERATING RHYTHM
                </ThemedText>
              </View>
              <ThemedText variant="caption" color={colors.inkMuted} style={styles.rhythmSubtitle}>
                A simple 15-minute daily routine to keep your life organized and momentum high
              </ThemedText>

              <View style={styles.rhythmStepsContainer}>
                <View style={styles.rhythmStepBox}>
                  <ThemedText variant="caption" style={styles.rhythmStepTitle}>
                    1. Morning Alignment (5 min)
                  </ThemedText>
                  <ThemedText variant="caption" color={colors.inkMuted} style={styles.rhythmStepDesc}>
                    Open your Dashboard. Review your AI-generated daily summary, check today&apos;s scheduled
                    events in the Calendar, and confirm your top 1–3 high-impact goals.
                  </ThemedText>
                </View>

                <View style={styles.rhythmStepBox}>
                  <ThemedText variant="caption" style={styles.rhythmStepTitle}>
                    2. Daytime Deep Work
                  </ThemedText>
                  <ThemedText variant="caption" color={colors.inkMuted} style={styles.rhythmStepDesc}>
                    Fire up the Focus Timer for 25-minute Pomodoros linked directly to your active study
                    topic or project note. Check off daily Habits as you complete them.
                  </ThemedText>
                </View>

                <View style={styles.rhythmStepBox}>
                  <ThemedText variant="caption" style={styles.rhythmStepTitle}>
                    3. Evening Wrap-Up (5 min)
                  </ThemedText>
                  <ThemedText variant="caption" color={colors.inkMuted} style={styles.rhythmStepDesc}>
                    Log daily expenses in Finance (or scan receipts), clear your due Flashcards queue, and
                    observe your consistency streak on the Dashboard.
                  </ThemedText>
                </View>
              </View>
            </Card>

            {/* 9 Modules Grid */}
            <View style={styles.cardsGrid}>
              {/* Module 1: Calendar */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "#eff6ff" }]}>
                    <Calendar size={18} color={colors.primary} />
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToTab("Calendar")}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Calendar
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  Calendar & Time-Blocking
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Schedule single and recurring events, set custom reminders, color-code priorities, and
                  sync two-way with Google Calendar.
                </ThemedText>
              </Card>

              {/* Module 2: Habits */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "#ecfdf5" }]}>
                    <CheckSquare size={18} color="#059669" />
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToTab("Habits & Goals")}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Habits
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  Habits & Consistency
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Establish daily or weekly micro-habits. Daily check-ins automatically compute streaks,
                  completion rates, and consistency metrics.
                </ThemedText>
              </Card>

              {/* Module 3: Goals */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "#fef3c7" }]}>
                    <Target size={18} color="#d97706" />
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToTab("Habits & Goals")}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Goals
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  Goals & Key Results (OKRs)
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Set long-term objectives and break them down into measurable Key Results with automated
                  progress bars and target dates.
                </ThemedText>
              </Card>

              {/* Module 4: Finance */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "#ccfbf1" }]}>
                    <Wallet size={18} color="#0d9488" />
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToTab("Finance")}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Finance
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  Finance & Budgeting
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Track income and expenses across customizable categories. Set monthly alert thresholds
                  and scan physical receipts via client-side OCR.
                </ThemedText>
              </Card>

              {/* Module 5: Notes */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "#e0e7ff" }]}>
                    <FileText size={18} color="#4f46e5" />
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToTab("Notes")}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Notes
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  Notes & Knowledge Base
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Full-screen rich Markdown editor with folder hierarchies, tags, pinned status, and
                  automatic version delta revision history.
                </ThemedText>
              </Card>

              {/* Module 6: Study */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "#f3e8ff" }]}>
                    <GraduationCap size={18} color="#9333ea" />
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToTab("Study")}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Study
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  Study & Spaced Repetition
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Organize subjects and syllabus topics with exam deadlines. Review flashcard decks with the
                  scientific SuperMemo SM-2 algorithm.
                </ThemedText>
              </Card>

              {/* Module 7: Focus */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "#ffe4e6" }]}>
                    <Timer size={18} color="#e11d48" />
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToTab("Focus")}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Focus
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  Pomodoro Focus Timer
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Configurable work and break intervals. Link sessions directly to topics or goals to
                  automatically record cumulative deep work minutes.
                </ThemedText>
              </Card>

              {/* Module 8: Analytics */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "#e0f2fe" }]}>
                    <BarChart3 size={18} color="#0284c7" />
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToTab("Analytics")}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Analytics
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  Executive Analytics
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Interactive charts for productivity scores, streak consistency, multi-month spending
                  trends, and synchronous CSV report exports.
                </ThemedText>
              </Card>

              {/* Module 9: Assistant */}
              <Card style={styles.moduleCard}>
                <View style={styles.moduleCardHeader}>
                  <View style={[styles.moduleIconWell, { backgroundColor: "rgba(0, 93, 178, 0.12)" }]}>
                    <Bot size={18} color={colors.primary} />
                  </View>
                  <TouchableOpacity
                    onPress={navigateToAssistant}
                    style={styles.openModuleBtn}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="caption" color={colors.primary} style={styles.openModuleText}>
                      Open Assistant
                    </ThemedText>
                    <ArrowRight size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ThemedText variant="bodyMd" style={styles.cardHeading}>
                  AI Copilot & Summaries
                </ThemedText>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.cardBodyText}>
                  Context-aware assistant for natural language scheduling, study planning, weekly
                  recommendations, and intelligent queries.
                </ThemedText>
              </Card>
            </View>
          </View>
        )}

        {/* ─── SECTION 4: Terms & Guidelines ────────────────────────── */}
        {(activeTab === "all" || activeTab === "terms") && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "#e0f2fe" }]}>
                <Scale size={16} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <ThemedText variant="title" style={styles.sectionTitle}>
                  Platform Guidelines & Terms of Service
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted}>
                  Rules of engagement, acceptable use policies, legal terms, and privacy commitments.
                </ThemedText>
              </View>
            </View>

            <View style={styles.cardsGrid}>
              {/* Term 1 */}
              <Card style={styles.termCard}>
                <View style={styles.termHeader}>
                  <ShieldCheck size={18} color={colors.primary} />
                  <ThemedText variant="bodyMd" style={styles.cardHeading}>
                    1. Acceptable Use & Account Integrity
                  </ThemedText>
                </View>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.termIntro}>
                  LifeOS is provided for personal productivity, educational, and organizational
                  purposes. You agree to:
                </ThemedText>
                <View style={styles.bulletList}>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      Maintain confidentiality of your credentials and linked OAuth tokens.
                    </ThemedText>
                  </View>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      Avoid automated scraping, denial of service (DoS) attempts, or circumvention of
                      rate limits.
                    </ThemedText>
                  </View>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      Refrain from uploading unlawful, infringing, or malicious content into notes or
                      attachments.
                    </ThemedText>
                  </View>
                </View>
              </Card>

              {/* Term 2 */}
              <Card style={styles.termCard}>
                <View style={styles.termHeader}>
                  <Lock size={18} color={colors.primary} />
                  <ThemedText variant="bodyMd" style={styles.cardHeading}>
                    2. Data Sovereignty & Portability (GDPR/DPDP)
                  </ThemedText>
                </View>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.termIntro}>
                  Your data belongs to you. In compliance with GDPR Article 20 and the India DPDP Act
                  2023:
                </ThemedText>
                <View style={styles.bulletList}>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      You may export a full JSON snapshot of your data at any time via Settings.
                    </ThemedText>
                  </View>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      Transmitted data is encrypted via TLS 1.3; storage is protected with AES-256
                      standards.
                    </ThemedText>
                  </View>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      Account deletion invokes an instant 30-day grace period followed by a permanent
                      cascade wipe.
                    </ThemedText>
                  </View>
                </View>
              </Card>

              {/* Term 3 */}
              <Card style={styles.termCard}>
                <View style={styles.termHeader}>
                  <Bot size={18} color={colors.primary} />
                  <ThemedText variant="bodyMd" style={styles.cardHeading}>
                    3. AI Processing & Third-Party Disclosure (NFR-6.2)
                  </ThemedText>
                </View>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.termIntro}>
                  LifeOS utilizes a resilient fallback chain:{" "}
                  <ThemedText variant="bodySm" style={{ fontWeight: "700", color: colors.ink }}>
                    Mistral AI → Groq → Google Gemini
                  </ThemedText>
                  :
                </ThemedText>
                <View style={styles.bulletList}>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      Only your prompt and relevant task/note fragments (via vector RAG) are
                      transmitted.
                    </ThemedText>
                  </View>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      Enterprise deployments enforce Zero Data Retention (ZDR) prohibiting model
                      training.
                    </ThemedText>
                  </View>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      AI features are strictly optional; all core modules work offline without external
                      LLM calls.
                    </ThemedText>
                  </View>
                </View>
              </Card>

              {/* Term 4 */}
              <Card style={styles.termCard}>
                <View style={styles.termHeader}>
                  <Scale size={18} color={colors.primary} />
                  <ThemedText variant="bodyMd" style={styles.cardHeading}>
                    4. Disclaimers & Limitations of Liability
                  </ThemedText>
                </View>
                <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.termIntro}>
                  LifeOS services and AI responses are organizational tools provided &quot;as is&quot;:
                </ThemedText>
                <View style={styles.bulletList}>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      AI suggestions and budget summaries do not constitute certified financial or
                      legal counsel.
                    </ThemedText>
                  </View>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      Study schedules and flashcard calculations are educational aids; verify academic
                      deadlines independently.
                    </ThemedText>
                  </View>
                  <View style={styles.bulletRow}>
                    <ThemedText variant="caption" style={styles.bulletDot}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkSecondary} style={styles.bulletText}>
                      We maintain high availability standards with automated backups, but recommend
                      periodic user data exports.
                    </ThemedText>
                  </View>
                </View>
              </Card>
            </View>

            {/* Privacy Policy Banner */}
            <Card style={styles.policyBannerCard}>
              <View style={styles.policyBannerText}>
                <ThemedText variant="caption" style={styles.policyBannerTitle}>
                  Need the complete legal compliance specification?
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted}>
                  Review our full 5-section Privacy Policy including DPO contact details and audit trail
                  practices.
                </ThemedText>
              </View>
              <Button
                title="Open Full Privacy Policy"
                variant="outline"
                size="sm"
                onPress={() => setPrivacyModalOpen(true)}
                style={styles.openPolicyBtn}
              />
            </Card>
          </View>
        )}

        {/* ─── SECTION 5: Frequently Asked Questions (FAQ) ─────────── */}
        {(activeTab === "all" || activeTab === "faq") && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "#e0f2fe" }]}>
                <HelpCircle size={16} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <ThemedText variant="title" style={styles.sectionTitle}>
                  Frequently Asked Questions
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted}>
                  Quick answers to common questions about features, sync, privacy, and configuration.
                </ThemedText>
              </View>
            </View>

            <View style={styles.faqList}>
              {filteredFaqs.length === 0 ? (
                <Card style={styles.emptyFaqCard}>
                  <ThemedText variant="caption" color={colors.inkMuted} style={{ textAlign: "center" }}>
                    No FAQ topics found matching &quot;{searchQuery}&quot;. Try a different term or ask
                    the AI Assistant directly below.
                  </ThemedText>
                </Card>
              ) : (
                filteredFaqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <Card key={faq.question} style={styles.faqCard}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleFaq(index)}
                        style={styles.faqQuestionRow}
                      >
                        <View style={styles.faqQuestionLeft}>
                          <ThemedText variant="bodySm" style={styles.faqQuestionText}>
                            {faq.question}
                          </ThemedText>
                          <View style={styles.faqCategoryBadge}>
                            <ThemedText variant="caption" color={colors.inkMuted} style={styles.faqCategoryText}>
                              {faq.category}
                            </ThemedText>
                          </View>
                        </View>
                        {isOpen ? (
                          <ChevronUp size={18} color={colors.primary} style={styles.faqChevron} />
                        ) : (
                          <ChevronDown size={18} color={colors.inkFaint} style={styles.faqChevron} />
                        )}
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={styles.faqAnswerContainer}>
                          <ThemedText variant="bodySm" color={colors.inkSecondary} style={styles.faqAnswerText}>
                            {faq.answer}
                          </ThemedText>
                        </View>
                      )}
                    </Card>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ─── SECTION 6: Need Further Help? (Direct Chat CTA) ────── */}
        <LinearGradient
          colors={["#005db2", "#003870"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chatCtaBanner}
        >
          <View style={styles.chatCtaHeader}>
            <Bot size={16} color="#bfdbfe" />
            <ThemedText variant="caption" style={styles.chatCtaEyebrow}>
              STILL HAVE QUESTIONS?
            </ThemedText>
          </View>

          <ThemedText variant="heading3" style={styles.chatCtaTitle}>
            Chat with our AI Assistant for Instant Support
          </ThemedText>

          <ThemedText variant="bodySm" style={styles.chatCtaDesc}>
            Our intelligent assistant has real-time context on every LifeOS feature, keyboard shortcut,
            study technique, and troubleshooting step. Ask questions in plain English or get guidance
            tailored to your schedule.
          </ThemedText>

          <View style={styles.chatCtaActions}>
            <Button
              title="Open Support Chat"
              variant="secondary"
              size="md"
              onPress={navigateToAssistant}
              icon={<Bot size={16} color={colors.primary} />}
              style={styles.chatCtaPrimaryBtn}
              textStyle={{ color: colors.primary, fontWeight: "700" }}
            />
            <Button
              title="Manage Settings"
              variant="outline"
              size="md"
              onPress={navigateToSettings}
              style={styles.chatCtaSecondaryBtn}
              textStyle={{ color: "#ffffff" }}
            />
          </View>
        </LinearGradient>
      </View>

      {/* ─── Privacy Policy Modal ───────────────────────────────────── */}
      <PrivacyPolicyModal
        visible={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg
  },
  heroCard: {
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#bae6fd",
    gap: 6
  },
  badgeText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 11.5
  },
  heroTitle: {
    color: colors.ink,
    letterSpacing: -0.4,
    marginTop: 2
  },
  heroSubtitle: {
    lineHeight: 20
  },
  heroActions: {
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  heroPrimaryBtn: {
    backgroundColor: colors.primary
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42
  },
  searchIcon: {
    marginRight: spacing.xs
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: Platform.OS === "ios" ? 8 : 4
  },
  clearSearchBtn: {
    padding: spacing.xxs
  },
  tabsScrollContent: {
    gap: spacing.xs,
    paddingVertical: 2
  },
  filterTabPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.full
  },
  filterTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterTabText: {
    color: "#414753",
    fontWeight: "500",
    fontSize: 12
  },
  filterTabTextActive: {
    color: "#ffffff",
    fontWeight: "700"
  },
  sectionContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2
  },
  sectionIconBadge: {
    padding: spacing.xs - 2,
    borderRadius: radius.md
  },
  sectionHeaderText: {
    flex: 1
  },
  sectionTitle: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: 16
  },
  cardsGrid: {
    gap: spacing.sm
  },
  personaCard: {
    padding: spacing.md,
    gap: spacing.xs
  },
  personaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  personaIconWell: {
    padding: spacing.xs,
    borderRadius: radius.md
  },
  personaTitleContainer: {
    flex: 1
  },
  cardHeading: {
    fontWeight: "700",
    color: colors.ink
  },
  cardBodyText: {
    lineHeight: 19
  },
  purposeContainerCard: {
    padding: spacing.md,
    gap: spacing.sm
  },
  problemBox: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    gap: 4
  },
  problemTag: {
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 11
  },
  solutionBox: {
    backgroundColor: "rgba(0, 117, 222, 0.06)",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(0, 117, 222, 0.2)",
    gap: 4
  },
  solutionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  solutionTag: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 11
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: 2
  },
  pillarsHeader: {
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: 0.2,
    fontSize: 11
  },
  pillarsGrid: {
    gap: spacing.xs
  },
  pillarCard: {
    backgroundColor: colors.canvasSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 2
  },
  pillarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  pillarTitle: {
    fontWeight: "700",
    color: colors.ink
  },
  pillarText: {
    lineHeight: 16
  },
  pillarDesc: {
    lineHeight: 18
  },
  rhythmCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: "rgba(0, 117, 222, 0.25)",
    gap: spacing.xs
  },
  rhythmHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  rhythmTag: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 11.5,
    letterSpacing: 0.3
  },
  rhythmSubtitle: {
    lineHeight: 16
  },
  rhythmStepsContainer: {
    gap: spacing.xs,
    marginTop: 4
  },
  rhythmStepBox: {
    backgroundColor: colors.canvasSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 2
  },
  rhythmStepTitle: {
    fontWeight: "700",
    color: colors.ink
  },
  rhythmStepDesc: {
    lineHeight: 16
  },
  moduleCard: {
    padding: spacing.md,
    gap: spacing.xxs
  },
  moduleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  moduleIconWell: {
    padding: spacing.xs - 2,
    borderRadius: radius.md
  },
  openModuleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  openModuleText: {
    fontWeight: "600",
    fontSize: 11.5
  },
  termCard: {
    padding: spacing.md,
    gap: spacing.xs
  },
  termHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  termIntro: {
    lineHeight: 18
  },
  bulletList: {
    gap: 6,
    paddingLeft: spacing.xxs
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6
  },
  bulletDot: {
    color: colors.primary,
    fontWeight: "700"
  },
  bulletText: {
    flex: 1,
    lineHeight: 17
  },
  policyBannerCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface
  },
  policyBannerText: {
    gap: 2
  },
  policyBannerTitle: {
    fontWeight: "700",
    color: colors.ink
  },
  openPolicyBtn: {
    alignSelf: "flex-start"
  },
  faqList: {
    gap: spacing.xs
  },
  emptyFaqCard: {
    padding: spacing.lg
  },
  faqCard: {
    padding: 0,
    overflow: "hidden"
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    gap: spacing.sm
  },
  faqQuestionLeft: {
    flex: 1,
    gap: 4
  },
  faqQuestionText: {
    fontWeight: "600",
    color: colors.ink,
    fontSize: 13
  },
  faqCategoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  faqCategoryText: {
    fontSize: 10
  },
  faqChevron: {
    flexShrink: 0
  },
  faqAnswerContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0,
    backgroundColor: "rgba(250, 249, 248, 0.5)",
    borderTopWidth: 1,
    borderTopColor: colors.canvasSoft
  },
  faqAnswerText: {
    lineHeight: 19
  },
  chatCtaBanner: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
    marginTop: spacing.xs,
    ...shadows.raised
  },
  chatCtaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  chatCtaEyebrow: {
    color: "#bfdbfe",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5
  },
  chatCtaTitle: {
    color: "#ffffff",
    letterSpacing: -0.2
  },
  chatCtaDesc: {
    color: "#e0f2fe",
    lineHeight: 19,
    marginBottom: 4
  },
  chatCtaActions: {
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  chatCtaPrimaryBtn: {
    backgroundColor: "#ffffff"
  },
  chatCtaSecondaryBtn: {
    borderColor: "rgba(255, 255, 255, 0.35)"
  }
});
