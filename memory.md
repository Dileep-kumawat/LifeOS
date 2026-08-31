# LifeOS System Memory & Architecture Map

> **Token-Optimized Project Blueprint for AI Agents**  
> Maintainer Notice: When completing new features, schemas, or modules, follow the update protocol in [Section 7](#7-memory-maintenance-protocol-for-ai-agents).

---

## 1. High-Level Architecture & Tech Stack

- **Monorepo Architecture**: `npm` Workspaces (`api`, `web`, `mobile`, `packages/shared`).
- **Backend (`/api`)**: Node.js 22 LTS, Express + TypeScript, Mongoose (MongoDB), Redis (Caching/Bull), Zod, Pino logging, Passport.js (JWT Access + Refresh tokens, OAuth stub), Swagger (`/api/v1/docs`), Sentry.
- **Frontend Web (`/web`)**: React 18 + Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query, React Router v6, Web Speech API + Web Audio API inline Voice Input (`useWebVoiceInput`, `VoiceWaveform`), Storybook, Sentry.
- **Mobile (`/mobile`)**: Expo SDK 52 (React Native), TypeScript, React Navigation with dynamic Floating Sliding Dock (`FloatingDock.tsx`, `useDockHeight` clearance hook, `BlurView`, `LinearGradient` edge fade masks, Reanimated spring physics, fixed static center indicator with proximity-driven transforms, gesture horizontal scrolling with auto-centering, single-fire haptic feedback, memoized subcomponents), On-device Speech Recognizer & inline Voice Input (`useMobileVoiceInput`, `mobileVoiceService`, `VoiceWaveform`), SQLite local storage, EAS Build, Sentry.
- **Shared Package (`/packages/shared`)**: Shared Zod schemas, TypeScript types, design system tokens, and utility functions.
- **Infra & DevOps**: Docker Compose (`mongo`, `redis`, `api`), GitHub Actions CI.

---

## 2. Directory & Workspace Map

```
LifeOS/
├── api/                   # Express REST API v1
│   ├── src/
│   │   ├── auth/          # Passport JWT strategy, refresh token logic, auth middleware
│   │   ├── config/        # Environment vars, database & Redis connection setup
│   │   ├── db/            # Mongoose connections, indexes
│   │   ├── middleware/    # Auth, error handler, rate limiters, Zod validation
│   │   ├── models/        # Mongoose schemas (User, Event, Habit, Note, Finance, AI, Sync, etc.)
│   │   ├── routes/        # API v1 routes (auth, calendar, finance, goals, habits, notes, sync, etc.)
│   │   └── services/      # AI (RAG, embeddings), Sync engine, Google Calendar integration
├── web/                   # Vite + React Web Application
│   ├── src/
│   │   ├── components/    # Reusable UI components & Storybook stories
│   │   ├── features/      # Modules (ai, calendar, dashboard, finance, goals, habits, notes, notifications)
│   │   ├── store/         # Zustand global state slices
│   │   ├── routes/        # Page routes & layout wrappers
│   │   └── index.css      # Design tokens & Tailwind setup
├── mobile/                # Expo React Native App
│   ├── src/
│   │   ├── db/            # Local DB setup & offline sync logic
│   │   ├── navigation/    # RootNavigator & FloatingDock (sliding dynamic navigation)
│   │   ├── screens/       # Auth & Main screens (Dashboard, Calendar, Finance, Habits, Notes, Chat, ConflictResolution)
│   │   ├── store/         # Mobile Zustand state
│   │   └── services/      # API client & offline sync engine
│   └── eas.json           # EAS Build configuration (preview, production profiles)
├── packages/
│   └── shared/            # Monorepo shared package
│       ├── src/
│       │   ├── schemas/   # Zod validation schemas (auth, calendar, finance, habits, notes, sync)
│       │   └── tokens/    # Design system tokens & color definitions
├── scripts/               # OpenAPI & build validation scripts
├── docker-compose.yml     # Local orchestration (MongoDB + Redis + API)
├── AGENTS.md              # Domain skills & agent instructions
└── DESIGN.md              # Design tokens & visual guidelines
```

---

## 3. Data Models & Database Schemas (`/api/src/models`)

- **Auth & User**:
  - `User`: Core profile, password hash, OAuth IDs, preferences, tier settings.
  - `RefreshToken`: Active refresh tokens, device info, expiration.
- **Calendar & Time**:
  - `Event`: Calendar events, start/end timestamps, recurrence rules, Google Sync IDs, `linkedTopicId` (reverse-link to syllabus topics).
- **Finance**:
  - `Transaction`: Amount, category, type (income/expense), date, notes.
  - `Budget`: Monthly category budgets & alert thresholds.
  - `BudgetHistory`: Historical budget performance snapshots.
  - `Category`: Custom financial & task categories.
- **Habits & Goals**:
  - `Habit`: Frequency, target count, streaks, active state.
  - `HabitCheckIn`: Daily check-in timestamps & completions.
  - `Goal`: Key results, target date, progress percentage, parent goal.
- **Notes & Knowledge**:
  - `Note`: Title, markdown content, tags, folder ID, pinned status.
  - `NoteFolder`: Hierarchical tree folders for notes.
  - `NoteVersion`: Revision history & delta diffs.
- **Offline Sync & Tombstones**:
  - `SyncTombstone`: Soft-deletion tracking for client delta synchronization.
- **Study Planner & Spaced Repetition**:
  - `Subject`: Name, color accent, optional exam deadline.
  - `Topic`: Subject ref, title, deadline, priority (`low`/`medium`/`high`), status (`not_started`/`in_progress`/`completed`), duration estimate.
  - `Flashcard`: Front, back, optional topic/subject refs, SM-2 state (`easeFactor`, `intervalDays`, `repetitions`, `nextReviewDate`).
- **Focus & Pomodoro Timer**:
  - `FocusSession`: Pomodoro session state (`workMinutes`, `breakMinutes`, `longBreakMinutes`, `longBreakInterval`, `currentCycle`, `currentPhase`: `work`/`break`/`long_break`, `linkedType`: `task`/`goal`/`topic`/`none`, `linkedId`, `status`: `active`/`paused`/`completed`/`abandoned`, `accumulatedWorkSeconds`, `totalFocusMinutes`).
- **AI & Notifications**:
  - `AiRequestLog`: Token usage & prompt history log.
  - `Conversation` & `Message`: Chat history with AI assistant.
  - `Embedding`: Vector embeddings for RAG search over user data.
  - `Summary`: Daily/weekly AI-generated life performance summaries.
  - `Notification` & `PushSubscription`: System alerts & Web Push / Mobile Push endpoints.

---

## 4. API Endpoints Overview (`/api/src/routes`)

- `/api/v1/health` - Health check & system status.
- `/api/v1/auth` - User registration, login, token refresh, logout, `/me`.
- `/api/v1/calendar` - CRUD events, recurring expansion, Google Calendar sync.
- `/api/v1/finance` - CRUD transactions, budget tracking, category analytics.
- `/api/v1/habits` - CRUD habits, daily check-in toggle, streak computation.
- `/api/v1/goals` - CRUD goals, key result updates, progress tracking.
- `/api/v1/notes` - CRUD notes & folders, version history, search, tag filters.
- `/api/v1/study/subjects` - CRUD subjects with cascade deletion of topics & flashcards.
- `/api/v1/study/topics` - CRUD syllabus topics, filter by subject, status, due-soon.
- `/api/v1/study/topics/:id` - Enriched topic view combining metadata, flashcards, focus time aggregates, recent focus sessions, and calendar plan events.
- `/api/v1/study/topics/:id/focus-time` - Real-time focus time aggregation querying `FocusSession` collection strictly for that topic (FR-7.4).
- `/api/v1/study/flashcards` - CRUD flashcards, filter by topic/subject.
- `/api/v1/study/flashcards/due` - Spaced repetition daily review queue (`nextReviewDate <= now`).
- `/api/v1/study/flashcards/:id/review` - SM-2 self-assessment review (0–5 rating).
- `/api/v1/focus/sessions` - CRUD focus sessions, pause, resume, complete, abandon, interval-complete.
- `/api/v1/focus/sessions/active` - Retrieve caller's currently running/paused focus session.
- `/api/v1/focus/summary` - Aggregated focus time summary, polymorphic `linkedType` breakdown, and sequential trend time-series (FR-7.4, FR-8.3, feeds Phase 9 analytics).
- `/api/v1/notifications` - Alert feed, push subscriptions (VAPID/Expo push).

- `/api/v1/sync` - Delta sync engine, conflict detection, tombstone tracking.
- `/api/v1/ai/chat` - AI assistant conversational interface (RAG enabled).
- `/api/v1/ai/summary` - Automated daily & weekly life performance summaries.
- `/api/v1/ocr/extract` - Shared server-side OCR extraction (Tesseract fallback, BullMQ queue, 10MB limit, rate limited).
- `/api/v1/ocr/extract/:jobId` - Polling status and result retrieval for async OCR extraction jobs.

---

## 5. Mobile & Build Highlights

- **EAS Build Pipeline**:
  - Root `package.json` defines `postinstall` and `eas-build-post-install` to build `@lifeos/shared` before compiling mobile app.
- **Offline-First & Conflict Handling**:
  - SQLite/WatermelonDB local cache with background sync.
  - `ConflictResolutionScreen.tsx` on mobile to resolve client/server state conflicts.
- **Dock & Layout Architecture**:
  - `useDockHeight()` hook exported from `FloatingDock.tsx` calculates dynamic bottom clearance (`DOCK_HEIGHT + bottomOffset + DOCK_CLEARANCE`), used across all tab screens (`ScreenContainer.tsx` with `includeDockPadding`, subview scrollable lists) to prevent dock occlusion.
  - Auth screens (`LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen`) use `contentContainerStyle: { flexGrow: 1, justifyContent: "center" }` for vertical centering across various device heights with smooth keyboard scrolling.
- **Physical Device Debugging (Android via USB)**:
  - `adb reverse tcp:8081 tcp:8081` (Metro bundler)
  - `adb reverse tcp:4000 tcp:4000` (API backend)

---

## 6. Key Commands Reference

```bash
# Local Development
npm run dev:api         # Start Express API in watch mode (Port 4000)
npm run dev:web         # Start Vite Web App (Port 5173)
npm run dev:mobile      # Start Expo Metro bundler
docker compose up       # Launch Mongo + Redis + API containers

# Verification & Build Pipeline
npm run build           # Monorepo build: shared -> api -> web
npm run lint            # Monorepo ESLint check
npm run typecheck       # Monorepo TypeScript check
npm run test            # Monorepo unit & integration tests
npm run check:openapi   # OpenAPI coverage validation

# Mobile EAS Build
cd mobile && npx eas-cli build -p android --profile preview
```

---

## 7. Memory Maintenance Protocol for AI Agents

> **MANDATORY INSTRUCTION FOR ALL FUTURE AI AGENTS:**
> Whenever you complete a feature, fix a bug, add an API endpoint, create/modify database models, add UI screens, or alter workspace config, you **MUST** update this `memory.md` file before completing your task.

### Step-by-Step Maintenance Workflow:
1. **Locate `memory.md`**: File path is `memory.md` at workspace root.
2. **Review Affected Sections**:
   - New database model/field -> Update **Section 3**.
   - New API route -> Update **Section 4**.
   - New UI screen or workspace package -> Update **Section 1 & 2**.
   - New script or dependency setup -> Update **Section 5 & 6**.
   - Fix to a fragile/complex component -> Update **Section 8** checklist if a new failure mode was discovered.
   - Every fix or completed feature -> Prepend 1 line to **Section 9** (rolling log, capped at 15 entries, drop oldest if >15).
   - New implicit coding pattern established -> Update **Section 10**.
   - New environment variables or ports -> Update **Section 11**.
3. **Maintain Format Constraints**:
   - Keep entries dense, token-efficient, and bulleted.
   - Sections 1–8 and 10–11 describe standing state (no prose/changelogs). Section 9 is the sole rolling log (capped at 15 single-line entries).
4. **Validate**: Ensure file paths and command names accurately match the repository state without contradictions.

---

## 8. Known Fragile Areas

Components and modules with non-obvious coupling, timing sensitivities, or high historical regression rates.

### `FloatingDock.tsx` (`/mobile/src/navigation/FloatingDock.tsx`)
- **Fragility Mechanism**:
  - Dual-purpose scroll state: a single horizontal `ScrollView` / `scrollX` Reanimated shared value drives continuous visual scaling/opacity transforms while scroll settling triggers discrete React Navigation route changes.
  - Race conditions between programmatic `scrollTo` and manual gestures: programmatic navigation scrolls can re-trigger intermediate navigation events if `isProgrammaticScrollRef` guard is missing or cleared prematurely.
  - Keyboard visibility lifecycle: conditionally unmounting the dock on keyboard open wipes `scrollX` and internal refs back to 0; the dock must remain mounted and toggle visibility via Reanimated opacity/transform and `pointerEvents` instead.
  - Side-padding & geometry math: side padding `(dockWidth - ITEM_WIDTH) / 2` and snap intervals must align with screen width so edge items (1st and last) can reach the static center indicator.
- **Past Regressions / Failure Modes**:
  - Mount jump and pop-snapback animation glitch caused by synchronous `scrollX` writes during render and unmemoized subcomponents.
  - Intermediate screen flicker/flashing when tapping distant dock icons (e.g. jumping 3+ tabs across).
  - Active indicator resetting to first route (Dashboard) upon dismissing virtual keyboard on other tabs.
  - Screen content occlusion when tab views lacked dynamic bottom clearance.
  - Static label pill staying visible indefinitely rather than auto-fading after navigation settle.
- **Mandatory Verification Checklist**:
  - [ ] Tap non-adjacent tabs (1st to 5th): destination mounts immediately with smooth slide; intermediate screens do NOT mount/flicker.
  - [ ] Swipe/drag dock horizontally: snaps cleanly to nearest icon with single haptic tick and navigates to settled screen.
  - [ ] On input screens (Chat/Assistant): focus text input, confirm dock fades out and input remains visible above keyboard; dismiss keyboard, confirm dock fades in and retains the CURRENT active route icon.
  - [ ] Confirm active title pill appears on route switch and auto-fades out after ~1.3s with `pointerEvents="none"`.
  - [ ] Scroll to bottom on all tab screens: verify last item/card is fully visible above dock with `useDockHeight()` clearance.

### `Sync Engine & Processor` (`/mobile/src/services/syncEngine.ts` & `/api/src/services/sync/syncProcessor.ts`)
- **Fragility Mechanism**:
  - Bi-directional delta sync between local SQLite and remote MongoDB relying on strict monotonic timestamps (`lastSyncedAt`, `lastModifiedAt`), soft-delete tombstones (`SyncTombstone`), and topological dependency order (e.g. `note_folders` before `notes`, `categories` before `transactions`).
  - 3-way merge diffing where concurrent edits must correctly distinguish clean merges from true conflicts, writing unresolved conflicts to SQLite `sync_conflicts` without overwriting remote data.
- **Past Regressions / Failure Modes**:
  - Foreign key and dependency insertion errors during offline batch push replay.
  - Data parsing type mismatches in `syncProcessor.ts` causing batch upsert failures for habit check-ins and transactions.
  - Infinite sync loops caused by non-atomic local cursor/timestamp persistence post-sync.
- **Mandatory Verification Checklist**:
  - [ ] Create/edit/delete items offline (notes, habits, finance), reconnect, verify automatic push transitions status from `pending` to `synced`.
  - [ ] Concurrently edit same item on web and offline mobile, sync, and verify conflict appears in `ConflictResolutionScreen`.
  - [ ] Delete item offline, sync, and verify `SyncTombstone` propagates to server and cleans up local tombstone record.
  - [ ] Create parent folder and nested note offline, sync, and verify correct creation order on server.

### `ChatScreen.tsx` (`/mobile/src/screens/main/ChatScreen.tsx` & `/mobile/src/services/useSocketChat.ts`)
- **Fragility Mechanism**:
  - Coordinated multi-layer keyboard positioning: `KeyboardAvoidingView` vertical offset combined with dynamic bottom padding toggling between keyboard inset and `useDockHeight()`.
  - Real-time WebSocket streaming state (`isStreaming`) interacting with optimistic message list rendering, auto-scrolling flat list refs, and tool confirmation modal prompts.
- **Past Regressions / Failure Modes**:
  - Message input capsule hidden/occluded behind virtual keyboard when typing.
  - Layout fight/overlap between floating dock, keyboard avoiding container, and multiline input capsule.
  - Auto-scroll jumping or breaking auto-stick to bottom during token streaming.
- **Mandatory Verification Checklist**:
  - [ ] Tap message input: keyboard opens, input capsule stays pinned directly above keyboard, and dock fades out completely.
  - [ ] Dismiss keyboard: input returns smoothly to resting position above dock height without layout jump.
  - [ ] Stream AI response: new tokens auto-scroll to bottom, prompt chips disappear, and tool confirmation modal triggers correctly.
  - [ ] Tap Mic icon in chat input bar: transitions cleanly to live waveform with level-reactive animation, and tapping X discards without sending; tapping checkmark completes transcript and populates input field.

---

## 9. Recent Fixes Log (rolling, capped)

> Short-term memory of intentional changes and bug fixes (newest first, max 15 entries).

- [Phase 8 Voice Input Affordance (Web & Mobile)]: Implemented 3-state inline voice input (Idle -> Recording -> Idle) directly inside chat input bar across Web and Mobile with zero backend infra — Web Speech API & Web Audio API AnalyserNode on web, on-device SpeechRecognizer adapter with volume metering on mobile, live audio-reactive waveform visualizer (VoiceWaveform), permission denial & empty-speech inline notices, and transparent downstream tool calling & confirmation parity.
- [Phase 7 Study Planner & Pomodoro Audit Pass]: Completed comprehensive documentation and Storybook audit — enriched Swagger/OpenAPI annotations with AI tool calling (`generate_study_plan` 8am–10pm free-time scanning & graceful fallback), SM-2 mathematical progression, pause/resume elapsed-time semantics, cascade deletion architecture, interval progression worked examples, and error schemas; added `SessionLinkPicker` Storybook stories, extended `NotificationPreferencesPanel` with `focusSessionAlerts` toggle, and enhanced `FocusSummaryChart` with screen-reader accessible data tables.
- [Mobile UI Overflow & Layout Fixes (Study & Focus)]: Removed redundant inner `<ScrollView>` from `StudyScreen` and `FocusScreen` (delegating cleanly to `ScreenContainer scrollable`), eliminating top content clipping; added `flexShrink: 1`, `ellipsizeMode="tail"`, `numberOfLines={1}`, and `minWidth: 0` to long subject badges (`topicSubjectBadge`), status pills, and topic card footers so priority pills (`HIGH`, `MEDIUM`) are no longer pushed off screen; updated `Modal.tsx` header to `alignItems: "flex-start"` with `minWidth: 0` so multi-line titles no longer crowd the close button; improved `PomodoroTimer` link banner and countdown text font scaling; made `TopicDetailModal`, `SessionHistoryList`, and `SessionLinkPicker` badges/titles robust against long text.
- [Mobile Port: Study Planner & Pomodoro Focus Timer (Phase 7 - Prompt 5)]: Ported Study Planner and Pomodoro Focus to mobile Expo/SQLite client — added local schema models and indexes for `subjects`, `topics`, `flashcards`, and `focus_sessions`; extended sync engine push/pull pipeline with 3-tier conflict resolution (progress-aware review event dedup for flashcards, Last-Write-Wins with notice flag for focus sessions, and cascade deletions for subjects and topics); built mobile `StudyScreen` with Daily Spaced Review Queue modal (`FlashcardReviewCard` with tap-first 0, 2, 4, 5 SM-2 rating mapping), `SubjectModal`, `TopicModal`, `TopicDetailModal`, and `FlashcardFormModal`; built mobile `FocusScreen` with `PomodoroTimer` (idle, working, break, paused states), `SessionLinkPicker` (polymorphic topic/goal link), and `SessionHistoryList` (following Finance transaction list precedent); implemented mobile client-side FR-8.4 Do Not Disturb suppression of non-critical notifications during active focus sessions; integrated `Study` and `Focus` tabs into `RootNavigator` and `FloatingDock`.
- [Pomodoro Focus Timer & Notification Integration (Phase 7 - Prompt 3)]: Implemented FR-8.1, FR-8.2, FR-8.4 Pomodoro focus session engine with accurate time accumulation math (excluding paused durations and preserving partial focus time on abandon), 4th cycle 15-min long break progression, client-triggered interval-completion notifications via Phase 2 notification engine, opt-in Do Not Disturb during active sessions, full Web FocusPage & PomodoroTimer (supporting idle, working, break, paused states), Storybook stories, and Mobile settings DND toggle.
- [AI Study Plan Generation & Tool Calling (Phase 7 - Prompt 2)]: Implemented FR-7.2/UC-2 AI study planner composing Phase 3's tool-calling pipeline with Calendar free-time detection (8am–10pm window) and prioritized topics; added generate_study_plan tool, confirm-before-write Calendar event generation with linkedTopicId, Web StudyPlanCard, Storybook stories, and end-to-end test suites.
- [Study Planner & SM-2 Spaced Repetition (Phase 7 - Prompt 1)]: Implemented core Subject/Topic/Flashcard data models, pure SuperMemo SM-2 spaced repetition scheduler in @lifeos/shared, cascade-deletion behavior on subjects, RESTful CRUD endpoints under /study, daily review queue, Web UI components, and Storybook stories.
- [Phase 6 OCR Audit & Fix]: Completed documentation and quality audit pass — enriched Swagger/OpenAPI annotations with supported MIME types, 10MB limit, raw vs structured extraction architecture, dual worked examples, error schemas, and cross-references; updated Storybook coverage with TransactionForm OCR prefill stories, NoteEditor OCR stories, and non-color warning cues for A11y.
- [Metro Bundler / Mobile ML Kit & ImagePicker]: Removed dynamic `await import()` of non-installed `@react-native-ml-kit/text-recognition` in `mobileOcrService.ts` and replaced deprecated `ImagePicker.MediaTypeOptions.Images` with `mediaTypes: ["images"]` in `useOcrCapture.ts` — fixed `Requiring unknown module "undefined"` runtime crash in Metro bundler.
- [Finance OCR Integration]: Implemented FR-6.2/UC-3 photographed receipt to structured transaction pre-fill — added heuristic receipt parser in @lifeos/shared, Web ReceiptPreviewCard & ReceiptScanModal (with 4 states), Mobile MobileReceiptPreviewCard & ReceiptScanModal, extended TransactionForm/TransactionFormModal with prefill & confidence cues, Storybook stories, and integration test suites.
- [Metro Bundler / Mobile OCR]: Changed `./apiClient.js` to `./apiClient` in `mobileOcrService.ts` and aligned `expo-image-picker` to `~16.0.6` — resolved Metro bundler module resolution error.
- [Focus & Study Planner Aggregation Layer (FR-7.4, FR-8.3)]: Implemented multi-stage MongoDB aggregations for focus summaries, polymorphic entity breakdowns, and sequential time-series trends; enriched topic detail view unifying accumulated focus time, scheduled AI plan events, and SM-2 flashcard deck metrics without redundant counters on Topic models.
- [Notes OCR Integration]: Implemented FR-5.3 photographed text to editable note pre-fill — shared OCR-to-ProseMirror converter, Web & Mobile 4-state scan flow, Storybook stories, and review cards with low-confidence cues.
- [OCR Extraction Pipeline]: Added shared on-device ML Kit & BullMQ Tesseract OCR pipeline with unified spatial & confidence schemas — unified OCR contract for Notes and Finance.
- [DashboardScreen]: Added `flexWrap` and `gap` to `DailySummaryCard` badges/items — fixed scheduled item layout overflow on narrow device widths.

---

## 10. Coding Conventions & Patterns

Standing codebase conventions to preserve consistency across web, mobile, and backend.

- **Voice Input Inline Affordance & STT Routing Protocol (FR-9.1, FR-9.2, FR-9.3)**:
  - Voice recording is entirely contained within the chat input bar across exactly 3 states (Idle -> Recording -> Idle). No separate modals, bottom sheets, or dedicated screens.
  - Zero backend STT requirement: transcription is processed purely client-side (Web Speech API SpeechRecognition on Web, on-device native SpeechRecognizer adapter on Mobile).
  - Waveform visualization renders real-time audio levels (Web Audio API AnalyserNode on web, live volume metering on mobile).
  - Tap-checkmark completes speech recognition and sets the message input state (`setInput(transcript)`), routing through the exact same WebSocket/REST chat send pipeline as typed text.
  - Destructive & write tool actions triggered via voice follow the exact same `ToolConfirmationModal` confirm-before-write pipeline without deviation; tapping cancel (`X`) discards recording with zero side effects.

- **Focus Time Aggregations & Downstream Analytics Protocol (FR-7.4, FR-8.3)**:
  - Aggregations (`GET /api/v1/focus/summary`) reuse Finance Phase 4 conventions (`range=day|week|month`, `month=YYYY-MM`, `startDate`, `endDate`) and compute server-side MongoDB aggregations across `FocusSession` documents (`$group` on `linkedType`, sum on `$totalFocusMinutes`, count on status).
  - Time-series trend generation fills sequential zero-minute dates across the entire selected date boundary `[startBound, endBound]` so frontend charts and Phase 9 downstream analytics consumers receive contiguous, gap-free data series without client-side imputation.
  - Polymorphic focus linkage (`linkedType: "topic" | "goal" | "task" | "none"` and string `linkedId`) is kept isolated; topic-specific focus time (`GET /api/v1/study/topics/:id/focus-time`) runs pure aggregations over `FocusSession` at read time without duplicate or denormalized counter fields on the `Topic` model.
  - Enriched Topic detail view (`GET /api/v1/study/topics/:id`) queries `Flashcard`, `FocusSession`, and `Event` (via `linkedTopicId`) in parallel (`Promise.all`), surfacing AI study plan events alongside actual logged focus sessions and flashcard review queues in a unified view (`TopicDetailModal`).

- **Pomodoro Focus Timer & Time Tracking Semantics (FR-8.1, FR-8.2, FR-8.4)**:

  - `accumulatedWorkSeconds` tracks raw seconds spent strictly in the `"work"` phase. When active in work phase, active elapsed duration is `(now - lastResumedAt) / 1000`. Pausing a session commits pending work time and clears `lastResumedAt` to `null`; resuming sets `lastResumedAt = new Date()`. Paused durations and break intervals are strictly excluded from `totalFocusMinutes`.
  - Abandoning a session early preserves partial accumulated focus time and records `completedAt = new Date()`, ensuring accurate historical productivity accounting without data loss.
  - Standard Pomodoro progression follows 25m work / 5m break cycles, switching to a 15m `long_break` on every 4th cycle. Break completions transition back to `"work"` on cycle `N + 1`.
  - Interval-completion alerts (FR-8.2) are client-timed triggers calling `POST /api/v1/focus/sessions/:id/interval-complete` when countdown reaches 0, which enqueues notifications through Phase 2's `enqueueJob` and the `focusSessionAlerts` preference module.
  - Opt-in Do Not Disturb (`dndDuringFocus: true` in user notification preferences or session configuration) suppresses non-critical notification delivery (e.g. general calendar reminders, habit nudges) strictly while an active focus session is running, while preserving focus session interval alerts and critical system messages.

- **AI-Generated Study Plan & Free-Time Allocation (FR-7.2, UC-2)**:
  - Study plan generation computes free time gaps within an 8am–10pm working hours window using Calendar's read-time recurrence expansion (`expandRange`), combines them with active topics pre-sorted by deadline proximity and priority, and leverages `callAI()` for structured JSON allocation with deterministic heuristic fallback.
  - Follows Phase 3's confirm-before-write paradigm: plans are proposed in chat / `ToolConfirmationModal` / `StudyPlanCard` and only written to `Event` documents (linked via `linkedTopicId`) upon explicit user confirmation; cancellation creates zero database side effects.
  - When no free time is available or no active topics exist, the assistant returns uncertainty signaling messages rather than proposing empty/broken plans.
- **Study Planner & Cascade Deletion Precedent (FR-7.1, FR-7.3)**:
  - Unlike Notes (where deleting a folder reassigns notes to root because notes possess standalone semantic value), deleting a `Subject` **cascade-deletes** all child `Topic`s and associated `Flashcard`s because study items have no meaning without subject context.
  - Spaced repetition scheduling is computed strictly through the deterministic, pure `calculateNextReview` SM-2 function in `@lifeos/shared`, enforcing minimum 1.3 easeFactor clamping and standard 0–5 quality self-assessment ratings.
  - Due flashcards query (`GET /api/v1/study/flashcards/due`) selects `nextReviewDate <= now` sorted ascending (most overdue first).
- **Finance Receipt OCR Pre-Fill & Confirmation Pattern (FR-6.2, UC-3)**:
  - Photographed receipts route through the unified OCR extraction pipeline (`parseReceiptOcr`), extracting structured fields (`merchant`, `amount`, `date`, `category`, and line items) alongside per-field confidence scores without routing through LLMs.
  - Low-confidence fields (<0.7) trigger amber warning cues in `ReceiptPreviewCard`, `MobileReceiptPreviewCard`, and the confirmation forms (`TransactionForm` and `TransactionFormModal`), requiring explicit user review before submission.
  - Scanned receipts do not create persistent OCR models; once confirmed, they execute standard `POST /api/v1/finance/transactions` (web) or SQLite `financeRepo.createTransaction` (mobile), triggering the exact same category normalization and budget recalculation hooks as manual entries.
- **Notes OCR Pre-Fill & Ephemeral Draft Pattern**:
  - OCR-created notes convert extracted text into standard ProseMirror JSON documents with first-line title heuristics (or fallback `"Scanned note — YYYY-MM-DD"`) and surface low-confidence line cues (<0.7) for inline user correction.
  - Pre-filled drafts remain ephemeral until saved through the standard `POST /api/v1/notes` endpoint without custom or leftover OCR flags.
- **Unified OCR Pipeline & Confidence Retention**:
  - All OCR extraction (mobile on-device ML Kit or backend fallback via Tesseract/BullMQ) MUST return the unified `OcrExtractionResult` (`extractedText`, `confidence` 0.0-1.0, `source: "on_device" | "server_fallback"`, `blocks` with `boundingBox` and `lines`).
  - Never discard block/line-level confidence scores or spatial bounding box geometry; downstream confirmation UIs (Notes and Finance) rely on these signals to flag uncertain fields for user review.
  - Server OCR fallback endpoint (`POST /api/v1/ocr/extract`) enforces 10MB size limit, validates image MIME types (rejecting with 400 Bad Request), and gates calls behind Redis tier rate limits (`ratelimit:ocr:${userId}:${dateStr}`).
- **Keyboard Avoidance for Input Screens**:
  - Combine `KeyboardAvoidingView` (`behavior={Platform.OS === "ios" ? "padding" : undefined}`) with `Keyboard.addListener` ("keyboardWillShow"/"keyboardWillHide" on iOS, "keyboardDidShow"/"keyboardDidHide" on Android).
  - Dynamically toggle bottom container padding between keyboard safe inset and `useDockHeight()`. See [ChatScreen.tsx](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/src/screens/main/ChatScreen.tsx) and [ScreenContainer.tsx](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/src/components/ui/ScreenContainer.tsx).
- **Dynamic Dock Bottom Clearance (`useDockHeight`)**:
  - Always use `useDockHeight(extraPadding)` exported from `FloatingDock.tsx` or wrap screens with `ScreenContainer` using `includeDockPadding={true}`.
  - Apply to `contentContainerStyle.paddingBottom` for scrollable views (`ScrollView`, `FlatList`). Never hardcode static pixel values for bottom spacing. See [FloatingDock.tsx](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/src/navigation/FloatingDock.tsx).
- **Zustand Store Slice Conventions**:
  - Define explicit TypeScript `State` interface, export hook named `use<Domain>Store = create<DomainState>((set, get) => ({ ... }))`, use granular setters, and split stores domain-by-domain rather than one monolithic store. See [authStore.ts](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/src/store/authStore.ts) and [syncStore.ts](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/src/store/syncStore.ts).
- **Error Handling & Logging Conventions**:
  - **Backend (`/api/src/services`)**: Use structured Pino logger (`import { logger } from "../logger.js"`). Pass contextual objects (`logger.error({ err, userId, category }, "message")`), throw domain errors caught by central `errorHandler.ts`. See [budgetService.ts](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/api/src/services/budgetService.ts).
  - **Mobile (`/mobile/src/services`)**: Intercept 401s for silent JWT refresh in `apiClient.ts` with single-flight mutex (`refreshPromise`). In background workers (`syncEngine.ts`), catch and handle async exceptions (`.catch(() => {})`) to avoid crashing the JS runtime, and record errors in Zustand stores. See [apiClient.ts](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/src/services/apiClient.ts).
- **Component Memoization & Performance**:
  - Wrap pure subcomponents and animated children in `React.memo()`.
  - Wrap callbacks passed to child/animated elements in `useCallback()`.
  - Extract static style/gradient arrays outside render functions to avoid re-allocation thrash. Drive 60fps animations via Reanimated worklets and shared values without triggering React renders. See [FloatingDock.tsx](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/src/navigation/FloatingDock.tsx).

---

## 11. Environment & Config Reference

Standing environment variables (names only) and system ports across workspaces.

- **Required Environment Variables**:
  - **Backend (`/api`)**: `NODE_ENV`, `PORT` (default 4000), `MONGO_URI`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `AI_PROVIDER_ORDER`. Optional: `MISTRAL_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_VISION_API_KEY`, `SENTRY_DSN`, `RESEND_API_KEY`, `POSTMARK_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SWAGGER_ALLOWED_IPS`.
  - **Frontend Web (`/web`)**: `VITE_VAPID_PUBLIC_KEY`. Optional: `VITE_SENTRY_DSN`.
  - **Mobile (`/mobile`)**: `EXPO_PUBLIC_API_URL` (optional override; defaults to auto-detecting host machine IP over Wi-Fi or `http://localhost:4000/api/v1` via USB `adb reverse`).
- **System Ports Overview**:
  - `4000`: Express API REST & WebSocket server.
  - `5173`: Vite Web application dev server.
  - `8081`: Expo Metro bundler for React Native.
  - `27017`: MongoDB database container / local instance.
  - `6379`: Redis cache & Bull queue container / local instance.
- **Local Secrets vs. EAS Build Secrets**:
  - Local development loads secrets from workspace `.env` files (git-ignored) or shell variables.
  - EAS Build mobile secrets must be configured via `npx eas-cli secret:create` or in the Expo EAS dashboard, injected during cloud APK/AAB build steps without committing `.env` files into source control.
