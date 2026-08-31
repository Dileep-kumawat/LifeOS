# LifeOS — Phased Build Plan

**Companion to:** LifeOS_SRS.md v1.0
**Purpose:** Incremental, dependency-ordered build sequence with concrete tasks, deliverables, and exit criteria per phase. Includes Swagger UI (backend docs) and Storybook (frontend docs) setup and how they recur through every phase.

---

## How to use this document

Each phase has:

- **Goal** — the one-sentence reason this phase exists
- **Depends on** — what must already be done
- **Tasks** — concrete build items, grouped by layer
- **Documentation additions** — what gets added to Swagger/Storybook this phase
- **Exit criteria** — the bar for "done, move on" (resist the urge to gold-plate past this)
- **Explicitly deferred** — things you'll be tempted to build now; don't

A standing rule across every phase from Phase 1 onward: **no endpoint ships without a Swagger annotation, no shared UI component ships without a Storybook story.** This is cheap to maintain incrementally and expensive to retrofit — treat it as part of "done," not a separate documentation task at the end.

---

## Phase 0 — Foundation & Tooling (1–2 weeks)

**Goal:** A boring, working skeleton — every later phase should feel like "add a feature," never "set up infrastructure."

**Depends on:** nothing

### Tasks

**Repo & environment**

- Monorepo layout: `/web`, `/mobile`, `/api`, `/packages/shared` (shared TS types/zod schemas between web and api)
- TypeScript across the board; shared `tsconfig.base.json`
- ESLint + Prettier with a single shared config
- Docker Compose: MongoDB, Redis, API — one command to boot local dev

**Backend scaffold**

- Express app with versioned routing (`/api/v1`)
- Mongoose connection setup, base `User` model
- Zod for request validation
- Environment config layer (`.env` + validation on boot — fail fast on missing config)

**Frontend scaffold**

- Vite + React app, Tailwind + shadcn/ui installed
- Zustand store skeleton
- TanStack Query client configured
- React Router base layout

**CI/CD**

- GitHub Actions: lint → typecheck → test on every PR
- Separate workflow for deploy to staging on merge to `main`

**Observability**

- Sentry wired into both API and web (cheap now, painful later)
- Basic structured logging (pino or winston) on the API

### Swagger UI setup (do this now, not later)

- Install `@fastify/swagger` + `@fastify/swagger-ui` (or `swagger-jsdoc` + `swagger-ui-express` if on Express)
- Generate the OpenAPI spec **from your Zod schemas** rather than hand-writing it twice — use `zod-to-openapi` (or `fastify-type-provider-zod`, which gives you request validation and OpenAPI generation from the same schema definition). This means every route you already validate with Zod documents itself for free.
- Mount at `/api/v1/docs` (gate behind auth or IP-allowlist in production — don't expose your full API surface publicly by default)
- Add a CI check that fails the build if a route is missing a schema/description (prevents docs from silently rotting)

### Storybook setup (do this now, not later)

- `npx storybook init` in `/web`, Vite builder (matches your app's build tool, faster than webpack builder)
- Addons: `essentials` (controls, actions, viewport, docs), `a11y` (catches accessibility issues early, relevant to your WCAG 2.1 AA baseline in NFR), `interactions` (for testing component behavior, not just appearance)
- Wire Tailwind into Storybook's preview so components render with real styling, not unstyled
- Set up a `Button`/`Input`/`Card` story from your design system as the first stories — this establishes the pattern the team follows for every component after
- Optional but worth it early: Chromatic (or just a static Storybook build published in CI) for visual review on PRs, so design review doesn't require pulling the branch locally

### Exit criteria

- `docker compose up` boots API + DB + Redis; `npm run dev` boots web
- Empty API route documented and visible in Swagger UI
- One example component has a working Storybook story
- CI passes on a trivial PR

### Explicitly deferred

- Mobile scaffold (Phase 5) — don't split attention yet
- Any actual feature code

---

## Phase 1 — Auth + Core CRUD (2–4 weeks)

**Goal:** A user can register, log in, and fully manage calendar, goals, habits, and notes. This is the real MVP skeleton everything else attaches to.

**Depends on:** Phase 0

### Tasks

**Auth (FR-1.x — build now)**

- Email/password registration + login (FR-1.1, partial — defer Google OAuth/OTP)
- JWT access token (short-lived) + refresh token (long-lived, rotated on use) via Passport.js (`passport-jwt`) per the SRS's stated auth standardization (FR-1.2)
- Password reset via expiring email-link token (FR-1.4) — you'll need transactional email (Resend/Postmark) wired in here, earlier than the SRS phase list suggests, since password reset is not really optional
- Basic RBAC middleware: `User` vs `Admin` role check (FR-1.6)
- Account deletion endpoint that soft-deletes immediately and hard-purges via a scheduled job at 30 days (FR-1.7) — build the purge job now even though nobody will trigger it yet; it's much easier to build alongside the User model than retrofit

**Calendar (FR-3.1, 3.2)**

- CRUD for events: title, start/end, description, location
- Recurrence via RRULE (use `rrule` npm package rather than hand-rolling recurrence logic)
- Day/week/month view endpoints (return expanded recurring instances for a date range, not raw rules — let the client render, don't make it re-implement RRULE expansion)

**Goals & Habits (FR-4.1–4.3)**

- Goal CRUD: title, target date, milestones (subdocuments), status, progress %
- Habit CRUD: title, frequency (daily/weekly/custom), check-in endpoint
- Streak calculation: current streak, longest streak, completion rate — compute on check-in write, don't recompute on every read (cache the derived stats on the Habit document)

**Notes (FR-5.1, 5.2, 5.5)**

- CRUD with folders and tags
- Rich text stored as JSON (e.g. TipTap/ProseMirror doc format) — avoid storing raw HTML, it complicates future AI summarization and search
- Full-text search: MongoDB text index on title + flattened content to start; you'll layer vector search on top in Phase 3, this is separate

**Frontend**

- Auth screens (login/register/forgot password)
- Calendar view (day/week/month)
- Goals & habits list + detail views, check-in UI with streak display
- Notes list + editor

### Documentation additions

- **Swagger:** every auth, calendar, goal, habit, note endpoint documented with request/response schemas and example payloads. Tag routes by module (`Auth`, `Calendar`, `Goals`, `Habits`, `Notes`) so the Swagger UI sidebar is navigable by feature, matching your module structure.
- **Storybook:** stories for every reusable component born this phase — `EventCard`, `HabitStreakBadge`, `GoalProgressBar`, `NoteEditor` (at least a read-only/basic-state story; full rich-text interaction stories can wait), form inputs. Use Storybook's `controls` addon so PMs/designers can play with component states without touching code.

### Exit criteria

- A user can register, log in, and — with zero AI, zero mobile — fully manage their calendar, goals, habits, and notes through the web UI
- Streak calculation is correct across at least: daily habit, weekly habit, a missed day, a caught-up streak
- All Phase 1 endpoints appear in Swagger UI with working "try it out"
- All Phase 1 shared components have Storybook stories

### Explicitly deferred

- Google OAuth, phone OTP, MFA (Phase 10)
- Google Calendar sync (Phase 10)
- OCR on notes (Phase 6)
- AI summarization/tagging on notes (Phase 3)
- Note version history (nice-to-have, fold into Phase 3 or later if time allows)

---

## Phase 2 — Notification Engine (1–2 weeks)

**Goal:** Reliable reminders and an in-app notification center. Every later phase (habit reminders, daily AI summary, budget alerts) depends on this existing first.

**Depends on:** Phase 1

### Tasks

**Backend**

- Set up BullMQ (Redis-backed) — you'll reuse this queue for OCR, embeddings, and daily summaries later, so build the queue abstraction generically now (a `enqueueJob(type, payload)` wrapper, not one-off queues per feature)
- Notification model: type, payload, channel, read status, scheduled time (per §6.1)
- Web Push integration
- In-app notification center endpoints: list, mark-read, mark-all-read
- Per-module notification preferences (calendar reminders, habit reminders — user can toggle each) (FR-13.3)
- De-duplication/batching logic (FR-13.4) — e.g. don't send 5 separate pushes for 5 habits due at the same time, batch into one

**Frontend**

- Notification bell + dropdown/panel with read/unread state
- Notification preferences settings page
- Push permission request flow (with a sensible explanation before the browser prompt, not a cold prompt on page load)

**Wire into Phase 1 features**

- Event reminders (configurable lead time) (FR-3.5)
- Habit reminders at user-configured times (FR-4.4)

### Documentation additions

- **Swagger:** `Notifications` tag — list/mark-read endpoints, preference endpoints
- **Storybook:** `NotificationBell`, `NotificationItem`, `NotificationPreferenceToggle` components

### Exit criteria

- Creating an event with a reminder actually results in a push notification at the right time
- Toggling a habit reminder off actually stops the notification
- Notification center correctly reflects read/unread across a refresh

### Explicitly deferred

- Email notifications (add when Phase 3's daily summary needs them, or now if trivial given Resend is already wired for password reset — reasonable to pull forward)
- FCM (mobile) — Phase 5

---

## Phase 3 — AI Assistant Core (3–5 weeks)

**Goal:** The core differentiator. Chat interface with RAG over the user's own data, tool-calling to act on it, and the daily summary job.

**Depends on:** Phase 1, Phase 2 (for summary delivery)

### Tasks

**AI infrastructure**

- Set up LangChain.js
- Implement the provider fallback chain exactly as specified in SRS §10.5.1: Mistral → Groq → Gemini via `.withFallbacks()`, each wrapped with an 8–10s timeout and 1 retry before falling through (FR-2.10, FR-2.11)
- Config-driven provider order (not hardcoded) — a one-line change if a free tier changes (per SRS rationale)
- Logging: serving provider, latency, token usage per request (FR-2.12) — this is your early-warning system for free-tier exhaustion, don't skip it
- Graceful total failure handling: in-app error + queue for async retry where applicable (FR-2.13)

**RAG pipeline**

- Embedding generation job (BullMQ) — triggered on create/update of notes, goals, habits, calendar events
- MongoDB Atlas Vector Search index setup
- Retriever that pulls relevant records before constructing the LLM prompt (FR-2.2)

**Tool-calling**

- Define tool schemas once (create event, create task, create note) via LangChain's unified interface, reused across all three providers (FR-2.14)
- Confirmation step in the UI for destructive/write actions before execution (FR-2.4)

**Chat**

- WebSocket-based streaming chat endpoint (Socket.IO)
- Conversational memory scoped per user, referenceable across sessions (FR-2.5)
- Uncertainty signaling — the AI should say "I don't have enough data to answer that" rather than hallucinate (FR-2.6) — this needs explicit prompt engineering, test it deliberately
- Rate limiting per subscription tier (FR-2.8)
- AI interaction logging with sensitive-content-aware retention (FR-2.7, ties to NFR-6.2's disclosure requirement)

**Daily summary**

- Scheduled BullMQ job (per-user, respecting their configured delivery time) generating: yesterday's completed tasks/habits, today's schedule, top 3 priorities (FR-10.1)
- Delivery via push (Phase 2 infra) and in-app (FR-10.2)
- User-configurable delivery time/channel (FR-10.4)

**Frontend**

- Chat UI with streaming token rendering, "retrying with backup model" state on provider fallback (per §10.5.1)
- Confirmation modals for tool-triggered writes
- Daily summary card on the dashboard/home screen

### Documentation additions

- **Swagger:** `AI` tag — chat endpoint (note: WS endpoints don't fit OpenAPI cleanly; document the REST-accessible bits — conversation history, summary preferences — and describe the WS protocol in a markdown section within the Swagger UI's API description rather than forcing it into the schema)
- **Storybook:** `ChatMessage` (user/AI/tool-call variants), `StreamingIndicator`, `ToolConfirmationModal`, `DailySummaryCard` — these benefit especially from Storybook since chat UI has many visual states (streaming, error, tool-call-pending, tool-call-confirmed) that are tedious to trigger manually in the real app

### Exit criteria

- All four example queries from FR-2.3 work correctly: productivity review, tomorrow's study plan (stub OK if study planner isn't built yet — reference calendar only), meeting summary, financial advice (stub OK if finance isn't built yet)
- Killing the Mistral API key still produces a correct response (falls through to Groq) — actually test this, don't assume
- Daily summary generates and delivers correctly for a test user across at least 3 consecutive days

### Explicitly deferred

- Voice input (Phase 8) — text chat only for now
- Advanced/periodic recommendations beyond daily summary (Phase 9)

---

## Phase 4 — Finance Tracker (2–3 weeks)

**Goal:** Manual finance tracking with budgets and AI-driven insight, reusing the Phase 3 AI infra rather than building a parallel system.

**Depends on:** Phase 3

### Tasks

**Backend**

- Transaction CRUD: amount, category, type, date, note (FR-6.1)
- Budget CRUD per category with overspend detection → wired into Phase 2's notification engine for alerts (FR-6.3)
- Monthly summary aggregation endpoint (category breakdown, trend over time) (FR-6.4)
- AI spending analysis — this is a new "tool" for the Phase 3 assistant, plus a dedicated `/finance/insights` endpoint for direct queries like "help me get financially better" (FR-6.5)
- Include Transaction/Budget in the Phase 3 embedding pipeline so RAG can retrieve financial context in general chat queries too

**Frontend**

- Transaction entry form + list, filterable by category/date
- Budget setup UI with visual overspend indicators
- Charts: category breakdown, trend line (Recharts)

### Documentation additions

- **Swagger:** `Finance` tag — transactions, budgets, insights endpoints
- **Storybook:** `TransactionRow`, `BudgetProgressBar`, `CategoryBreakdownChart`, `TransactionForm`

### Exit criteria

- A user can log a month of transactions, set a budget, get an overspend alert, and ask the AI assistant for a spending recommendation that reflects real logged data (not generic advice)

### Explicitly deferred

- OCR receipt scanning (Phase 6)
- Multi-currency (v2, not in any phase here)
- Bank account linking (v2, explicitly deferred in SRS §9)

---

## Phase 5 — Android + Offline Sync (4–6 weeks — budget the most time here)

**Goal:** Feature parity on mobile with offline-first behavior and real conflict resolution. This is the hardest engineering phase in the whole plan — don't compress it.

**Depends on:** Phases 1–4 (porting an already-proven feature set, not designing new features)

### Tasks

**Scaffold**

- Expo RN app, shared design tokens with web where feasible (can't literally share Tailwind, but keep spacing/color/type scale consistent)
- Zustand (same state patterns as web)
- WatermelonDB (or SQLite via op-sqlite) as local store

**Offline sync engine — the core of this phase**

- Local-first writes: every mutation writes to local DB immediately, UI updates optimistically, a `pending-sync` flag is set
- Sync protocol: on reconnect, push pending local changes, pull remote changes since last sync
- **Conflict resolution** — per SRS §2.5, last-write-wins is explicitly called out as insufficient for finance/notes. Concretely:
  - For **notes**: field-level merge where possible; if the same field was edited on two devices, keep both versions and surface a "resolve conflict" UI rather than silently discarding one (this uses the version history data model from FR-5.6, worth building now if you deferred it in Phase 1)
  - For **finance/habits**: these are mostly append-only (transactions, check-ins), so conflicts are rarer — design the schema to make conflicting edits structurally unlikely (e.g. check-ins keyed by date, so "second check-in for the same day" is a dedup, not a merge)
  - For **calendar**: last-write-wins is probably acceptable here (SRS doesn't call it out) but flag conflicting edits to the user rather than silently overwriting

**Mobile-specific features**

- FCM push notifications + Notifee for local-scheduled notifications (works offline) (FR-13.5)
- Reuse Phase 1–4 UI patterns, don't redesign

**Test case**

- Build and validate UC-4 explicitly: mark a habit complete offline → verify local pending state → reconnect → verify server sync and conflict resolution

### Documentation additions

- **Swagger:** add sync endpoints (`/sync/push`, `/sync/pull` or equivalent) with clear documentation of the conflict-resolution response shape — this is API surface other engineers (or future you) will need to understand precisely
- **Storybook:** mobile components generally don't render in web Storybook out of the box; if component logic is shared via a cross-platform library, story the platform-agnostic pieces (e.g. shared business-logic hooks tested via Storybook's interaction testing) — otherwise this phase's UI work isn't a strong Storybook fit and that's fine, don't force it

### Exit criteria

- UC-4 passes reliably, including a forced conflict (edit same habit's note on two devices while both offline, then reconnect both) resolving sensibly, not silently dropping data
- Web and Android feature sets match for Phases 1–4 functionality

### Explicitly deferred

- OCR camera capture (Phase 6, though camera plumbing can start here if convenient)

---

## Phase 6 — OCR (1–2 weeks)

**Goal:** Receipt-to-expense and handwritten-note-to-text, reusing one OCR pipeline across two entry points.

**Depends on:** Phase 4 (finance), Phase 5 (mobile camera access)

### Tasks

- On-device ML Kit Text Recognition for mobile capture (fast, free)
- Server-side fallback (Google Vision API or Tesseract) for web uploads (FR-5.3, FR-6.2)
- OCR job queued via BullMQ (reuse Phase 2's job infra)
- Notes: photographed text → editable note pre-fill
- Finance: photographed receipt → merchant/amount/date extraction → pre-filled transaction for confirmation (UC-3)
- Confirmation/edit UI — OCR is never fully trusted, always surface for user correction before save

### Documentation additions

- **Swagger:** `/ocr` endpoint(s) — document expected image formats, size limits, and the extraction response shape
- **Storybook:** `OCRPreviewCard` (shows extracted fields with edit affordance), `ReceiptScanFlow` states (scanning/processing/review)

### Exit criteria

- UC-3 passes end-to-end on mobile
- Web upload OCR fallback works for at least printed receipts (handwriting accuracy can be lower, note this as a known limitation rather than blocking the phase)

---

## Phase 7 — Study Planner + Pomodoro (2–3 weeks)

**Goal:** These are naturally paired — Pomodoro sessions link to study sessions, tasks, and goals.

**Depends on:** Phase 3 (AI plan generation), Phase 1 (calendar for scheduling generated plans)

### Tasks

**Study Planner**

- Subject/topic/deadline CRUD (FR-7.1)
- AI-generated study plan as a new Phase 3 tool: given available calendar free-time + deadlines + priority, generate a topic-by-time-block plan (FR-7.2, UC-2) — this reuses the tool-calling pattern to create actual calendar events on confirmation
- Spaced-repetition scheduling for flashcard-type items (FR-7.3) — implement a standard algorithm (SM-2 is a reasonable default) rather than inventing one

**Pomodoro**

- Focus session start/stop, customizable work/break intervals, linked to a task/goal (FR-8.1)
- Interval-completion notifications (reuse Phase 2 infra) (FR-8.2)
- Session history + aggregated focus time per day/week (FR-8.3) — feeds Phase 9's analytics
- Mobile: mute non-critical notifications during active session, opt-in (FR-8.4)

### Documentation additions

- **Swagger:** `StudyPlanner`, `Focus` tags
- **Storybook:** `PomodoroTimer` (all states: idle/working/break/paused), `StudyPlanCard`, `FlashcardReviewCard`

### Exit criteria

- UC-2 passes: AI generates a plan, user confirms, calendar events actually appear
- A completed Pomodoro session correctly logs and aggregates into daily/weekly totals

---

## Phase 8 — Voice Commands (1 week)

**Goal:** Thin layer on top of the already-solid Phase 3 tool-calling pipeline — genuinely low effort if Phase 3 was built well, which is why it's this late despite sounding flashy.

**Depends on:** Phase 3

### Tasks

- Mic input capture on mobile (`react-native-voice` or platform STT)
- Route transcribed text through the exact same intent/tool-calling pipeline chat already uses — no separate logic path (FR-9.2)
- Confirmation step for ambiguous/destructive voice actions, reusing Phase 3's confirmation UI pattern (FR-9.3)

### Documentation additions

- **Swagger:** likely no new REST surface if voice reuses the chat pipeline entirely — note this explicitly in the docs so it's clear voice isn't a separate undocumented system
- **Storybook:** `VoiceInputButton` states (listening/processing/error)

### Exit criteria

- "Add a task for tomorrow at 5pm" spoken on mobile produces the same result as typing it in chat

---

## Phase 9 — Analytics Dashboard (2 weeks)

**Goal:** Pull together data that already exists from every prior phase — cheap now, would've been premature earlier.

**Depends on:** Phases 1, 4, 7 (needs task/habit/finance/focus data to exist)

### Tasks

**Analytics**

- Productivity analytics: tasks completed, focus time, habit consistency (FR-12.1)
- Finance analytics: spend by category, trend, budget adherence (FR-12.2)
- Custom date-range filtering across all views (FR-12.3)
- CSV/PDF export (FR-12.4)
- Periodic (weekly/monthly) smart recommendations — expands Phase 3's daily summary into a broader recurring job (FR-10.3)

### Documentation additions

- **Swagger:** `Analytics` tag — document export endpoint response types (binary/CSV/PDF) carefully, these don't follow the usual JSON pattern
- **Storybook:** `AnalyticsChart` variants

### Exit criteria

- A user can view productivity + finance analytics over a custom date range and export it

---

## Phase 10 — Launch Polish (2–4 weeks)

**Goal:** Everything deferred from Phase 1 because it wasn't blocking, plus the compliance/security work that's cheap to defer feature-by-feature but not cheap to defer entirely.

**Depends on:** everything above

### Tasks

- Google OAuth, phone OTP, MFA (completing FR-1.1, FR-1.3)
- Google Calendar two-way sync (FR-3.3)
- Full OWASP Top 10 pass (NFR-2.4) — dedicated security review, not incidental
- Audit logging for admin actions and sensitive-module access (NFR-2.6)
- Load testing against NFR-1.3 (10k concurrent WebSocket connections) — do this before launch, not after you find out the hard way
- GDPR/DPDP compliance pass: data export, deletion flows actually tested, AI-usage disclosure written into the privacy policy per NFR-6.2 (this ties directly to the free-tier LLM data-usage question flagged in SRS §10.5.1 — resolve it before real user data flows through Mistral/Groq/Gemini)
- Automated backup + point-in-time recovery verification (NFR-3.3) — actually restore from a backup once, don't just assume the backup works

### Documentation additions

- **Swagger:** full audit pass — every route has accurate auth requirements documented, no stale/orphaned routes left in the spec
- **Storybook:** a11y addon audit across all stories (ties to WCAG 2.1 AA baseline)

### Exit criteria

- Full SRS functional requirement checklist reviewed against what's built
- Security and compliance sign-off
- Load test passes at target concurrency

---

## Recurring documentation discipline (applies from Phase 1 onward)

To keep Swagger and Storybook genuinely useful rather than decorative:

**Swagger UI**

- Generate from Zod schemas, don't hand-maintain a parallel spec — divergence is inevitable otherwise
- CI gate: no PR merges with an undocumented route
- Version the spec alongside `/api/v1` — when you eventually cut `/api/v2`, old docs stay intact
- Gate the docs UI behind auth (or at least IP-allowlist) in production

**Storybook**

- Every component in `/web/src/components` that's used in more than one place gets a story — this is the practical bar, not "every component ever"
- Use `controls` so non-engineers (design, PM) can explore states without a local dev environment
- Publish a static build in CI on every PR (Chromatic or a simple static host) so component review doesn't require pulling branches
- Add the `a11y` addon findings to your Definition of Done, not just a pre-launch afterthought

---

## Summary timeline (rough, single small team)

| Phase                        | Duration | Cumulative |
| ---------------------------- | -------- | ---------- |
| 0 — Foundation               | 1–2 wk   | 2 wk       |
| 1 — Auth + Core CRUD         | 2–4 wk   | 6 wk       |
| 2 — Notifications            | 1–2 wk   | 8 wk       |
| 3 — AI Assistant             | 3–5 wk   | 13 wk      |
| 4 — Finance                  | 2–3 wk   | 16 wk      |
| 5 — Android + Offline Sync   | 4–6 wk   | 22 wk      |
| 6 — OCR                      | 1–2 wk   | 24 wk      |
| 7 — Study Planner + Pomodoro | 2–3 wk   | 27 wk      |
| 8 — Voice                    | 1 wk     | 28 wk      |
| 9 — Analytics                | 2 wk     | 30 wk      |
| 10 — Launch Polish           | 2–4 wk   | 34 wk      |

~7–8 months to a genuinely launch-ready product for a small team. Treat this as a planning input, not a promise — Phase 5 (offline sync) and Phase 3 (AI core) are the two most likely to run over, so if you need to protect a launch date, look there first rather than cutting corners in Phase 10's compliance work.