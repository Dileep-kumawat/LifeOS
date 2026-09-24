import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  HeartHandshake
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { PrivacyPolicyModal } from "../components/privacy/PrivacyPolicyModal";

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

export function SupportHelpPage() {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-[#f6f5f4] p-4 sm:p-6 lg:p-8 flex flex-col items-center w-full">
      <div className="w-full max-w-5xl flex flex-col gap-8 pb-16">
        {/* ─── Hero Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-2xl border border-[#e6e6e6] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#0075de]/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col gap-2 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e0f2fe] text-[#0075de] text-xs font-semibold w-max border border-[#bae6fd]">
              <HelpCircle className="size-3.5" />
              <span>LifeOS Knowledge & Support Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#000000] tracking-tight">
              Support, Guidelines & Terms
            </h1>
            <p className="text-sm sm:text-base text-[#615d59] leading-relaxed">
              Everything you need to master your personal operating system. Understand our mission,
              explore module workflows, review terms and guidelines, or connect with our AI Assistant
              for direct help.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 relative z-10 shrink-0">
            <Button
              onClick={() => navigate("/chat")}
              size="lg"
              className="bg-[#0075de] hover:bg-[#005bab] text-white font-semibold rounded-full shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <Bot className="size-4 animate-float-subtle" />
              <span>Chat with Assistant</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setPrivacyModalOpen(true)}
              className="rounded-full text-xs font-medium"
            >
              <ShieldCheck className="size-4 text-[#0075de]" />
              <span>View Privacy Policy</span>
            </Button>
          </div>
        </div>

        {/* ─── Navigation Tabs & Search ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { key: "all", label: "All Topics" },
              { key: "audience", label: "For Whom" },
              { key: "purpose", label: "What Purpose" },
              { key: "modules", label: "How to Use" },
              { key: "terms", label: "Terms & Guidelines" },
              { key: "faq", label: "FAQ" }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 shrink-0 ${
                  activeTab === tab.key
                    ? "bg-[#0075de] text-white shadow-xs font-semibold"
                    : "bg-white text-[#414753] border border-[#e6e6e6] hover:bg-[#f6f5f4] hover:text-[#000000]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" />
            <input
              type="text"
              placeholder="Search help, terms, or guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#e6e6e6] rounded-lg text-xs text-[#000000] placeholder-[#a39e98] focus:outline-none focus:ring-2 focus:ring-[#0075de] transition-all"
            />
          </div>
        </div>

        {/* ─── SECTION 1: For Whom This App Is Made ────────────────────── */}
        {(activeTab === "all" || activeTab === "audience") && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#e0f2fe] text-[#0075de] rounded-lg">
                <Users className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#000000]">For Whom This App Is Made</h2>
                <p className="text-xs text-[#615d59]">
                  Designed for individuals who demand intentional control over their time, knowledge, and growth.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover:border-[#c1c6d5] transition-all duration-150">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-[#0075de] rounded-xl border border-blue-100">
                      <Target className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">High Performers & Leaders</CardTitle>
                      <CardDescription className="text-xs">
                        Executives, managers, and project leaders
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-[#615d59] leading-relaxed">
                  Eliminate fragmented context switching between calendar apps, spreadsheets, and task managers.
                  LifeOS brings your quarterly objectives, daily time blocking, and key deliverables into a single
                  clean executive command center.
                </CardContent>
              </Card>

              <Card className="hover:border-[#c1c6d5] transition-all duration-150">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                      <GraduationCap className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Students & Academics</CardTitle>
                      <CardDescription className="text-xs">
                        Lifelong learners, university scholars, and test preppers
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-[#615d59] leading-relaxed">
                  Map your syllabus topic by topic, track countdowns to exam day, take lecture notes in clean
                  Markdown, and retain concepts permanently using science-backed SM-2 spaced repetition flashcards.
                </CardContent>
              </Card>

              <Card className="hover:border-[#c1c6d5] transition-all duration-150">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                      <Zap className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Builders, Founders & Freelancers</CardTitle>
                      <CardDescription className="text-xs">
                        Creators balancing runway, product milestones, and habits
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-[#615d59] leading-relaxed">
                  Keep your financial runway in check with monthly category budgets and receipt scanning,
                  document architectures and brainstorms in nested notes, and protect deep focus hours with
                  integrated Pomodoro sessions.
                </CardContent>
              </Card>

              <Card className="hover:border-[#c1c6d5] transition-all duration-150">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                      <HeartHandshake className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Mindful Achievers</CardTitle>
                      <CardDescription className="text-xs">
                        Anyone seeking digital calm and sustainable routine
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-[#615d59] leading-relaxed">
                  Escape notification fatigue and app bloat. LifeOS offers a warm paper-soft canvas with zero ads,
                  zero algorithmic feeds, and transparent privacy policies designed to support mental clarity.
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* ─── SECTION 2: What Purpose It Solves ───────────────────────── */}
        {(activeTab === "all" || activeTab === "purpose") && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#e0f2fe] text-[#0075de] rounded-lg">
                <Compass className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#000000]">What Purpose LifeOS Solves</h2>
                <p className="text-xs text-[#615d59]">
                  Breaking the modern productivity dilemma: uniting siloed life components into one ecosystem.
                </p>
              </div>
            </div>

            <Card className="border-[#e6e6e6]">
              <CardContent className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl bg-red-50/50 border border-red-100 flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                      <span>✕</span> The Problem: The 10-App Fragmentation Trap
                    </span>
                    <p className="text-xs text-[#615d59] leading-relaxed">
                      You track calendar events in one tool, habits in another, notes in a third, study cards in a
                      separate mobile app, and budget in a spreadsheet. Your attention is fractured, data is locked in
                      isolated silos, and recurring subscription costs stack up.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0075de] flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5" /> The LifeOS Unified Solution
                    </span>
                    <p className="text-xs text-[#615d59] leading-relaxed">
                      A centralized, cohesive Personal Operating System where all life disciplines interlock. A habit
                      completion updates your weekly productivity analytics; a study topic links directly to a focus
                      timer; an expense scan alerts your monthly budget; and an AI copilot knows your context.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#e6e6e6] pt-4">
                  <h3 className="text-xs font-bold text-[#000000] uppercase tracking-wider mb-3">
                    Four Architectural Pillars of LifeOS
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-[#f6f5f4] border border-[#e3e2e0] flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#000000]">
                        <Layers className="size-3.5 text-[#0075de]" />
                        <span>Total Cohesion</span>
                      </div>
                      <span className="text-[11px] text-[#615d59]">
                        Cross-module linking connects tasks, study syllabus, and Pomodoro timers.
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#f6f5f4] border border-[#e3e2e0] flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#000000]">
                        <Zap className="size-3.5 text-[#0075de]" />
                        <span>Local-First Sync</span>
                      </div>
                      <span className="text-[11px] text-[#615d59]">
                        Work offline freely; our delta engine reconciles state automatically.
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#f6f5f4] border border-[#e3e2e0] flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#000000]">
                        <Lock className="size-3.5 text-[#0075de]" />
                        <span>Data Sovereignty</span>
                      </div>
                      <span className="text-[11px] text-[#615d59]">
                        Full JSON data exports, 30-day grace periods, zero third-party ads.
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#f6f5f4] border border-[#e3e2e0] flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#000000]">
                        <Sparkles className="size-3.5 text-[#0075de]" />
                        <span>Contextual AI</span>
                      </div>
                      <span className="text-[11px] text-[#615d59]">
                        RAG-grounded summaries, habit tips, and conversational execution.
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ─── SECTION 3: How to Use LifeOS (Module-by-Module Guide) ───── */}
        {(activeTab === "all" || activeTab === "modules") && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#e0f2fe] text-[#0075de] rounded-lg">
                <BookOpen className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#000000]">How to Use LifeOS</h2>
                <p className="text-xs text-[#615d59]">
                  A practical guide to the core modules and our recommended daily operating rhythm.
                </p>
              </div>
            </div>

            {/* Daily Operating Rhythm */}
            <Card className="bg-gradient-to-r from-blue-50/40 via-white to-white border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#0075de] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="size-4" />
                  Recommended Daily Operating Rhythm
                </CardTitle>
                <CardDescription className="text-xs">
                  A simple 15-minute daily routine to keep your life organized and momentum high
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-white border border-[#e6e6e6] flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#000000]">1. Morning Alignment (5 min)</span>
                  <p className="text-[11px] text-[#615d59] leading-relaxed">
                    Open your <strong>Dashboard</strong>. Review your AI-generated daily summary, check today&apos;s
                    scheduled events in the <strong>Calendar</strong>, and confirm your top 1–3 high-impact goals.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-[#e6e6e6] flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#000000]">2. Daytime Deep Work</span>
                  <p className="text-[11px] text-[#615d59] leading-relaxed">
                    Fire up the <strong>Focus Timer</strong> for 25-minute Pomodoros linked directly to your active
                    study topic or project note. Check off daily <strong>Habits</strong> as you complete them.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-[#e6e6e6] flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#000000]">3. Evening Wrap-Up (5 min)</span>
                  <p className="text-[11px] text-[#615d59] leading-relaxed">
                    Log daily expenses in <strong>Finance</strong> (or scan receipts), clear your due{" "}
                    <strong>Flashcards</strong> queue, and observe your consistency streak on the Dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-50 text-[#0075de] rounded-lg">
                    <Calendar className="size-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/calendar")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Calendar <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">Calendar & Time-Blocking</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Schedule single and recurring events, set custom reminders, color-code priorities, and sync two-way
                  with Google Calendar.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckSquare className="size-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/habits")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Habits <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">Habits & Consistency</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Establish daily or weekly micro-habits. Daily check-ins automatically compute streaks, completion
                  rates, and consistency metrics.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Target className="size-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/goals")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Goals <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">Goals & Key Results (OKRs)</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Set long-term objectives and break them down into measurable Key Results with automated progress bars
                  and target dates.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                    <Wallet className="size-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/finance")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Finance <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">Finance & Budgeting</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Track income and expenses across customizable categories. Set monthly alert thresholds and scan
                  physical receipts via client-side OCR.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <FileText className="size-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/notes")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Notes <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">Notes & Knowledge Base</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Full-screen rich Markdown editor with folder hierarchies, tags, pinned status, and automatic version
                  delta revision history.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <GraduationCap className="size-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/study")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Study <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">Study & Spaced Repetition</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Organize subjects and syllabus topics with exam deadlines. Review flashcard decks with the scientific
                  SuperMemo SM-2 algorithm.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <Timer className="size-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/focus")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Focus <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">Pomodoro Focus Timer</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Configurable work and break intervals. Link sessions directly to topics or goals to automatically
                  record cumulative deep work minutes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                    <BarChart3 className="size-4" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/analytics")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Analytics <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">Executive Analytics</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Interactive charts for productivity scores, streak consistency, multi-month spending trends, and
                  synchronous CSV report exports.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#e6e6e6] flex flex-col gap-2 hover:border-[#c1c6d5] transition-all">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-100 text-[#005db2] rounded-lg">
                    <Bot className="size-4 animate-float-subtle" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/chat")}
                    className="text-[11px] h-7 px-2 text-[#0075de]"
                  >
                    Open Assistant <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
                <h3 className="text-sm font-bold text-[#000000]">AI Copilot & Summaries</h3>
                <p className="text-xs text-[#615d59] leading-relaxed">
                  Context-aware assistant for natural language scheduling, study planning, weekly recommendations, and
                  intelligent queries.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ─── SECTION 4: Guidelines, Terms & Conditions ──────────────── */}
        {(activeTab === "all" || activeTab === "terms") && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#e0f2fe] text-[#0075de] rounded-lg">
                <Scale className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#000000]">Platform Guidelines & Terms of Service</h2>
                <p className="text-xs text-[#615d59]">
                  Rules of engagement, acceptable use policies, legal terms, and privacy commitments.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[#0075de]" />
                    1. Acceptable Use & Account Integrity
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#615d59] leading-relaxed flex flex-col gap-2">
                  <p>
                    LifeOS is provided for personal productivity, educational, and organizational purposes. You agree to:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Maintain confidentiality of your credentials and linked OAuth tokens.</li>
                    <li>Avoid automated scraping, denial of service (DoS) attempts, or circumvention of rate limits.</li>
                    <li>Refrain from uploading unlawful, infringing, or malicious content into notes or attachments.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lock className="size-4 text-[#0075de]" />
                    2. Data Sovereignty & Portability (GDPR/DPDP)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#615d59] leading-relaxed flex flex-col gap-2">
                  <p>
                    Your data belongs to you. In compliance with GDPR Article 20 and the India DPDP Act 2023:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>You may export a full JSON snapshot of your data at any time via Settings.</li>
                    <li>Transmitted data is encrypted via TLS 1.3; storage is protected with AES-256 standards.</li>
                    <li>Account deletion invokes an instant 30-day grace period followed by a permanent cascade wipe.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="size-4 text-[#0075de]" />
                    3. AI Processing & Third-Party Disclosure (NFR-6.2)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#615d59] leading-relaxed flex flex-col gap-2">
                  <p>
                    LifeOS utilizes a resilient fallback chain: <strong>Mistral AI → Groq → Google Gemini</strong>:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Only your prompt and relevant task/note fragments (via vector RAG) are transmitted.</li>
                    <li>Enterprise deployments enforce Zero Data Retention (ZDR) prohibiting model training.</li>
                    <li>AI features are strictly optional; all core modules work offline without external LLM calls.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scale className="size-4 text-[#0075de]" />
                    4. Disclaimers & Limitations of Liability
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#615d59] leading-relaxed flex flex-col gap-2">
                  <p>
                    LifeOS services and AI responses are organizational tools provided &quot;as is&quot;:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>AI suggestions and budget summaries do not constitute certified financial or legal counsel.</li>
                    <li>Study schedules and flashcard calculations are educational aids; verify academic deadlines independently.</li>
                    <li>We maintain high availability standards with automated backups, but recommend periodic user data exports.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#e6e6e6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#000000]">Need the complete legal compliance specification?</span>
                <span className="text-xs text-[#615d59]">
                  Review our full 5-section Privacy Policy including DPO contact details and audit trail practices.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrivacyModalOpen(true)}
                className="text-xs shrink-0"
              >
                Open Full Privacy Policy
              </Button>
            </div>
          </section>
        )}

        {/* ─── SECTION 5: Frequently Asked Questions (FAQ) ─────────────── */}
        {(activeTab === "all" || activeTab === "faq") && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#e0f2fe] text-[#0075de] rounded-lg">
                <HelpCircle className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#000000]">Frequently Asked Questions</h2>
                <p className="text-xs text-[#615d59]">
                  Quick answers to common questions about features, sync, privacy, and configuration.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {filteredFaqs.length === 0 ? (
                <div className="p-6 bg-white rounded-xl border border-[#e6e6e6] text-center text-xs text-[#615d59]">
                  No FAQ topics found matching &quot;{searchQuery}&quot;. Try a different term or ask the AI Assistant directly below.
                </div>
              ) : (
                filteredFaqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={faq.question}
                      className="rounded-xl border border-[#e6e6e6] bg-white overflow-hidden transition-all duration-150"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(index)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-[#faf9f8] transition-colors"
                      >
                        <div className="flex items-center gap-3 pr-2">
                          <span className="text-xs font-semibold text-[#000000]">{faq.question}</span>
                          <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#f6f5f4] text-[#615d59] border border-[#e6e6e6]">
                            {faq.category}
                          </span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="size-4 text-[#0075de] shrink-0" />
                        ) : (
                          <ChevronDown className="size-4 text-[#a39e98] shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="p-4 pt-0 text-xs text-[#615d59] leading-relaxed border-t border-[#f6f5f4] bg-[#faf9f8]/50">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* ─── SECTION 6: Need Further Help? (Direct Chat CTA) ────────── */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#005db2] to-[#003870] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col gap-2 max-w-xl relative z-10">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
              <Bot className="size-4 animate-float-subtle" />
              <span>Still Have Questions?</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Chat with our AI Assistant for Instant Support
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Our intelligent assistant has real-time context on every LifeOS feature, keyboard shortcut,
              study technique, and troubleshooting step. Ask questions in plain English or get guidance tailored to your schedule.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 relative z-10 shrink-0">
            <Button
              onClick={() => navigate("/chat")}
              size="lg"
              className="bg-white text-[#005db2] hover:bg-blue-50 font-bold rounded-full shadow-lg flex items-center justify-center gap-2 text-sm px-6"
            >
              <Bot className="size-4" />
              <span>Open Support Chat</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/settings")}
              className="border-white/30 text-white hover:bg-white/10 rounded-full text-xs font-semibold"
            >
              <span>Manage Settings</span>
            </Button>
          </div>
        </div>
      </div>

      <PrivacyPolicyModal open={privacyModalOpen} onOpenChange={setPrivacyModalOpen} />
    </div>
  );
}
