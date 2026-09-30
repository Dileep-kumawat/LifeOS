export interface SyllabusTopic {
  id: string;
  title: string;
  duration: string;
  priority: "High Priority" | "Medium Priority" | "Low Priority";
  status: "Completed" | "In Progress" | "Not Started";
  dueText?: string;
}

export interface Subject {
  id: string;
  title: string;
  color: string;
  totalTopics: number;
  completedTopics: number;
  examCountdown: string;
  topics: SyllabusTopic[];
}

export interface HabitItem {
  id: string;
  title: string;
  frequency: string;
  rate: string;
  streak: number;
  completedToday: boolean;
  history: boolean[]; // 7-day status
}

export interface CalendarEventItem {
  id: string;
  time: string;
  title: string;
  tag?: string;
  category: string;
  color: string;
}

export interface ExpenseItem {
  id: string;
  amount: number;
  title: string;
  category: string;
  categoryColor: string;
}

export const PERSONA = {
  name: "Aarav Sharma",
  role: "3rd-Year Computer Science Undergraduate",
  exam: "GATE Computer Science / Final Term Exams",
  examDate: "Nov 15, 2026",
  daysLeft: 46,
  examBadge: "46 days left • Nov 15, 2026",
} as const;

export const SUBJECTS: Subject[] = [
  {
    id: "distributed-systems",
    title: "Distributed Systems & Cloud Architecture",
    color: "#0075de",
    totalTopics: 3,
    completedTopics: 1,
    examCountdown: "46 days left • Nov 15, 2026",
    topics: [
      {
        id: "cons-hash",
        title: "Consistent Hashing & Dynamo Ring Architecture",
        duration: "45m",
        priority: "Medium Priority",
        status: "Completed",
      },
      {
        id: "raft-paxos",
        title: "Raft & Paxos Consensus Protocols",
        duration: "90m",
        priority: "High Priority",
        status: "In Progress",
        dueText: "Due in 3d",
      },
      {
        id: "cap-thm",
        title: "CAP Theorem & Partition Tolerance",
        duration: "60m",
        priority: "High Priority",
        status: "Not Started",
      },
    ],
  },
  {
    id: "db-systems",
    title: "Database Management & SQL Engine Internals",
    color: "#d6b6f6",
    totalTopics: 2,
    completedTopics: 0,
    examCountdown: "46 days left • Nov 15, 2026",
    topics: [
      {
        id: "b-plus-tree",
        title: "B+ Tree Indexing & Buffer Pool Management",
        duration: "75m",
        priority: "High Priority",
        status: "In Progress",
      },
      {
        id: "acid-lock",
        title: "ACID Isolation Levels & 2-Phase Locking",
        duration: "50m",
        priority: "Medium Priority",
        status: "Not Started",
      },
    ],
  },
  {
    id: "algorithms",
    title: "Algorithms & Dynamic Programming",
    color: "#1aae39",
    totalTopics: 2,
    completedTopics: 1,
    examCountdown: "46 days left • Nov 15, 2026",
    topics: [
      {
        id: "graph-topo",
        title: "Graph Traversals & Topological Sort",
        duration: "40m",
        priority: "Low Priority",
        status: "Completed",
      },
      {
        id: "dp-knapsack",
        title: "Knapsack & Interval Scheduling DP",
        duration: "80m",
        priority: "High Priority",
        status: "In Progress",
      },
    ],
  },
];

export const HABITS: HabitItem[] = [
  {
    id: "leetcode",
    title: "Solve 2 LeetCode Problems",
    frequency: "Daily",
    rate: "85% rate",
    streak: 14,
    completedToday: true,
    history: [true, true, true, true, true, true, true],
  },
  {
    id: "deep-work",
    title: "Deep Work Study (2 Hours)",
    frequency: "Daily",
    rate: "90% rate",
    streak: 8,
    completedToday: true,
    history: [true, true, false, true, true, true, true],
  },
  {
    id: "flashcards",
    title: "Review Due Flashcards",
    frequency: "Daily",
    rate: "95% rate",
    streak: 21,
    completedToday: false,
    history: [true, true, true, true, true, true, false],
  },
  {
    id: "running",
    title: "Morning Run (3 km)",
    frequency: "Daily",
    rate: "75% rate",
    streak: 5,
    completedToday: true,
    history: [false, true, true, true, false, true, true],
  },
];

export const CALENDAR_EVENTS: CalendarEventItem[] = [
  {
    id: "event-1",
    time: "09:00 AM - 10:30 AM",
    title: "Distributed Systems Lecture (Hall 302)",
    category: "Lecture",
    color: "#0075de",
  },
  {
    id: "event-2",
    time: "02:00 PM - 03:30 PM",
    title: "Deep Work: Raft Consensus Paper Analysis",
    tag: "Linked to Raft Topic",
    category: "Study",
    color: "#62aef0",
  },
  {
    id: "event-3",
    time: "05:00 PM - 06:00 PM",
    title: "Algorithm Study Group (Library Room 4B)",
    category: "Group Study",
    color: "#1aae39",
  },
];

export const FINANCE = {
  monthlyBudget: 12000,
  spent: 8450,
  remaining: 3550,
  currency: "₹",
  expenses: [
    {
      id: "exp-1",
      amount: 3200,
      title: "Hostel Mess & Monthly Meal Card",
      category: "Food",
      categoryColor: "#ff64c8",
    },
    {
      id: "exp-2",
      amount: 1450,
      title: "Distributed Systems Reference Textbook",
      category: "Education",
      categoryColor: "#0075de",
    },
    {
      id: "exp-3",
      amount: 600,
      title: "Campus High-Speed Data Plan",
      category: "Utilities",
      categoryColor: "#2a9d99",
    },
    {
      id: "exp-4",
      amount: 450,
      title: "Study Coffee & Snacks at Campus Cafe",
      category: "Food",
      categoryColor: "#dd5b00",
    },
    {
      id: "exp-5",
      amount: 2750,
      title: "GATE Exam Registration Fee",
      category: "Academics",
      categoryColor: "#62aef0",
    },
  ] as ExpenseItem[],
} as const;

export const AI_CONVERSATION = {
  userPrompt:
    "I have my Raft Consensus review in 3 days and 18 flashcards due. Can you schedule a focus block today?",
  aiResponse:
    "You have an open window between 3:45 PM and 4:30 PM before your study group. I've prepared a 45-minute Focus Session linked to 'Raft Consensus' and queued your 18 flashcards. Would you like me to book it?",
} as const;

export const MORNING_BRIEF = {
  title: "Daily Summary — Generated for Today (07:00 AM)",
  topPriorities: [
    {
      number: 1,
      title: "Master Raft Leader Election",
      rationale: "Topic due in 3 days; highest syllabus weight",
    },
    {
      number: 2,
      title: "Clear 18 Spaced Repetition Flashcards",
      rationale: "Optimal SM-2 review threshold reached",
    },
    {
      number: 3,
      title: "Protect 2h Deep Work Window",
      rationale: "Maintain 8-day consistency streak",
    },
  ],
  yesterdaysWins:
    "Completed Consistent Hashing topic (45m focus) • Solved 2 DP problems (14d streak)",
  todaysFlow: "09:00 AM Lecture • 02:00 PM Raft Analysis • 05:00 PM Study Group",
} as const;

export const FLASHCARD_SAMPLE = {
  deck: "Distributed Systems & Consensus",
  question: "How does Raft guarantee leader completeness during election?",
  answer:
    "A candidate must contain all committed entries to win an election; voters deny votes if the candidate's log is less up-to-date than their own.",
  sm2Stats: "Reps: 1 | Int: 1d | EF: 2.6",
} as const;

// STRICT PRIVACY CLAIMS (As explicitly permitted: export all data, delete anytime, ad-free)
export const PRIVACY_CLAIMS = [
  {
    id: "export",
    title: "Export all data",
    desc: "Complete JSON archive anytime",
  },
  {
    id: "delete",
    title: "Delete anytime",
    desc: "Permanent account & data purge",
  },
  {
    id: "ad-free",
    title: "100% Ad-Free",
    desc: "Zero ad tracking, zero sponsors",
  },
] as const;

export const CONFIG = {
  url: "lifeos.vercel.app", /* TODO confirm */
  cta: "Start free",
} as const;
