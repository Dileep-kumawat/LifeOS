# LifeOS System Memory & Architecture Map

> **Token-Optimized Project Blueprint for AI Agents**  
> Maintainer Notice: When completing new features, schemas, or modules, follow the update protocol in [Section 7](#7-memory-maintenance-protocol-for-ai-agents).

---

## 1. High-Level Architecture & Tech Stack

- **Monorepo Architecture**: `npm` Workspaces (`api`, `web`, `mobile`, `packages/shared`).
- **Backend (`/api`)**: Node.js 22 LTS, Express + TypeScript, Mongoose (MongoDB), Redis (Caching/BullMQ/Socket.IO adapter), Zod, Pino logging, Passport.js (JWT Access + Refresh tokens, Google OAuth 2.0 & ID Token verification), Swagger (`/api/v1/docs`, 127 routes documented), Sentry, Helmet security headers, auditService.
- **Frontend Web (`/web`)**: React 18 + Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query, React Router v6 with dynamic `React.lazy()` route splitting & `<Suspense>` boundaries (`RouteLoadingFallback`), TipTap & Recharts chunk isolation, Google Sign-In button (`GoogleSignInButton`), Connected Accounts management in Settings, Web Speech API + Web Audio API inline Voice Input (`useWebVoiceInput`, `VoiceWaveform`), PrivacyPolicyModal, Storybook (50+ stories), Sentry, `rollup-plugin-visualizer` bundle reporting (`web/BUNDLE_REPORT.md`).
- **Mobile (`/mobile`)**: Expo SDK 52 (React Native), TypeScript, React Navigation with Instagram-style Swipeable Activity Pager (`ActivityPager.tsx`) synced in real-time two-way lock-step with dynamic Floating Sliding Dock (`FloatingDock.tsx`, `useDockHeight` clearance hook, `BlurView`, `LinearGradient` edge fade masks, Reanimated spring physics, fixed static center indicator with proximity-driven transforms, gesture horizontal scrolling with auto-centering, single-fire haptic feedback, memoized subcomponents), Google Sign-In button (`GoogleSignInButton`), On-device Speech Recognizer & inline Voice Input (`useMobileVoiceInput`, `mobileVoiceService`, `VoiceWaveform`), SQLite local storage, EAS Build, Sentry.
- **Shared Package (`/packages/shared`)**: Shared Zod schemas, TypeScript types, design system tokens, and utility functions.
- **Infra & DevOps**: Docker Compose (`mongo`, `redis`, `api`), GitHub Actions CI (`ci.yml`, `backup-verification.yml`, `deploy-staging.yml`).

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
│   │   ├── models/        # Mongoose schemas (User, Event, Habit, Note, Finance, AI, Sync, AuditLog, etc.)
│   │   ├── routes/        # API v1 routes (auth, calendar, finance, goals, habits, notes, sync, admin, etc.)
│   │   └── services/      # AI (RAG, embeddings), Sync engine, Google Calendar, auditService
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
│   │   ├── navigation/    # RootNavigator, ActivityPager (swipeable sync) & FloatingDock (sliding dynamic navigation)
│   │   ├── screens/       # Auth & Main screens (Dashboard, Calendar, Finance, Habits, Notes, Chat, ConflictResolution)
│   │   ├── store/         # Mobile Zustand state
│   │   └── services/      # API client & offline sync engine
│   └── eas.json           # EAS Build configuration (preview, production profiles)
├── packages/
│   └── shared/            # Monorepo shared package
│       ├── src/
│       │   ├── schemas/   # Zod validation schemas (auth, calendar, finance, habits, notes, sync, audit)
│       │   └── tokens/    # Design system tokens & color definitions
├── scripts/               # Backup, recovery, and load-test tooling
│   ├── backup/            # Automated snapshot creation and AES-256-GCM encryption
│   ├── restore/           # PITR restore and forensic verification suite
│   ├── load-test/         # Socket.IO concurrency benchmarking and telemetry monitoring
│   └── check-openapi-coverage.ts # OpenAPI 3.0.3 route coverage checker
├── docs/                  # Launch readiness reports, architecture audits, and release checklists
│   ├── PHASE10_LAUNCH_READINESS.md # Full 13-section launch readiness assessment
│   ├── LAUNCH_CHECKLIST.md         # Operational release verification checklist
│   ├── PERF_INDEX_AUDIT.md         # Full 27-model database index performance audit
│   └── SYNC_ENGINE_NOTES.md        # Offline sync engine architecture, lifecycle & scaling analysis
├── .env.example           # Audited template of all environment variables across workspaces
├── DISASTER_RECOVERY.md   # MongoDB Atlas continuous PITR and disaster recovery runbook
├── PRIVACY_POLICY.md      # GDPR & India DPDP data policy and third-party AI provider disclosures
├── docker-compose.yml     # Local orchestration (MongoDB + Redis + API)
├── AGENTS.md              # Domain skills & agent instructions
└── DESIGN.md              # Design tokens & visual guidelines
```

---

## 3. Data Models & Database Schemas (`/api/src/models`)

- **Security & Audit**:
  - `AuditLog`: Immutable, tamper-resistant security audit trail (`timestamp`, `actorId`, `actorRole`, `actorEmail`, `action`, `resourceType`, `resourceId`, `targetUserId`, `outcome`, `reason`, `ipAddress` [anonymized], `userAgent`, `requestId`, `metadata` [redacted], `expiresAt` with MongoDB TTL index).
- **Auth & User**:
  - `User`: Core profile, optional `passwordHash` (null for OAuth-only users), `googleId` (sparse indexed), email, name, role (`user`/`admin`), status (`active`/`suspended`/`pending_deletion`), emailVerified, preferences, tier settings.
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
  - `Recommendation`: Periodic weekly/monthly AI-generated performance recommendations grounded in productivity & finance metrics (FR-10.3).
  - `Notification` & `PushSubscription`: System alerts & Web Push / Mobile Push endpoints.

---

## 4. API Endpoints Overview (`/api/src/routes`)

- `/api/v1/health` - Health check & system status.
- `/api/v1/auth` - User registration, login, token refresh, logout, `/me`, password reset, account deletion.
- `/api/v1/auth/export` - Complete user data portability export in structured JSON (GDPR Art. 20 / India DPDP Sec. 11), strictly excluding secrets, Redis rate-limited (5 req/hr), audited as `SENSITIVE_DATA_EXPORT`.
- `/api/v1/auth/google` - Google OAuth ID token verification (POST) & browser authorization initiation (GET).
- `/api/v1/auth/google/callback` - Browser OAuth callback handler redirecting with session tokens.
- `/api/v1/auth/google/link` - Explicit authenticated Google account linking (POST) & unlinking (DELETE).
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
- `/api/v1/analytics/productivity` - Aggregated productivity metrics (habits completion rate, focus summary, streak consistency, contiguous daily trends) over custom date range (FR-12.1).
- `/api/v1/analytics/finance` - Aggregated financial breakdown, multi-month/daily spend trend, and budget adherence over custom date range (FR-12.2).
- `/api/v1/analytics/export` - Synchronous raw CSV and PDF analytics report generation (rate-limited via Redis, raw binary/text attachments) (FR-12.4).
- `/api/v1/notifications` - Alert feed, push subscriptions (VAPID/Expo push).

- `/api/v1/sync` - Delta sync engine, conflict detection, tombstone tracking.
- `/api/v1/ai/chat` - AI assistant conversational interface (RAG enabled).
- `/api/v1/ai/summary` - Automated daily & weekly life performance summaries.
- `/api/v1/ai/recommendations/latest` - Latest generated periodic recommendation (weekly or monthly cadence) with grounded metrics (FR-10.3).
- `/api/v1/ai/recommendations/:id` - Historical recommendation lookup by document ID.
- `/api/v1/ocr/extract` - Shared server-side OCR extraction (Tesseract fallback, BullMQ queue, 10MB limit, rate limited).
- `/api/v1/ocr/extract/:jobId` - Polling status and result retrieval for async OCR extraction jobs.
- `/api/v1/admin/users` - Admin user directory search and paginated listing with role, status, and subscription tier filters (NFR-2.6).
- `/api/v1/admin/users/:id` - Admin user profile retrieval with sensitive field inspection.
- `/api/v1/admin/users/:id/status` - Admin user account suspension and reactivation.
- `/api/v1/admin/users/:id/role` - Admin role elevation or demotion.
- `/api/v1/admin/users/:id/subscription` - Admin subscription tier assignment.
- `/api/v1/admin/users/:id/purge` - Admin permanent user account purge and cascade deletion.
- `/api/v1/admin/users/:id/finance` - Admin inspection of user financial records (audited access).
- `/api/v1/admin/audit-logs` - Admin security audit log query with actor, target, date, outcome, and action filtering (30 req/min).

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
npm run check:openapi   # OpenAPI coverage validation (127 routes documented)
npm run build-storybook --workspace=web # Build static Storybook UI documentation
npm run test:ws-smoke --workspace=api   # WebSocket smoke test

# Mobile EAS Build
cd mobile && npx eas-cli build -p android --profile preview

# Database Backup, Recovery & Index Maintenance
npx tsx scripts/backup/backup.ts                               # Create full encrypted/compressed snapshot with manifest
npx tsx scripts/restore/restore.ts --archive=<path>            # Restore into isolated database (lifeos_recovery)
npx tsx scripts/restore/pitr-recovery.ts                        # Run controlled Point-in-Time Recovery test
npx tsx scripts/restore/verify-recovery.ts --db=lifeos_recovery # Verify application compatibility against restored DB
npx tsx scripts/db/create-indexes.ts                           # Apply recommended compound performance indexes idempotently
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

### `FloatingDock.tsx` & `ActivityPager.tsx` (`/mobile/src/navigation/`)
- **Fragility Mechanism**:
  - Dual-purpose scroll state: a single horizontal `ScrollView` / `scrollX` Reanimated shared value drives continuous visual scaling/opacity transforms while scroll settling triggers discrete React Navigation route changes.
  - Two-way lock-step synchronization: `scrollX` is shared between content pager (`ActivityPager.tsx`) and dock (`FloatingDock.tsx`). Content swiping drives dock's `ScrollView` offset via UI-thread `scrollTo` in `useAnimatedReaction`; dock dragging drives content pager `translateX`. Scroll handler must ignore scroll events when `isContentSwiping.value` is true to prevent feedback loops.
  - Gesture arbitration: Pager's horizontal `Gesture.Pan()` must enforce `activeOffsetX([-15, 15])` and `failOffsetY([-15, 15])` to yield immediately to vertical list scrolls in `ScreenContainer`, and must be disabled (`.enabled(!isKeyboardVisible)`) while virtual keyboard is open to avoid conflicts with text selection.
  - Race conditions between programmatic `scrollTo` and manual gestures: programmatic navigation scrolls can re-trigger intermediate navigation events if `isProgrammaticScrollRef` guard is missing or cleared prematurely.
  - Multi-tab hop flicker: jumps $> 1.5 \times \text{ITEM\_WIDTH}$ must bypass intermediate screen animations to prevent screen flash/mount thrash.
  - Keyboard visibility lifecycle: conditionally unmounting the dock on keyboard open wipes `scrollX` and internal refs back to 0; the dock must remain mounted and toggle visibility via Reanimated opacity/transform and `pointerEvents` instead.
  - Side-padding & geometry math: side padding `(dockWidth - ITEM_WIDTH) / 2` and snap intervals must align with screen width so edge items (1st and last) can reach the static center indicator.
- **Past Regressions / Failure Modes**:
  - Mount jump and pop-snapback animation glitch caused by synchronous `scrollX` writes during render and unmemoized subcomponents.
  - Intermediate screen flicker/flashing when tapping distant dock icons (e.g. jumping 3+ tabs across).
  - Active indicator resetting to first route (Dashboard) upon dismissing virtual keyboard on other tabs.
  - Screen content occlusion when tab views lacked dynamic bottom clearance.
  - Static label pill staying visible indefinitely rather than auto-fading after navigation settle.
- **Mandatory Verification Checklist**:
  - [ ] Tap non-adjacent tabs (1st to 5th): destination mounts immediately without flying through intermediate screens; intermediate screens do NOT mount/flicker.
  - [ ] Swipe/drag dock horizontally: snaps cleanly to nearest icon with single haptic tick and navigates to settled screen; content pager follows in real time.
  - [ ] Swipe content left/right: dock indicator, label pill, and haptic all match dock's existing drag behavior; partial swipe snaps back without navigation.
  - [ ] Boundary swipes at tab 0 or N-1: rubber-bands with resistance, does not wrap or crash.
  - [ ] On input screens (Chat/Assistant): focus text input, confirm dock fades out, pager gesture is disabled during typing/selection; dismiss keyboard, confirm dock fades in and retains CURRENT active route icon.
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

- [Cross-User Access, Concurrency & Rate-Limiter Integration Test Suite]: Added comprehensive integration test suite (`crossUserAccessSecurity.test.ts`, 34 tests) validating IDOR/BOLA cross-user isolation across 9 core resources (events, transactions, habits, goals, notes, subjects, topics, flashcards, focus sessions; asserting generic 404 responses on read/update/delete attempts by non-owner authenticated users); verified `CROSS_USER_ACCESS_ATTEMPT` audit logging behavior (active on transactions GET/PATCH/DELETE and notes GET, while identifying audit coverage gaps on remaining routes); verified refresh token rotation under concurrency with apiClient-equivalent single-flight mutex deduplication; verified rate limiter boundaries on `/auth/login` and `/auth/register` (5 req / 15m window, 6th attempt rejected with 429 and Retry-After header, window reset verified after simulated time expiry); all 42 test suites passing (421 tests).
- [Unit Testing Core Business Logic & Analytics Pro-Ration]: Added 56 deterministic unit tests across SM-2 spaced repetition (studySm2.test.ts - progression, quality 0 reset, 1.3 EF floor, nextReviewDate interval growth), Pomodoro focus tracking (focusService.test.ts - pause/resume/complete timing, mid-cycle abandon, break exclusion), habit streaks (streak.test.ts - daily/weekly quotas, missed days, gap recovery, date helpers), and finance analytics (financeAnalyticsLogic.test.ts - category case normalization, budget adherence, habit pro-ration across date windows, zero-fill trends); resolved case-variant budget accumulation bug in financeAnalyticsService.ts; test suite grew from 331 to 387 passing tests (41 suites, 0 failures, 0 TypeScript errors).
- [Offline Sync Engine Architecture & Scaling Audit]: Completed exhaustive audit of mobile SQLite sync engine (mobile/src/services/syncEngine.ts) and backend processor (api/src/services/sync/syncProcessor.ts); documented delta computation, per-module 3-way merge rules, and tombstone lifecycle in docs/SYNC_ENGINE_NOTES.md; proved conflict resolution is per-entity delta-only (not full-table diff) and modeled scaling costs at 1k/10k/100k records; confirmed SyncTombstones accumulate indefinitely and designed BullMQ pruning job (sync_tombstone_prune) reusing enqueueJob with 30-day sliding window; identified critical asymmetric deletion bugs (mobile hard-deletes in SQLite and web REST deletes without tombstones); outlined prioritized roadmap (P0-P2).
- [Web Bundle Optimization & Route Splitting]: Analyzed production bundle using rollup-plugin-visualizer; resolved monolithic 1,866.42 kB (517.06 kB gzip) single bundle by converting heavy routes to React.lazy() and <Suspense> with design-token-aligned RouteLoadingFallback (variant-specific skeletons for editor, analytics, and OCR scanning); isolated Notes Editor (TipTap/ProseMirror ~404.5 kB), Analytics Dashboard (Recharts ~395.9 kB), and OCR Receipt Scan flow (/finance/scan, ReceiptScanModal, NotesScanModal ~38.8 kB) into on-demand chunks; achieved 68.2% reduction in initial entry JS bundle (1,866.42 kB -> 593.48 kB) and 66.1% reduction in gzipped payload (517.06 kB -> 175.52 kB); published comprehensive before/after analysis report to web/BUNDLE_REPORT.md; verified 100% test pass rate (15 tests), 0 TypeScript errors, 0 ESLint errors, and clean static Storybook compilation.
- [Read-Through Caching for Expensive Analytics & Focus Reads]: Implemented fault-tolerant read-through caching in api/src/services/cache/readThroughCache.ts reusing singleton Redis client (api/src/db/redis.ts) for GET /api/v1/analytics/productivity, GET /api/v1/analytics/finance, and GET /api/v1/focus/summary keyed by (userId, startDate, endDate) with 5-minute TTL (300s); gracefully handles Redis connection failures with automatic direct aggregation fallback and logger.warn; instrumented cache hit/miss counters in Pino structured telemetry (logger.info); documented synchronous invalidation tradeoff in code comments given 5-minute window and absence of write domain events; verified habit streak statistics remain cached on Habit documents at write-time and read paths consume cached fields without live recomputation; added 4 unit tests (readThroughCache.test.ts) and 4 route integration tests (analytics.test.ts, focus.test.ts) with 100% pass rate (39 test suites, 331 tests passing) and 0 TypeScript errors.
- [MongoDB Performance Index Audit & Idempotent Migration]: Completed full 27-model index audit against Express routes and services; analyzed analytics aggregations (capped <= 366 days), CRUD patterns, and topic detail views (Flashcard + FocusSession + Event); documented findings in docs/PERF_INDEX_AUDIT.md; added idempotent migration script scripts/db/create-indexes.ts applying 13 compound performance indexes across events, transactions, habitcheckins, focussessions, notes, flashcards, topics, goals, and notifications; verified execution against local MongoDB with db.collection.getIndexes() confirming index presence and 0 errors across monorepo tests and typechecks.
- [Swipeable Activity Pager & FloatingDock Two-Way Sync]: Implemented Instagram-style swipeable activity pager across main screen content (`ActivityPager.tsx`) coupled in real-time two-way synchronization with floating sliding dock (`FloatingDock.tsx`) via shared Reanimated `scrollX` value; content swipe drives dock scroll position on UI thread via `useAnimatedReaction` with `scrollTo` while dock drag directly drives content translation in real time; configured gesture arbitration with `activeOffsetX([-15, 15])` and `failOffsetY([-15, 15])` to grant nested vertical scrolling instant precedence and disabled content pan gesture during open keyboard (`.enabled(!isKeyboardVisible)`) to eliminate typing/selection conflicts; added 0.25 boundary resistance rubber-banding at edges (tabs 0 and N-1); eliminated multi-tab jump flicker (>1.5 item width hops) via direct positioning; created `createActivityTabNavigator` typed wrapper over React Navigation's `TabRouter`; verified 13 automated unit/integration tests (`activityPagerSync.test.ts`) and 0 TypeScript errors monorepo-wide.
- [Phase 10 Final Launch Readiness, Verification & Traceability Pass]: Completed comprehensive full-system launch audit and verification pass; generated complete 13-section launch readiness assessment (`docs/PHASE10_LAUNCH_READINESS.md`) with requirement traceability across FR-1.1, FR-1.6, NFR-1.3, NFR-2.1–2.6, NFR-3.3, NFR-6.1, NFR-6.2; created 7-section operational sign-off checklist (`docs/LAUNCH_CHECKLIST.md`); created audited root and API environment configuration templates (`.env.example`) with zero leaked secrets; verified 100% route coverage via OpenAPI check (127 of 127 routes documented); built static Storybook site (50+ stories, 0 errors); executed full monorepo automated verification suite with 100% pass rate (57 test files, 427 tests passing, 0 failures), 0 TypeScript errors across all 4 workspaces, and 0 ESLint errors; established launch verdict YELLOW (READY WITH CONDITIONS) pending formal external legal review and staging distributed load testing.
- [Phase 10 Production Database Backup & PITR Verification (NFR-3.3)]: Implemented and verified dual-tier database disaster recovery architecture; established MongoDB Atlas Continuous Cloud Backup policy specification with 1-minute PITR window over 7 days, 35-day snapshot retention, and AWS KMS encryption; implemented core backup and restore engine in `api/src/services/backup/` (`backupConfig`, `backupService`, `restoreService`) and CLI tooling (`scripts/backup/`, `scripts/restore/`) with SHA-256 integrity checksums, AES-256-GCM encryption/decryption, JSON metadata manifests, retention pruning, and strict production overwrite guards (`validateRestoreTargetSafety`); executed live controlled Point-in-Time Recovery test restoring pre-incident state to isolated database `lifeos_pitr_recovery`, proving 100% pre-target data retention and 100% absence of post-target corrupted records; verified full application compatibility across Mongoose models, bcrypt authentication, note/habit queries, financial aggregations, AI conversation history, and 27-model indexes; created 11 automated unit/integration tests (`backupRecovery.test.ts`); published comprehensive 9-section disaster recovery runbook (`DISASTER_RECOVERY.md`); created scheduled weekly CI verification workflow (`backup-verification.yml`); verified 100% test pass rate, 0 type errors, 0 lint errors, and 127-route OpenAPI documentation.
- [Phase 10 GDPR/India DPDP Compliance Pass (NFR-6.1, NFR-6.2, FR-1.6)]: Implemented and verified comprehensive data protection, portability, and deletion architecture; built complete 27-model data inventory; implemented `GET /api/v1/auth/export` via `userDataExportService` querying all 25 user-owned collections in parallel with secret exclusion, Redis-backed rate limiting (5 req/hr), attachment streaming, and `SENSITIVE_DATA_EXPORT` audit logging; implemented complete 30-day cascade purge engine via `purgeUserData` and `purgeEligibleAccounts` removing user records from all 25 collections, cleaning up BullMQ jobs in `jobsQueue` & `accountPurgeQueue`, deleting `User`, while retaining immutable `AuditLog` until statutory 90-day TTL expiry; made raw AI log retention configurable via `AI_LOG_RETENTION_DAYS`; published comprehensive `PRIVACY_POLICY.md` with explicit third-party AI fallback disclosure (Mistral -> Groq -> Gemini), free-tier training vs enterprise ZDR distinctions, and legal review placeholders; added Web `PrivacyPolicyModal` & data export button in `SettingsPage`; added Mobile privacy & danger zone deletion cards in `SettingsScreen` with `authApi.exportData` & `authApi.deleteAccount`; created 12 automated compliance integration tests (`compliance.test.ts`) covering all vectors with simulated 30-day time boundaries; verified 100% test pass rate across 37 test files (310 passing tests), 0 type errors, 0 lint errors, and 127-route OpenAPI documentation.
- [Phase 10 Production Audit Logging System (NFR-2.6)]: Implemented dedicated, tamper-resistant security audit logging architecture distinct from operational logging and error monitoring; created `AuditLog` Mongoose model with Mongoose pre-hook immutability guards (blocking updates, deletes, replacements) and MongoDB TTL index (90-day retention); created `auditService` with deterministic IP anonymization (`anonymizeIp`), recursive secret/PII redaction (`sanitizeAuditMetadata`), and correlation tracking; instrumented admin surface (`/api/v1/admin/users*`, `/api/v1/admin/audit-logs`) with Redis-backed rate limiters (60/min and 30/min) and 100% OpenAPI 3.0.3 documentation; instrumented sensitive operations (`ADMIN_LOGIN`, `ACCOUNT_DELETION_SCHEDULED`, `SENSITIVE_DATA_EXPORT`, `ADMIN_ACCESS_DENIED`, and IDOR cross-user access attempts with `OWNERSHIP_MISMATCH` returning 404); achieved 100% test pass rate across 55 test files (404 passing tests, 0 failures), 0 TypeScript errors, 0 lint errors, and 125 documented routes.
- [Mobile Auth UI Cleanup]: Removed Continue with Google and Sign up with Google buttons and dividers from mobile LoginScreen and RegisterScreen UI while keeping the underlying OAuth client services, API routes, and token storage logic intact; verified 0 TypeScript errors and 100% mobile test pass rate (91 tests).
- [Phase 10 OWASP Top 10 Full Security Audit & Remediation (NFR-2.4)]: Performed comprehensive codebase security audit and code/test remediations across all 10 OWASP categories; fixed BOLA/IDOR vulnerability in `GET /api/v1/ocr/extract/:jobId` by storing and strictly matching `userId` on async OCR job records; eliminated WebSocket AI rate-limit bypass by enforcing `checkAiRateLimit` and subscription tier daily ceilings directly on `send_message` in `chatSocket.ts`; installed `helmet` and mounted comprehensive HTTP security headers (HSTS, Frameguard `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP compatible with Swagger UI); implemented Redis-backed rate limiters for `registerRateLimiter` (5/15m), `forgotPasswordRateLimiter` (3/15m), `resetPasswordRateLimiter` (5/15m), `refreshRateLimiter` (60/15m), and baseline `generalApiRateLimiter` (120/min); verified zero SSRF attack surface across outbound providers; confirmed Mongo operator injection rejection across Zod schemas; created dedicated `securityAudit.test.ts` (17 tests covering IDOR, BOLA, injection, rate limiting, and security headers); achieved 100% test pass rate across 52 test files (379 passing tests), 0 type errors, 0 lint errors, and 117-route OpenAPI coverage.
- [Phase 10 Google OAuth Authentication (FR-1.1)]: Implemented Google OAuth 2.0 and ID token verification as a first-class authentication method while preserving existing JWT short-lived access token + rotating refresh token session architecture; added `googleAuthService` validating cryptographic signatures, issuer, audience, and email verification against configured client IDs with swappable mock verifier adapter; added sparse indexing on `User.googleId` and made `passwordHash` optional (`null` for OAuth-only users); added explicit account linking (`POST /api/v1/auth/google/link`), unlinking with account lockout guard (`DELETE /api/v1/auth/google/link`), and unauthenticated email collision rejection (`409 Conflict - AccountLinkingRequired`); added complete OpenAPI 3.0.3 documentation (117 routes covered); implemented Web `GoogleSignInButton`, Storybook stories, OAuth query param handlers in `LoginPage`/`RegisterPage`, and "Connected Accounts" card in `SettingsPage`; implemented Mobile `GoogleSignInButton`, `authApi` methods, and login/register integration; updated structured logging with redaction for ID tokens, passwords, refresh tokens, and cookies; achieved 100% test pass rate (20 backend unit/integration tests, 8 mobile tests, 361 monorepo tests).
- [Phase 9 Analytics & Periodic Recommendations Audit Pass]: Completed comprehensive Swagger, OpenAPI, and Storybook audit pass — tagged all routes under `Analytics` and `AI` with explicit cross-references; thoroughly documented raw binary PDF (`application/pdf`) and CSV (`text/csv; charset=utf-8`) export streams with RFC 6266 `Content-Disposition` attachments, Redis rate limiting (20 req/hr), and full component schemas for Productivity, Finance, and Recommendations; verified `AnalyticsChart` (bar/line/empty/loading), `DateRangePicker`, `ExportButton`, and `PeriodicRecommendationsCard` Storybook stories with `@storybook/addon-a11y` and semantic data tables / mobile accessibility roles; confirmed `periodicRecommendations` preference toggles on web and mobile; verified 100% passing tests (342 tests across 47 suites), static Storybook build, and 112-route OpenAPI schema check.
- [Phase 10 Periodic Recommendations (FR-10.3) — Weekly & Monthly Cadences]: Implemented recurring scheduled AI recommendation engine composing Phase 3's `callAI()` with Phase 9's `getProductivityAnalytics` & `getFinanceAnalytics` and Phase 2's `scheduleNotification` notification delivery; added BullMQ recurring dispatcher checking weekly (Sundays at 08:00) and monthly (1st of month at 08:00) user cadences with dedupe keys; created `Recommendation` mongoose model with compound unique indexes; exposed `GET /api/v1/ai/recommendations/latest` and `GET /api/v1/ai/recommendations/:id` with OpenAPI 3.0.3 documentation; built web `PeriodicRecommendationsCard` (with Weekly/Monthly switcher, loading/error/scheduled states, Notion calm palette, and Storybook coverage) and mobile `PeriodicRecommendationsCard`; added `periodicRecommendations` push/in-app notification preference toggles across web and mobile; achieved 100% test coverage with 9 unit/integration tests and monorepo typecheck/build verification.
- [Phase 9 Analytics Dashboard UI (Web & Mobile)]: Implemented unified Analytics Dashboard UI across Web (React) and Mobile (Expo React Native) — built executive multi-domain dashboard (Productivity vs Finance), shared Recharts (Web) and React Native SVG (Mobile) AnalyticsChart component supporting bar and line variants with accessibility fallback tables and zero-data states, shared DateRangePicker with presets (This Week, This Month, Last 3 Months, Custom bounded <= 366 days), ExportButton (Web) and ExportActionModal (Mobile) with CSV/PDF triggers, native file download and Share sheet integration with rate-limit handling, registered /analytics in web routing & navigation sidebar and mobile FloatingDock / RootNavigator, added Storybook stories, and verified 100% passing tests across web and mobile.

---

## 10. Coding Conventions & Patterns

Standing codebase conventions to preserve consistency across web, mobile, and backend.

- **Read-Through Caching & Invalidation Architecture**:
  - **Singleton Redis Reuse**: `getOrSetCache<T>(key, ttl, fetchFn)` in `api/src/services/cache/readThroughCache.ts` strictly reuses the existing `redis` client connection from `api/src/db/redis.ts` without creating duplicate connections.
  - **Cached Read Targets**: Expensive aggregation endpoints (`GET /api/v1/analytics/productivity`, `GET /api/v1/analytics/finance`, and `GET /api/v1/focus/summary`) are cached deterministically by `(userId, startDate, endDate)` with a 5-minute TTL (300 seconds).
  - **Invalidation Tradeoff**: Writes to underlying collections (`transactions`, `habitcheckins`, `focussessions`) do not trigger synchronous cache invalidation given the short 5-minute window and absence of write domain events; real-time consistency is intentionally traded for MongoDB aggregation throughput.
  - **Graceful Fault Tolerance**: All Redis operations are wrapped in try/catch blocks; connection dropouts or Redis failures log warnings via Pino (`logger.warn`) and transparently fall back to executing direct MongoDB aggregation queries without failing the client request.
  - **Observability**: Operation counters (`hits`, `misses`, `errors`) are included in structured Pino logs (`logger.info`).
  - **Habit Streak Document Caching**: Habit streak statistics (`currentStreak`, `longestStreak`, `completionRate`, `lastCheckInDate`) are calculated exclusively at check-in write-time (`updateHabitStats` in `habits.ts` & `syncProcessor.ts`) and persisted directly to the `Habit` document; all read paths consume cached fields without live recomputation.

- **Web Route Splitting & Bundle Optimization Architecture**:
  - **Dynamic Imports**: All heavy feature routes (`NoteDetailPage`, `AnalyticsPage`, `FinancePage`, `FocusPage`, `StudyPage`, `CalendarPage`, `ChatPage`, `SettingsPage`, etc.) and modal flows (`ReceiptScanModal`, `NotesScanModal`) are split via `React.lazy()` dynamic imports to prevent large vendor libraries from polluting the initial entry bundle.
  - **Suspense Fallbacks**: Every lazy boundary mounts `<RouteLoadingFallback variant="editor" | "analytics" | "scan" | "default" />` utilizing existing design system tokens (`#f6f5f4`, `#faf9f8`, `#005db2`, `.loader`, and accessible `Skeleton` elements with `role="status"`).
  - **Chunk Isolation**: TipTap/ProseMirror (~405 kB) and Recharts (~395 kB) are strictly isolated from the initial root entry chunk (`index-*.js`, ~593 kB minified / 175 kB gzip), yielding a ~68% initial payload reduction.
  - **Visualizer Telemetry**: `rollup-plugin-visualizer` is configured in `web/vite.config.ts` (`emitFile: true`, generating `stats.html` and `stats.json`), with automated analysis scripted via `web/scripts/analyze-bundle.mjs`.

- **Production Database Backup & Point-in-Time Recovery Protocol (NFR-3.3)**:
  - **Dual-Tier Strategy**: Production primary database is **MongoDB Atlas** (managed replica set with continuous oplog archiving supporting 1-minute PITR window over 7 days, 35-day daily snapshot retention, and AWS KMS envelope encryption). Self-managed, staging, and CI/CD pipelines use the unified Node/TypeScript backup engine in `api/src/services/backup/` (`backupService.ts`, `restoreService.ts`, `backupConfig.ts`) and CLI scripts (`scripts/backup/`, `scripts/restore/`).
  - **Cryptographic Tamper-Proofing & Encryption**: Every backup archive is hashed via SHA-256 and paired with a structured JSON metadata manifest (`BackupManifestSchema`) capturing collection document counts, timestamps, and schema version. Optional/at-rest encryption uses authenticated AES-256-GCM (`[12-byte IV] + [ciphertext] + [16-byte AuthTag]`).
  - **Production Safety Guardrails**: Restores into production (`validateRestoreTargetSafety`) are strictly blocked by default; attempting to restore into protected names (`lifeos_prod`, `lifeos_production`) or during `NODE_ENV === "production"` throws a critical error unless explicit `--force-production-overwrite` is passed. Non-destructive verification restores must target isolated databases (e.g. `lifeos_recovery`).
  - **Redis & BullMQ Durability Policy**: Redis data is classified into Ephemeral Cache (intentionally lost, rebuilds on demand), Pub/Sub & Rate Limits (ephemeral), and BullMQ Jobs (`lifeos-jobs`, `account-purge`). Background queue processors are idempotent; in a catastrophic Redis failure, primary state remains durable in MongoDB (e.g. `User.deletionRequestedAt`, `Event.reminderLeadMinutes`) and recurring dispatchers auto-reschedule upcoming jobs on restart.

- **GDPR & India DPDP Data Portability & Hard Purge Protocol (NFR-6.1, FR-1.6, NFR-6.2)**:
  - **Data Export (`GET /api/v1/auth/export`)**: Implemented via `userDataExportService.exportUserData(userId)` querying all 25 user-owned collections in parallel, strictly isolating data to authenticated caller, sanitizing sensitive authentication secrets (`passwordHash`, reset tokens, session refresh hashes, push keys, oauth secrets), delivering structured RFC 8259 JSON stream with RFC 6266 `Content-Disposition: attachment; filename="lifeos-data-export-${userId}-${timestamp}.json"`, protected by Redis rate limiter `userDataExportRateLimiter` (5 req/hr), and recording `SENSITIVE_DATA_EXPORT` audit event.
  - **Account Deletion & 30-Day Cascade Purge Engine**: Deletion request flags `deletionRequestedAt = now` with 30-day grace period; permanent cascade purge (`purgeUserData(userId)`) permanently removes records across all 25 user collections, removes pending BullMQ jobs (`jobsQueue`, `accountPurgeQueue`), purges `User` document, and preserves security `AuditLog` records until their statutory 90-day TTL index expires (under GDPR Art. 17(3)(b)/(e) and DPDP defense of legal claims). The batch worker and manual triggers use `purgeEligibleAccounts(asOfDate, retentionDays = 30)` allowing injectable time boundary simulation.
  - **AI Provider Disclosure & Fallback Chain**: AI data usage disclosure in `PRIVACY_POLICY.md` details the exact fallback order (**Mistral AI → Groq → Google Gemini**), specifies that free-tier API endpoints (e.g. Google AI Studio) may use prompts for model improvement whereas enterprise zero-data-retention (ZDR) agreements prohibit training and retention, and defines retention windows (`AI_LOG_RETENTION_DAYS`, default 90) for raw operational logs.

- **Production Security Audit Logging Protocol (NFR-2.6)**:
  - **Audit vs. Operational Logging Separation**: Audit logs (`AuditLog` model via `auditService`) are strictly reserved for security and compliance events (admin mutations, admin reads of sensitive data, authentication lifecycle, sensitive exports, and access control denials). Routine application operations, high-frequency CRUD, and errors route exclusively through Pino (`logger`) and Sentry.
  - **Immutability & Tamper Resistance**: The `AuditLog` collection enforces append-only semantics via Mongoose pre-hooks that reject `updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`, `deleteOne`, `deleteMany`, and `findOneAndDelete`. No REST endpoints allow mutation or deletion of audit records.
  - **Retention Policy**: Audit entries maintain a strict default retention period (90 days, configurable via `AUDIT_LOG_RETENTION_DAYS`) powered by a MongoDB TTL index on `expiresAt` (`expireAfterSeconds: 0`).
  - **IP Anonymization & Privacy (GDPR/HIPAA Compliance)**: Client IP addresses are anonymized before persistence using `anonymizeIp()` — IPv4 addresses have their last octet zeroed (`192.168.1.0`), and IPv6 addresses retain only their first 3 segments (`2001:db8:85a3::`).
  - **Sanitization & Redaction Policy**: `sanitizeAuditMetadata()` recursively scrubs sensitive keys (`password`, `token`, `secret`, `authorization`, `cookie`, `creditCard`, `cvv`, etc.), replaces full markdown contents/payloads with length/summary counters, and limits string fields to 256 characters.
  - **Security Denial & Anomaly Auditing**: Unauthorized admin attempts record `ADMIN_ACCESS_DENIED` with `reason: "INSUFFICIENT_PERMISSIONS"`. IDOR/BOLA cross-user access attempts on finance and notes record `CROSS_USER_ACCESS_ATTEMPT` with `outcome: "DENIED"` and `reason: "OWNERSHIP_MISMATCH"` while responding to callers with generic 404s to avoid ID oracle leakage.
  - **Admin Surface Protection**: All `/api/v1/admin/*` routes require active `admin` role, are rate-limited via `adminRateLimiter` (60 req/min) and `adminAuditRateLimiter` (30 req/min), and emit synchronous audit records for all admin actions.

- **OWASP Top 10 Security & Rate-Limiting Policy (NFR-2.4, NFR-2.1–2.6)**:
  - **Access Control (A01)**: All resource mutations and queries (notes, habits, goals, events, finance, study, focus, analytics, async jobs) MUST strictly enforce user ownership matching (`{ userId: req.user._id }`).
  - **Security Headers (A05)**: Express mounts `helmet` with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, and CSP compatible with Swagger docs.
  - **Rate Limiting & DoS Protection (A07, NFR-2.3)**: Redis-backed sliding/fixed-window rate limiters are mounted on all public and resource-intensive endpoints:
    - `/auth/login`: 5 attempts / 15m per IP + email
    - `/auth/register`: 5 attempts / 15m per IP
    - `/auth/forgot-password`: 3 requests / 15m per IP + email
    - `/auth/reset-password`: 5 attempts / 15m per IP
    - `/auth/refresh`: 60 requests / 15m per IP
    - `/analytics/export`: 20 requests / 1h per user
    - `/api/v1` (general): 120 requests / min per user/IP
    - WebSocket AI `send_message`: Gated by user subscription tier (Free: 20 req/day, Pro: 500 req/day) via `checkAiRateLimit`.
  - **Injection Defense (A03)**: All request payloads and query parameters are strictly validated via Zod schemas, rejecting Mongo query operator injections (`$gt`, `$ne`, `$regex`).
  - **Logging Redaction (A09)**: Passwords, tokens (access, refresh, reset, ID), authorization headers, and cookies are redacted in Pino logs.

- **Google OAuth Authentication & Account Linking Protocol (FR-1.1)**:
  - Google ID tokens are verified server-side with strict cryptographic validation of issuer (`https://accounts.google.com` or `accounts.google.com`), audience (matching configured client IDs), expiration timestamp, and `email_verified: true`.
  - Account Creation / Login: New Google users are registered with `googleId: sub`, `passwordHash: null`, `emailVerified: true`, and seeded with default categories. Existing Google users authenticate via `googleId` and receive standard LifeOS session tokens (short-lived access token + rotating refresh token).
  - Unauthenticated Collision Prevention: If a registration attempt or OAuth callback matches an existing user email that has no linked `googleId`, the server returns `409 Conflict` (`AccountLinkingRequired`) rather than silently merging identities.
  - Explicit Linking & Unlinking: Authenticated users link Google via `POST /api/v1/auth/google/link` (guarded against identity theft/reassignment) and unlink via `DELETE /api/v1/auth/google/link` (rejecting if `!user.passwordHash` to prevent account lockout).
  - Secret & Token Redaction: ID tokens, OAuth codes, client secrets, passwords, cookies, and authorization headers are strictly redacted from structured Pino log output.

- **Periodic Recommendations Protocol (FR-10.3)**:
  - Generation occurs strictly on scheduled cadences (weekly on Sundays at 08:00 evaluating the past 7 completed days, monthly on the 1st of the month at 08:00 evaluating the completed calendar month) via BullMQ background jobs with deterministic dedupe keys (`periodic_rec__${userId}__${period}__${startDate}`).
  - Content generation directly calls `getProductivityAnalytics(userId, start, end)` and `getFinanceAnalytics(userId, start, end)` and feeds aggregated metrics into `callAI()` with provider fallback.
  - Every recommendation item strictly enforces data grounding: explicit domain (`finance`, `habits`, `productivity`, `overall`), category name, observational message referencing numbers, actionable step, and `metricGrounded` string cue.
  - Delivery dispatches `periodic_recommendation` notifications via `scheduleNotification` respecting user's `notificationPreferences.periodicRecommendations` (push / in-app toggles).
  - Background worker errors in `callAI()` are rethrown to trigger BullMQ's exponential retry mechanism instead of saving empty or broken records.

- **Analytics Aggregation, Range Scoping & Export Protocol (FR-12.1 – FR-12.4)**:
  - Date filtering is unified under `analyticsDateRangeSchema` (`startDate` & `endDate` required, formatted as YYYY-MM-DD or ISO, capped at <= 366 days window to prevent pathological unbounded queries) and parsed into exact UTC day boundaries (`[00:00:00.000, 23:59:59.999]`).
  - Productivity aggregation (`GET /api/v1/analytics/productivity`) composes Habit frequency check-in math (`daily`, `weekly`, `custom` expected quotas) with the shared `getFocusSummaryData` multi-stage aggregation pipeline, generating contiguous, gap-free daily trends (`focusMinutes`, `completedSessions`, `habitsCompleted`, `habitsExpected`).
  - Financial analytics (`GET /api/v1/analytics/finance`) reuses Phase 4 MongoDB aggregation pipelines for category breakdowns and multi-period trends, calculating pro-rated actual spend against configured user budgets.
  - Export generation (`GET /api/v1/analytics/export`) bypasses standard JSON envelopes to synchronously stream formatted RFC 4180 CSV (`text/csv; charset=utf-8`) or PDFKit-rendered binary PDF (`application/pdf`) with `Content-Disposition: attachment; filename="..."`, protected by a dedicated Redis rate limiter (20 requests/hour per user).

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
- **Google OAuth Cross-Platform & Mobile Deep Linking Pattern (FR-1.1)**:
  - Web OAuth uses standard redirect flows with refresh token cookies and URL query fallbacks (`/login?oauth_success=true&accessToken=...&refreshToken=...`).
  - Mobile OAuth uses `expo-web-browser` and `expo-linking` (`WebBrowser.openAuthSessionAsync(authUrl, redirectUrl)`). The client passes `return_url=lifeos://oauth` (or `exp://...`), which the backend encodes into the base64url `state` payload.
  - Upon callback, `authRouter.get("/auth/google/callback")` decodes `returnUrl` from the `state` parameter and serves an HTML bridge redirect with embedded JS (`window.location.replace`) to ensure Android Chrome Custom Tabs reliably fire the deep link intent to the app. The redirect URL includes the verified `user` profile, `accessToken`, and `refreshToken`, allowing mobile to authenticate immediately in `useAuthStore` and `tokenStorage` with zero extra round-trips.
- **Component Memoization & Performance**:
  - Wrap pure subcomponents and animated children in `React.memo()`.
  - Wrap callbacks passed to child/animated elements in `useCallback()`.
  - Extract static style/gradient arrays outside render functions to avoid re-allocation thrash. Drive 60fps animations via Reanimated worklets and shared values without triggering React renders. See [FloatingDock.tsx](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/src/navigation/FloatingDock.tsx).

---

## 11. Environment & Config Reference

Standing environment variables (names only) and system ports across workspaces.

- **Required Environment Variables**:
  - **Backend (`/api`)**: `NODE_ENV`, `PORT` (default 4000), `MONGO_URI`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `AI_PROVIDER_ORDER`. Optional: `MISTRAL_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_VISION_API_KEY`, `SENTRY_DSN`, `RESEND_API_KEY`, `POSTMARK_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_MOBILE_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `SWAGGER_ALLOWED_IPS`, `BACKUP_DIR`, `BACKUP_ENCRYPTION_KEY`, `AUDIT_LOG_RETENTION_DAYS`, `AI_LOG_RETENTION_DAYS`, `MONGO_VECTOR_INDEX`.
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
