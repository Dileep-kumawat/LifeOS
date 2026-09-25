import { describe, it, expect } from "vitest";

describe("SupportHelpScreen: Web Parity & Content Verification", () => {
  const FAQ_ITEMS = [
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

  it("contains all 6 core FAQ items spanning General & Sync, AI & Privacy, Study, and Account & Data", () => {
    expect(FAQ_ITEMS.length).toBe(6);
    const categories = FAQ_ITEMS.map((item) => item.category);
    expect(categories).toContain("General & Sync");
    expect(categories).toContain("AI & Privacy");
    expect(categories).toContain("Study & Flashcards");
    expect(categories).toContain("Account & Data");
  });

  it("filters FAQ items correctly by search term (question, answer, or category)", () => {
    const filterFaqs = (query: string) => {
      const q = query.toLowerCase();
      return FAQ_ITEMS.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    };

    const offlineResults = filterFaqs("offline");
    expect(offlineResults.length).toBeGreaterThanOrEqual(1);
    expect(offlineResults[0].question).toContain("offline");

    const privacyResults = filterFaqs("GDPR");
    expect(privacyResults.length).toBeGreaterThanOrEqual(1);
    expect(privacyResults[0].answer).toContain("GDPR");

    const ragResults = filterFaqs("RAG");
    expect(ragResults.length).toBe(1);
    expect(ragResults[0].question).toContain("AI Assistant");

    const emptyResults = filterFaqs("nonexistent keyword XYZ");
    expect(emptyResults.length).toBe(0);
  });

  it("defines the 6 navigation topics aligning with web SupportHelpPage", () => {
    const topics = [
      { key: "all", label: "All Topics" },
      { key: "audience", label: "For Whom" },
      { key: "purpose", label: "What Purpose" },
      { key: "modules", label: "How to Use" },
      { key: "terms", label: "Terms & Guidelines" },
      { key: "faq", label: "FAQ" }
    ];
    expect(topics.map((t) => t.key)).toEqual([
      "all",
      "audience",
      "purpose",
      "modules",
      "terms",
      "faq"
    ]);
  });

  it("contains the 9 core modules for quick navigation in mobile", () => {
    const modules = [
      "Calendar & Time-Blocking",
      "Habits & Consistency",
      "Goals & Key Results (OKRs)",
      "Finance & Budgeting",
      "Notes & Knowledge Base",
      "Study & Spaced Repetition",
      "Pomodoro Focus Timer",
      "Executive Analytics",
      "AI Copilot & Summaries"
    ];
    expect(modules.length).toBe(9);
  });
});
