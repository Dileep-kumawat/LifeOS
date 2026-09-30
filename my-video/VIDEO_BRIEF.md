# LifeOS Motion Graphics Video Brief (Remotion)

> Self-contained creative & technical brief for the Remotion motion graphics launch video.  
> Target Audience: Students (College, University, Competitive Exam Preppers).

---

## 1. Product in One Paragraph

**LifeOS** is an AI-native personal operating system that unifies study planning, habit tracking, calendar time-blocking, personal finance, rich markdown notes, and a contextual AI copilot into a single cohesive workspace across Web and Android. Built for students balancing intense coursework and exam deadlines, LifeOS eliminates the "10-App Fragmentation Trap"—where attention is fractured across separate apps for calendars, flashcards, habits, budgets, and ChatGPT. In LifeOS, life disciplines interlock: syllabus topics connect directly to Pomodoro timers, habit check-ins drive productivity analytics, and the AI copilot queries cross-module context to keep students focused, accountable, and calm.

### One-Line Pitch Options
1. *Student/Academic*: "Your entire college life, syllabus, and study routine in one AI personal operating system."
2. *Anti-Fragmentation*: "Stop context-switching between 10 apps—master your exams, habits, and time in a single calm workspace."
3. *Punchy / Modern*: "LifeOS: The AI personal operating system built for high-scoring, low-stress students."

---

## 2. Design System (Exact Code Values)

### Visual Style
A Notion-inspired "warm paper-calm" productivity system. It pairs an off-white canvas (`#f6f5f4`) and crisp white surfaces (`#ffffff`) with subtle 1px hairlines (`#e6e6e6`), confident near-black Inter typography (`#000000`), and a single dependable Notion Blue accent (`#0075de`) reserved exclusively for primary actions and focus. Personality is driven by a vibrant multi-color "sticker palette" for category dots and status badges, with an inverted deep indigo "night" band (`#213183`) reserved for executive hero moments. No global dark mode exists; the app embraces paper daylight aesthetics.

### Color Tokens & Roles
- **Canvas / Page Background**: `#f6f5f4` (`canvasSoft`)
- **Card & Surface Background**: `#ffffff` (`surface` / `canvas`)
- **Primary Brand / Action Accent**: `#0075de` (`primary` — CTAs, active pills, links, focus rings)
- **Primary Active / Pressed**: `#005bab` (`primaryActive`)
- **Executive Hero Band ("Night")**: `#213183` (`secondary` — deep indigo hero header)
- **Text on Primary**: `#ffffff` (`onPrimary`)
- **Hairlines & Dividers**: `#e6e6e6` (`hairline`, 1px borders)
- **Input Borders**: `#dddddd` (`inputBorder`)
- **Typography - Ink Primary**: `#000000` (`ink`, 95% opacity near-black headings/titles)
- **Typography - Ink Secondary**: `#31302e` (`inkSecondary`, body copy)
- **Typography - Ink Muted**: `#615d59` (`inkMuted`, secondary captions)
- **Typography - Ink Faint**: `#a39e98` (`inkFaint`, placeholders, metadata)
- **Decorative Sticker Palette (Badges & category dots only, never CTAs)**:
  - *Sky*: `#62aef0` | *Purple*: `#d6b6f6` | *Deep Purple*: `#391c57`
  - *Pink*: `#ff64c8` | *Orange*: `#dd5b00` | *Deep Orange*: `#793400`
  - *Teal*: `#2a9d99` | *Green*: `#1aae39` | *Brown*: `#523410`
- **Semantic Feedback**:
  - *Success*: `#1aae39` (`emerald-600`) | *Warning/Error*: `#dd5b00` (`rose-600`/`red-600`) | *Info*: `#0075de`

### Typography Hierarchy (Font: Inter / NotionInter)
- **Weights**: 400 (Regular body), 500 (Medium buttons), 600 (Semibold titles), 700 (Bold headings)
- `display1`: 64px (line-height: 64px, letter-spacing: -2.125px, weight: 700)
- `display2`: 54px (line-height: 56px, letter-spacing: -1.875px, weight: 700)
- `heading1`: 40px (line-height: 44px, letter-spacing: -1.0px, weight: 700)
- `heading2`: 26px (line-height: 32px, letter-spacing: -0.625px, weight: 700)
- `heading3`: 22px (line-height: 28px, letter-spacing: -0.25px, weight: 700)
- `title`: 20px (line-height: 28px, letter-spacing: -0.125px, weight: 600)
- `bodyMd`: 16px (line-height: 24px, letter-spacing: 0, weight: 400)
- `bodySm`: 15px (line-height: 20px, letter-spacing: 0, weight: 400)
- `button`: 16px (line-height: 24px, letter-spacing: 0, weight: 500)
- `caption`: 14px (line-height: 20px, letter-spacing: 0, weight: 400)
- `eyebrow`: 12px (line-height: 16px, letter-spacing: +0.125px, weight: 600)

### Shapes, Elevation & Spacing
- **Border Radius**: `xs`: 4px | `sm`: 5px | `md`: 8px | `lg`: 12px (standard cards) | `xl`: 16px | `full`: 9999px (pills, dock)
- **Shadows**:
  - *Level 0 (Flat)*: 1px hairline `#e6e6e6`, no shadow
  - *Level 1 (Card)*: `0 1px 2px rgba(0,0,0,0.05)` (subtle layered lift)
  - *Level 2 (Raised)*: `0 4px 12px rgba(0,0,0,0.10)`
  - *Level 3 (Overlay)*: `0 8px 24px rgba(0,0,0,0.18)`
- **Spacing Scale (8px base)**: `xxs`: 4px, `xs`: 8px, `sm`: 12px, `md`: 16px, `lg`: 24px, `xl`: 28px, `xxl`: 32px
- **Icons**: Lucide icons (`lucide-react`, `lucide-react-native`) with 1.5–2px clean stroke.

---

## 3. Logo and Brand

- **Logo Mark**: Continuous fluid ribbon shaped as an 'L' looping seamlessly into an 'O' / infinity loop.
- **Gradient Palette**: Indigo/Royal Purple (`#6366f1`) on the vertical stem → Vibrant Blue (`#0075de`) in the central curve → Cyan/Teal (`#00d2ff`) on the outer loop.
- **Wordmark**: `LifeOS` with `Life` in bold dark ink (`#111827`) and `OS` in gradient cyan-blue (`#0080ff` to `#00d2ff`).
- **Brand Assets Path**: `video-assets/logo-icon.png`, `video-assets/logo-vector.svg`, `video-assets/favicon.png`
- **Tagline**: *"Your entire life operating system in your pocket."*
- **Usage Rules**: Use over white (`#ffffff`), paper soft (`#f6f5f4`), or dark indigo (`#213183`). Never stretch or tint the ribbon in monochrome or non-brand colors.

---

## 4. Real UI Screens

1. **Dashboard (`/`)** *(⭐⭐⭐⭐⭐ Best for Hook & Overview)*:
   - *Layout*: Full-bleed deep indigo hero (`#213183`) with pulsing status badge (`LifeOS Executive Hub | [Date]`), greeting (`Good morning, Aarav 👋`), quick pills (`+ Note`, `+ Habit`, `+ Goal`, `+ Expense`, and `✨ AI Assistant` button).
   - *Body*: Overlapping white cards with Daily Summary briefing banner, 4 KPI cards (Today's Schedule, Active Habits, Active Goals, Net Cashflow), and widgets for Today's Timeline, Habits, Goals, and Recent Notes.
2. **AI Chat (`/chat`)** *(⭐⭐⭐⭐⭐ Must-Feature Climax)*:
   - *Layout*: Left collapsible chat drawer (`New chat`, history). Center view with dark circular sparkles glyph, headline *"Where should we begin?"*, centered search capsule with `+` attachment, placeholder *"Ask anything..."*, and voice mic icon.
   - *Interactive States*: Real-time token streaming, live oscillating audio speech waveform (`VoiceWaveform`), formatted GFM markdown tables, and interactive tool confirmation cards (`ToolConfirmationModal`).
3. **Study Planner (`/study`)** *(⭐⭐⭐⭐⭐ Core Student Showcase)*:
   - *Layout*: Header with graduation cap icon, title "Study Planner", and "+ New Subject" blue button. Top hero card: "Spaced Repetition Review Queue" with "Open Review Queue" button.
   - *Tabs*: "Subjects & Syllabus", "Flashcards Deck", "Review Queue".
   - *Cards*: Subject cards with countdown badges (*"22 days left • Nov 15, 2026"*), progress bar (*"1/3 topics • 33%"*). Topic cards with priority pills (*"High Priority"*, *"90 min"*, *"Due soon"*). Flashcards show question, clean answer container, and SuperMemo SM-2 stats (`Reps: 1 | Int: 1d | EF: 2.6`).
4. **Focus & Pomodoro Timer (`/focus`)** *(⭐⭐⭐⭐⭐ High Drama / Pacing)*:
   - *Layout*: Distraction-free card with "✨ Deep Work" pill. Cycle indicator ("Cycle 1/4" dots), work interval badge ("🧠 Work Interval"), large circular countdown dial **25:00** with caption *"STAY FOCUSED"*, and blue pill button `▶ Start Focus`. Right column displays "Recent Productivity" stats and session logs.
5. **Habits & Routines (`/habits`)** *(⭐⭐⭐⭐⭐ Dopamine Micro-interaction)*:
   - *Layout*: Header "+ New Habit". Cards display habit title, frequency label (*"Daily • 85% rate"*), flame streak badge (`🔥 14d streak`), trailing 7-day status matrix (green check square, red X, today's blue outline), and toggle action `[✓ Completed]` / `[Mark Done]`. Detail page contains a 60-day interactive heat-grid.
6. **Finance & Budgeting (`/finance`)** *(⭐⭐⭐⭐ Student Life)*:
   - *Layout*: 3 top cards (Monthly Income, Monthly Expense, Net Cashflow). Tabs for Transactions, Budgets, and Analytics. Transaction ledger with category tags, camera OCR receipt scanning button, and budget cards with percentage progress bars and alert badges.
7. **Notes & Knowledge Base (`/notes`)** *(⭐⭐⭐⭐ Lecture Notes)*:
   - *Layout*: Left folder tree and tag filters. Clean ProseMirror markdown editor with title "Untitled", folder dropdown, tag pills, green "Saved" pill, and toolbar (`B`, `I`, `H1`-`H3`, lists, image, checkboxes).
8. **Calendar (`/calendar`)** *(⭐⭐⭐⭐ Time-Blocking)*:
   - *Layout*: Top bar with Today button, Month/Year label, Day/Week/Month segmented pill, "+ New event" button. Color-coded blocks for lectures, study sessions, and exams.
9. **Daily Summary Briefing (`DailySummaryCard`)** *(⭐⭐⭐⭐⭐ Morning Routine Hook)*:
   - *Layout*: Banner on Dashboard. 3 columns:
     - *Top 3 Priorities*: Numbered badges 1, 2, 3 with priority title and rationale.
     - *Yesterday's Wins*: Green checkmarks with completed habits and study milestones.
     - *Today's Flow*: Chronological event pills with start times.
10. **Notifications Panel (`NotificationPanel`)** *(⭐⭐⭐ Cutaway)*:
    - *Layout*: Popover from bell icon with unread badge. Categorized alert items (Calendar, Habits, Budget, Daily Summary) with icon tiles and relative timestamps ("10m ago").
11. **Mobile Floating Dock (`mobile/src/navigation/FloatingDock.tsx`)** *(⭐⭐⭐⭐⭐ Mobile Showstopper)*:
    - *Layout*: Frosted glass pill (`BlurView`, border radius `9999px`) floating 16px above screen bottom with gradient edge fade masks. Icons slide horizontally beneath a fixed circular center indicator with haptic tick and an ephemeral floating label pill that fades after 1.3s.

---

## 5. Feature List (Accurate & Implemented Only)

### Working Today `[WORKING]`
- **AI & Intelligence**: RAG retrieval over personal notes/habits/calendar/finances via 1024-dim vector embeddings; deterministic real-time context merging; 3-provider fallback chain (Mistral → Groq Llama 3 → Google Gemini); automated daily morning summaries; periodic productivity recommendations; in-line speech voice input with live waveform; tool execution with user confirmation.
- **Study Planner**: Subjects with exam deadline countdowns; syllabus topics with priority, duration, and status; flashcard decks with SuperMemo SM-2 spaced repetition algorithm (0–5 rating, ease factor, intervals); daily review queue (`nextReviewDate <= now`); direct link to Focus Timer.
- **Focus Timer**: 25m Pomodoro intervals with customizable breaks, 4-cycle loop, polymorphic session linking to syllabus topics or goals, and cumulative focus analytics.
- **Habits**: Daily/weekly habits, streak engine (current streak & high-water mark), trailing 7-day checks, 60-day calendar heat-grid.
- **Calendar**: Day/Week/Month time-blocking, recurring RRULE events, Google Calendar two-way sync, topic-linked study sessions.
- **Finance**: Income/expense tracking, customizable categories, monthly category budgets with threshold alerts, camera/image receipt OCR scanning.
- **Notes**: Rich ProseMirror/TipTap markdown editor, folder trees, tag filters, revision history deltas, document OCR scanning.
- **Mobile & Sync**: Capacitor 7 Android client (full-bleed edge-to-edge) + Expo React Native client with local SQLite offline sync and dynamic Floating Dock; Web Push & FCM native push notifications.
- **Tiers**: Free tier fully active across all modules; Pro tier schema configured.

### Partial / Planned (DO NOT CLAIM IN VIDEO) `[PLANNED]`
- *Desktop App (Electron/Tauri)*: Planned for v2; only Web and Android are live today.
- *Direct Bank Auto-Sync (Plaid/Setu)*: Planned; currently manual entry + receipt OCR.
- *Paid Stripe Checkout*: In development; launch video should emphasize free access without payment friction.

---

## 6. Privacy & Trust Facts (Real & Implemented)

- **Complete Data Export**: One-click machine-readable JSON archive containing all calendar events, habits, transactions, budgets, notes, and study plans via Settings (GDPR Art. 20 / India DPDP Act Sec. 11 compliant).
- **Two-Phase Account Deletion**: Instant session revocation and soft-delete, followed by automated cascade purging of all records across 25 user collections after a 30-day grace period.
- **Zero Third-Party Ads**: 100% ad-free; zero ad-network tracking cookies.
- **User Data Isolation**: Vector searches and RAG queries are strictly scoped to the authenticated user ID (`userId`); zero cross-tenant leakage.
- **Enterprise AI Protection**: Support for Zero Data Retention (ZDR) enterprise LLM configurations where prompts are never used to train external models.
- **Encryption**: TLS 1.3 / HTTPS encryption in transit; bcrypt (cost 12) password hashing; encrypted storage volumes at rest.

---

## 7. Demo Data (Student Character: Aarav Sharma)

- **Persona**: Aarav Sharma, 3rd-Year Computer Science Undergraduate
- **Major Exam & Deadline**: **GATE Computer Science / Final Term Exams — Nov 15, 2026 (46 days left)**
- **3 Subjects & Syllabus Topics**:
  1. *Distributed Systems & Cloud Architecture* (Blue `#0075de`):
     - "Consistent Hashing & Dynamo Ring Architecture" | 45m | Medium Priority | **[Completed]**
     - "Raft & Paxos Consensus Protocols" | 90m | High Priority | Due in 3d | **[In Progress]**
     - "CAP Theorem & Partition Tolerance" | 60m | High Priority | **[Not Started]**
  2. *Database Management & SQL Engine Internals* (Purple `#d6b6f6`):
     - "B+ Tree Indexing & Buffer Pool Management" | 75m | High Priority | **[In Progress]**
     - "ACID Isolation Levels & 2-Phase Locking" | 50m | Medium Priority | **[Not Started]**
  3. *Algorithms & Dynamic Programming* (Green `#1aae39`):
     - "Graph Traversals & Topological Sort" | 40m | Low Priority | **[Completed]**
     - "Knapsack & Interval Scheduling DP" | 80m | High Priority | **[In Progress]**
- **4 Habits & Streaks**:
  1. *Solve 2 LeetCode Problems*: Daily | **🔥 14-day streak** | Today: Completed
  2. *Deep Work Study (2 Hours)*: Daily | **🔥 8-day streak** | Today: Completed
  3. *Review Due Flashcards*: Daily | **🔥 21-day streak** | Today: Pending
  4. *Morning Run (3 km)*: Daily | **🔥 5-day streak** | Today: Completed
- **3 Calendar Events (Today)**:
  - `09:00 AM - 10:30 AM`: *Distributed Systems Lecture (Hall 302)*
  - `02:00 PM - 03:30 PM`: *Deep Work: Raft Consensus Paper Analysis* (Linked to Raft Topic)
  - `05:00 PM - 06:00 PM`: *Algorithm Study Group (Library Room 4B)*
- **5 Student Expenses (Monthly Budget: ₹12,000 | Spent: ₹8,450 | Remaining: ₹3,550)**:
  - ₹3,200 — *Hostel Mess & Monthly Meal Card* (Food)
  - ₹1,450 — *Distributed Systems Reference Textbook* (Education)
  - ₹600 — *Campus High-Speed Data Plan* (Utilities)
  - ₹450 — *Study Coffee & Snacks at Campus Cafe* (Food)
  - ₹2,750 — *GATE Exam Registration Fee* (Academics)
- **AI Conversation Example (Short & Crisp)**:
  - *User*: *"I have my Raft Consensus review in 3 days and 18 flashcards due. Can you schedule a focus block today?"*
  - *LifeOS AI*: *"You have an open window between 3:45 PM and 4:30 PM before your study group. I've prepared a 45-minute Focus Session linked to 'Raft Consensus' and queued your 18 flashcards. Would you like me to book it?"*
- **Morning Brief Text (`DailySummaryCard`)**:
  - *Title*: Daily Summary — Generated for Today (07:00 AM)
  - *Top 3 Priorities*:
    1. **Master Raft Leader Election** (*Rationale: Topic due in 3 days; highest syllabus weight*)
    2. **Clear 18 Spaced Repetition Flashcards** (*Rationale: Optimal SM-2 review threshold reached*)
    3. **Protect 2h Deep Work Window** (*Rationale: Maintain 8-day consistency streak*)
  - *Yesterday's Wins*: Completed Consistent Hashing topic (45m focus) • Solved 2 DP problems (14d streak)
  - *Today's Flow*: 09:00 AM Lecture • 02:00 PM Raft Analysis • 05:00 PM Study Group

---

## 8. Animation Ideas Matching Brand

1. **Streak Counter Roll-Up**: Tapping `[Mark Done]` pops the checkmark (`scale 0.8 → 1.28 → 1`), triggers a gentle flame wobble (`±6°`), and rolls the counter from `13 → 14` with a subtle particle sparkle.
2. **Pomodoro Dial Sweep & Glow**: Starting focus sweeps the circular SVG ring clockwise (`stroke-dashoffset` transition), pulsing a soft blue aura (`pulse-ring`), with digital numbers counting down `25:00 → 24:59`.
3. **Flashcard 3D Flip**: Tap triggers a 180° Y-axis flip with 1000px perspective and slight shadow lift, revealing the concept answer and SM-2 recall rating buttons (0 to 5).
4. **Budget Adherence Fill**: Monthly spending bar animates horizontally from left to right; passing 70% smoothly shifts color from blue (`#0075de`) to warning orange (`#dd5b00`).
5. **Floating Dock Parallax Slide**: Mobile dock slides on horizontal drag; icons scale up `1.0 → 1.28` and brighten under the fixed center indicator with single-tick haptics.
6. **Voice Waveform Dance**: Tapping the mic expands the input bar into live oscillating sound bars that smoothly collapse into streamed assistant text.
7. **Morning Brief Card Stagger**: Daily summary card cascades in from top; numbered priority badges pop sequentially (`1`, `2`, `3`) with crisp spring easing.

### Motion Style Guide
- **Durations**: Micro-interactions: `150ms` (`fast`) | UI transitions: `250ms` (`base`) | Screen reveals: `400ms` (`slow`)
- **Easing Curves**:
  - *Spring / Pop*: `cubic-bezier(0.34, 1.56, 0.64, 1)` (badges, checkmarks)
  - *Deceleration / Lift*: `cubic-bezier(0.16, 1, 0.3, 1)` (cards, dialogs)
  - *Standard Transition*: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Aesthetic Rule**: Restrained, tactile, Swiss-precision. No bouncy cartoon squash or neon glows.

---

## 9. Video Constraints & Naming Rules

- **Product Name**: Must be written **LifeOS** (Capital `L`, lowercase `ife`, capital `OS`). Never "Life Os", "lifeOS", or "Life-OS".
- **AI Name**: Refer to as **LifeOS AI** or **AI Copilot** (never ChatGPT, OpenAI, or Siri).
- **Claims to Avoid**:
  - Do NOT claim automated direct bank feeds (Plaid/Setu) — transactions are entered manually or via receipt OCR.
  - Do NOT claim native desktop apps (Mac/Windows) — only Web and Android are live today.
  - Do NOT advertise paid subscriptions or price tags — emphasize free student access.
  - Do NOT claim wearable health sensors — habits are self-reported.
  - Do NOT feature a global dark mode toggle — the product aesthetic is warm paper-calm daylight.

---

## 10. Video Assets Directory (`video-assets/`)

All files have been curated and copied into `video-assets/` at the repository root:

| File Name | Description |
| :--- | :--- |
| `logo-icon.png` | Official high-resolution 512x512 LifeOS brandmark icon (purple-blue-cyan loop) |
| `logo-splash.png` | Centered LifeOS brandmark on pure white canvas for video splash/title cards |
| `logo-adaptive.png` | Android adaptive icon format with standard safe-area padding |
| `logo-vector.svg` | Scalable vector SVG of the official LifeOS brandmark |
| `app-icon-512.png` | High-res 512x512 PWA web application manifest icon |
| `favicon.png` | Square icon asset for UI mockups and browser tab frames |
| `screen-study-planner.png` | Real screenshot of Study Planner showing syllabus topics, exam countdowns, and review queue |
| `screen-study-flashcards.png` | Real screenshot of Flashcard Library showing question/answer cards and SM-2 metrics |
| `screen-focus-timer.png` | Real screenshot of Focus & Pomodoro Timer with 25:00 dial and cycle controls |
| `screen-notes-editor.png` | Real screenshot of Notes module showing ProseMirror markdown editor and formatting toolbar |
| `screen-ai-chat-suggestions.png` | Real screenshot of AI Chat showing "Where should we begin?" and prompt suggestion tiles |
| `screen-ai-chat-voice.png` | Real screenshot of AI Chat showing live voice waveform recording state |
| `screen-habits-list.png` | Real screenshot of Habits & Routines showing streak badges and trailing 7-day checks |
| `screen-habit-detail-grid.png` | Real screenshot of Habit Detail page showing the 60-day interactive check-in heat grid |
| `screen-analytics-full.png` | Real full-page screencapture of Executive Analytics with productivity & finance charts |
| `screen-mobile-dashboard.png` | Real Android screenshot showing mobile dashboard layout and quick action tiles |
| `screen-support-help.png` | Real screenshot of Support & Help Center showing audience personas and pillars |
| `screen-download-app.png` | Real screenshot of Mobile App Download page with phone QR code and release specs |

### Recommended Additional Screen Recordings (If Needed)
1. **Interactive Flashcard Review**: Record `/study` clicking "Open Review Queue" and rating a card (0–5).
2. **AI Token Streaming**: Record `/chat` submitting the demo query to capture real-time streaming text.
3. **Mobile Floating Dock Drag**: Record Android emulator dragging the floating dock to showcase the auto-centering slide physics and haptics.
