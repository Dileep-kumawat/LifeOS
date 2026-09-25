# LifeOS System Memory & Architecture Map

> **Token-Optimized Project Blueprint for AI Agents**  
> Maintainer Notice: When completing new features, schemas, or modules, follow the update protocol in [Section 7](#7-memory-maintenance-protocol-for-ai-agents).

---

## 1. High-Level Architecture & Tech Stack

- **Monorepo Architecture**: `npm` Workspaces (`api`, `web`, `mobile`, `packages/shared`).
- **Backend (`/api`)**: Node.js 22 LTS, Express + TypeScript, Mongoose (MongoDB), Redis (Caching/BullMQ/Socket.IO adapter), Zod, Pino logging, Passport.js (JWT Access + Refresh tokens, Google OAuth 2.0 & ID Token verification), Swagger (`/api/v1/docs`, 127 routes documented), Sentry, Helmet security headers, auditService.
- **Frontend Web (`/web`)**: React 18 + Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query, React Router v6 with dynamic `React.lazy()` route splitting & `<Suspense>` boundaries (`RouteLoadingFallback`), TipTap & Recharts chunk isolation, Google Sign-In button (`GoogleSignInButton`), Connected Accounts management in Settings, Support & Help Center (`SupportHelpPage`, `/support` & `/help` routes with target audience, purpose, module guides, guidelines, legal terms, interactive FAQ, and direct AI Chat assistance CTA), Web Speech API + Web Audio API inline Voice Input (`useWebVoiceInput`, `VoiceWaveform`), PrivacyPolicyModal, Storybook (50+ stories), Sentry, `rollup-plugin-visualizer` bundle reporting (`web/BUNDLE_REPORT.md`).
- **Mobile (`/mobile`)**: Expo SDK 52 (React Native), TypeScript, React Navigation with Instagram-style Swipeable Activity Pager (`ActivityPager.tsx`) synced in real-time two-way lock-step with dynamic Floating Sliding Dock (`FloatingDock.tsx`, `useDockHeight` clearance hook, `BlurView`, `LinearGradient` edge fade masks, Reanimated spring physics, fixed static center indicator with proximity-driven transforms, gesture horizontal scrolling with auto-centering, single-fire haptic feedback, memoized subcomponents), Support & Help Knowledge Center (`SupportHelpScreen` on `AppStack`, accessible via Settings & Knowledge Center, complete content parity with web: audience personas, unified purpose & 4 pillars, module-by-module guide, 15-min daily operating rhythm, guidelines & legal terms, interactive FAQ accordion, and direct AI Chat assistance CTA; plus `PrivacyPolicyModal`), Google Sign-In button (`GoogleSignInButton`), On-device Speech Recognizer & inline Voice Input (`useMobileVoiceInput`, `mobileVoiceService`, `VoiceWaveform`), SQLite local storage, EAS Build, Sentry.
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
│   │   ├── components/    # Reusable UI & privacy modals (PrivacyPolicyModal, etc.)
│   │   ├── db/            # Local DB setup & offline sync logic
│   │   ├── navigation/    # RootNavigator, ActivityPager (swipeable sync) & FloatingDock (sliding dynamic navigation)
│   │   ├── screens/       # Auth & Main screens (Dashboard, Calendar, Finance, Habits, Notes, Chat, SupportHelpScreen, Settings)
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

- **EAS Build & Over-The-Air (OTA) Updates Pipeline**:
  - Root `package.json` defines `postinstall` and `eas-build-post-install` to build `@lifeos/shared` before compiling mobile app.
  - `expo-updates` installed and configured in `mobile/app.json` (`updates.url: "https://u.expo.dev/11500448-30a4-460b-9409-c0e945fadeac"` with `runtimeVersion: { policy: "appVersion" }`). Enables instant OTA JavaScript updates (`npx eas update --auto`) to delivered APKs without user re-installations.
- **Offline-First & Conflict Handling**:
  - SQLite/WatermelonDB local cache with background sync.
  - `ConflictResolutionScreen.tsx` on mobile to resolve client/server state conflicts.
- **Dock & Layout Architecture**:
  - `useDockHeight()` hook exported from `FloatingDock.tsx` calculates dynamic bottom clearance (`DOCK_HEIGHT + bottomOffset + DOCK_CLEARANCE`), used across all tab screens (`ScreenContainer.tsx` with `includeDockPadding`, subview scrollable lists) to prevent dock occlusion.
  - Auth screens (`LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen`) use `contentContainerStyle: { flexGrow: 1, justifyContent: "center" }` for vertical centering across various device heights with smooth keyboard scrolling.
- **Physical Device Debugging (Android via USB)**:
  - `adb reverse tcp:8081 tcp:8081` (Metro bundler)
  - `adb reverse tcp:4000 tcp:4000` (API backend)
- **Single-Variable Mobile Environment Switching**:
  - Centralized in `mobile/src/config/env.ts` (`ENV`, `resolveApiBaseUrl`, `resolveApiOrigin`). Toggled by `EXPO_PUBLIC_APP_ENV=development` (local dev auto-detect/localhost:4000) or `EXPO_PUBLIC_APP_ENV=production` (deployed Render API `https://lifeos-api-hqcz.onrender.com/api/v1` and socket origin). Pre-wired into EAS build profiles in `eas.json` (`preview`/`production` -> production, `development` -> development).

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

# Mobile EAS Build & OTA Updates
cd mobile && npx eas-cli build -p android --profile preview # Compile standalone Android APK
cd mobile && npx eas update --auto                         # Publish over-the-air update (OTA)

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

- [Mobile Over-The-Air (OTA) Updates & expo-updates Configuration]: Configured mobile application for instant OTA JavaScript updates powered by `expo-updates` and EAS Update; configured `runtimeVersion` policy (`"appVersion"`) and `updates.url` in `mobile/app.json`; added `npx eas update --auto` continuous delivery workflow to root `README.md`; documented in `memory.md`; enables direct continuous delivery of bug fixes and UI improvements to installed APKs without user re-installations.
- [Mobile Support & Help Knowledge Center Screen & Navigation Parity]: Implemented complete Support & Help screen (`mobile/src/screens/main/SupportHelpScreen.tsx`) matching web `SupportHelpPage` content and Notion design aesthetics; features 6-topic filter tabs ("All Topics", "For Whom", "What Purpose", "How to Use", "Terms & Guidelines", "FAQ"), real-time search input with query filtering across questions, answers, and categories, 4 audience persona cards (High Performers, Students, Builders, Mindful Achievers), 10-app fragmentation trap vs. LifeOS solution comparison with 4 architectural pillars (Cohesion, Local-First, Sovereignty, AI), 15-minute daily operating rhythm guide (Morning, Deep Work, Evening), 9 interactive module jump cards with direct tab navigation, 4 platform terms and legal guidelines (acceptable use, GDPR/DPDP data sovereignty, AI fallback disclosure, liability limitations), interactive FAQ accordion with expand/collapse animations, rich dark gradient direct AI Chat CTA banner, and universal `PrivacyPolicyModal` (`mobile/src/components/privacy/PrivacyPolicyModal.tsx`); registered `SupportHelp` route in `RootNavigator.tsx` (`AppStack`) and integrated prominent "Support & Knowledge Center" navigation card in `SettingsScreen.tsx`; verified 0 TypeScript compilation errors across all 4 monorepo workspaces and 20/20 mobile test suites passing (121 tests).
- [Mobile Dashboard Dual-Tier Live Server & Offline SQLite Integration]: Architected dual-tier data retrieval in `mobile/src/screens/main/DashboardScreen.tsx` combining instant local SQLite rendering with direct live server HTTP fetching (`GET /calendar/events`, `GET /habits`, `GET /habits/:id/check-ins`, `GET /finance/summary`, `GET /finance/budgets`, and `GET /notes`); when online, fetches actual live records directly from MongoDB via `apiClient`, populates state with live data, posts habit check-ins to server `/habits/:id/check-in`, and triggers background sync to mirror SQLite; when offline or disconnected, transparently falls back to local SQLite repositories (`eventRepo`, `habitRepo`, `financeRepo`, `noteRepo`) without user disruption; eliminated all hardcoded demo/mock fallbacks and wired `useFocusEffect` + pull-to-refresh (`onRefresh`); verified typecheck clean across all 4 monorepo workspaces and 19/19 mobile test suites passing (117 tests).
- [Mobile App Download Center & Route (`/download`)]: Implemented dedicated `/download` page (`web/src/routes/DownloadAppPage.tsx`) for direct standalone Android APK distribution; features direct APK download button targeting the latest verified GitHub release (`https://github.com/Dileep-kumawat/LifeOS/releases/latest/download/lifeos.apk`), dynamic high-resolution QR code generator for desktop-to-mobile scanning, 3-step visual APK installation guide (handling Android's "Allow from this source" security permission), client-side platform auto-detection (Android vs iOS PWA guidance), copy-to-clipboard download link with toast notifications, and interactive FAQ accordion; wired navigation badges to `/download` in `RootLayout.tsx` (mobile top header, mobile drawer, and desktop sidebar); verified typecheck clean and Vite production build succeeded.
- [Support & Help Knowledge Center & Routing (`SupportHelpPage`)]: Implemented dedicated Support & Help page (`web/src/routes/SupportHelpPage.tsx`) lazy-routed via `/support` and `/help` with `RouteLoadingFallback`; wired side nav and mobile drawer links to `/support` with active state indicators instead of redirecting directly to `/chat`; built comprehensive Notion-aesthetic knowledge base featuring Target Audience profiles, Core Purpose & Value Proposition (resolving the 10-app fragmentation trap), Module-by-Module Guidelines & 15-minute daily operating rhythm, Platform Terms & Guidelines (acceptable use, GDPR/DPDP data sovereignty, AI fallback disclosures, and warranty disclaimers), searchable interactive FAQ accordion, and prominent direct CTA banner redirecting users to the AI Assistant (`/chat`) for real-time assistance; verified typecheck clean, 15/15 web vitest tests passing, and Vite production bundle compilation succeeded.
- [Mobile App Icon & Android Adaptive Logo Configuration]: Generated high-resolution app icon assets (`mobile/assets/icon.png` 1024x1024, `mobile/assets/adaptive-icon.png` with 66% safe-zone central alignment to prevent launcher masking crop, `mobile/assets/splash-icon.png`, and `mobile/assets/favicon.png`) from the official LifeOS brand mark; wired `icon`, `splash`, `android.adaptiveIcon` (`foregroundImage` + `#ffffff` background), and `ios.icon` in `mobile/app.json`; verified configuration via `npx expo config --type public` and verified clean typecheck across all 4 monorepo workspaces.
- [Web App Manifest & PWA Configuration]: Replaced generic placeholder metadata in `web/public/site.webmanifest` with LifeOS application identity ("LifeOS - Personal Operating System"), description, design token colors (theme: `#0075de`, background: `#f6f5f4`), maskable and standard icon mappings, categories, and quick shortcuts (Calendar, Habits, Notes, Finance, Focus, Assistant); updated `web/index.html` with root-relative icon and manifest paths, theme-color meta tag, and SEO description; verified clean web production build (`npm run build --workspace=web`).
- [Standalone Android APK EAS Cloud Build Documentation]: Added comprehensive instructions in root `README.md` for building and distributing standalone `.apk` packages via EAS Build (`preview` profile), including Expo login, keystore provisioning, cloud compilation targeting production API (`https://lifeos-api-hqcz.onrender.com`), and Android installation permissions.
- [Mobile Single-Variable Environment Switching (Development vs Production)]: Centralized mobile environment configuration in `mobile/src/config/env.ts` with single-variable control via `EXPO_PUBLIC_APP_ENV` (or `EXPO_PUBLIC_ENV`); switching to `production` routes REST API (`/api/v1`), Socket.IO chat streaming, and Google OAuth deep links to the deployed Render backend (`https://lifeos-api-hqcz.onrender.com`), while `development` preserves auto-detection of host machine Wi-Fi IP or `localhost:4000` via USB `adb reverse`; wired environment profiles into `mobile/eas.json` (preview/production to production, development to development); created `mobile/.env.example` and `mobile/.env`; verified 19/19 test suites passing (117 tests) and 0 TypeScript errors across all 4 workspaces.
- [Web Notes Editor Full-Screen Canvas & Focus Timer Layout Alignment]: Expanded NoteDetailPage layout from cramped max-w-3xl to full-width responsive canvas (w-full flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4 sm:py-6), updated NoteEditor to flex-1 with min-h-[480px] and .notes-editor .tiptap flex: 1 for distraction-free vertical expansion; eliminated asymmetric indentation and centering offset on PomodoroTimer by removing max-w-xl mx-auto and applying w-full with balanced 7/5 grid column proportions on FocusPage (lg:col-span-7 and lg:col-span-5 within max-w-6xl w-full), ensuring the timer card left border aligns flush with the header and tabs while the right sidebar cards align with the top navigation link; verified typecheck clean across all workspaces and Vite production build succeeded.
- [Web AI Chat Multiple Prompt Reconcile Error (FR-2.5, FR-2.14)]: Fixed `TypeError: Cannot read properties of undefined (reading 'startsWith')` occurring on subsequent prompt submissions in `web/src/features/ai/hooks/useSocketChat.ts`; backend `user_message_ack` emitted `messageId` without `id`, causing `prev[0].id` to be undefined during subsequent `prev.some((m) => m.id.startsWith("temp_"))` checks; normalized `user_message_ack` on client to resolve `id: data.id || data.messageId || data._id`, guarded `m?.id?.startsWith("temp_")` against non-string IDs, and added `id` alongside `messageId` across all backend `user_message_ack` and `chat_stream_end` socket emissions in `api/src/services/ai/chatSocket.ts`; verified typecheck clean, lint 0 errors, and web production build succeeded cleanly.
- [Production AI Chat Rate-Limiter Fail-Open & Streaming Resilience]: Resolved production chat failure where queries hung indefinitely due to unshielded Redis incr in checkAiRateLimit (`api/src/services/ai/rateLimiter.ts`); added strict `redis.status !== "ready"` check, 1-second `Promise.race` timeout, and fail-open fallback across AI, analytics, and OCR rate limiters; added 15-second `AbortController` stream timeout in `chatSocket.ts` to prevent stalled provider streams; updated web `useSocketChat.ts` with optimistic message rendering, automatic token refresh on `connect_error`, and reconnect handling; verified 0 TypeScript errors across all 4 workspaces, 0 ESLint errors, and clean production web compilation.
- [Production Pending-Request Hang on Writes (BullMQ/Redis Fail-Open)]: Fixed infinite "Pending" XHRs on `POST /calendar/events` (and all other write routes) in production by making `enqueueJob` (`api/src/services/queue.ts`) fail open — instant return when `redis.status` is not `ready` plus 2s timeout race on `getJob`/`add` degrading to `{ queued: false }` instead of hanging/throwing under `maxRetriesPerRequest: null`; hardened `getOrSetCache` with ready-check + 1s timeout, `cancelEventReminder` with 2s timeout race, `enqueueEmbeddingJob` to warn-and-continue instead of rethrow, isolated calendar POST/PATCH background jobs in try/catch so HTTP 201/200 always resolves, and added 30s `timeout` to web `apiClient`; verified typecheck clean, lint 0 errors, 24/24 calendar+reminder+cache tests and 23/23 rag/callAI/notifications tests passing.
- [Web Google OAuth Initiation Return URL Resolution (FR-1.1)]: Updated `GoogleSignInButton.tsx` and `SettingsPage.tsx` to pass `?return_url=${encodeURIComponent(window.location.origin + '/login')}` (and `/settings`) when redirecting to `/api/v1/auth/google`; ensures the backend base64url OAuth `state` captures the caller's live web origin, resolving production redirection failure where users were sent to `localhost:5173/login?oauth_success=true...` (`ERR_CONNECTION_REFUSED`) after successful Google authentication.
- [Redis Connection Resilience & Rate Limiter Fail-Fast Timeout]: Added strict `redis.status === "ready"` check and 1-second timeout race to Express rate limiters in `rateLimiter.ts`; added `keepAlive: 10000`, `connectTimeout: 10000`, and TLS options in `redis.ts`; resolved infinite request hanging where cloud/Upstash Redis `ECONNRESET` drops caused `redis.incr` commands to stall indefinitely in offline queue due to `maxRetriesPerRequest: null`.
- [Web Client Unified Backend API Environment Configuration]: Added centralized `API_BASE_URL` reading `VITE_API_URL` in `apiClient.ts`; updated `apiClient` axios baseURL, token refresh route, `useSocketChat` Socket.IO host, `GoogleSignInButton`, and `SettingsPage` Google OAuth initiation redirect; created `web/.env.example` and updated root `.env.example`; verified 0 TypeScript compilation errors in web workspace.


---

## 10. Coding Conventions & Patterns

Standing codebase conventions to preserve consistency across web, mobile, and backend.

- **Read-Through Caching & Invalidation Architecture**:
  - **Redis Fail-Open Rule (applies to ALL Redis call sites)**: Because `ioredis` runs with `maxRetriesPerRequest: null`, any `await` on Redis while disconnected queues offline forever and hangs the request (browser "Pending" or hanging WebSocket handler). Every Redis touch MUST fail open: return immediately when `redis.status` is defined and not `"ready"` (treat `undefined` status as usable so unit-test mocks still run), and race every command against a strict timeout (rate limiters 1s, cache 1s, queue 2s), degrading to direct execution / allowing the request / `{ queued: false }` with `logger.warn` instead of hanging or throwing. Applied consistently across Express middleware (`rateLimiter.ts`), AI chat WebSocket rate limiting (`ai/rateLimiter.ts`), analytics export (`analytics/rateLimiter.ts`), and OCR extraction (`ocr/rateLimiter.ts`).
  - **Singleton Redis Reuse**: `getOrSetCache<T>(key, ttl, fetchFn)` in `api/src/services/cache/readThroughCache.ts` strictly reuses the existing `redis` client connection from `api/src/db/redis.ts` without creating duplicate connections.
  - **Cached Read Targets**: Expensive aggregation endpoints (`GET /api/v1/analytics/productivity`, `GET /api/v1/analytics/finance`, and `GET /api/v1/focus/summary`) are cached deterministically by `(userId, startDate, endDate)` with a 5-minute TTL (300 seconds).
  - **Invalidation Tradeoff**: Writes to underlying collections (`transactions`, `habitcheckins`, `focussessions`) do not trigger synchronous cache invalidation given the short 5-minute window and absence of write domain events; real-time consistency is intentionally traded for MongoDB aggregation throughput.
  - **Graceful Fault Tolerance**: All Redis operations are wrapped in try/catch blocks; connection dropouts or Redis failures log warnings via Pino (`logger.warn`) and transparently fall back to executing direct MongoDB aggregation queries without failing the client request.
  - **Observability**: Operation counters (`hits`, `misses`, `errors`) are included in structured Pino logs (`logger.info`).
  - **Habit Streak Document Caching**: Habit streak statistics (`currentStreak`, `longestStreak`, `completionRate`, `lastCheckInDate`) are calculated exclusively at check-in write-time (`updateHabitStats` in `habits.ts` & `syncProcessor.ts`) and persisted directly to the `Habit` document; all read paths consume cached fields without live recomputation.

- **Background Jobs Are Best-Effort, Never Response-Blocking**:
  - `enqueueJob` (`api/src/services/queue.ts`) never throws on Redis failure — it returns `{ queued: false }`; `enqueueEmbeddingJob` warns and continues; routes isolate reminder/embedding calls in try/catch so `Event.create` success always yields HTTP 201 even when the queue is down.
  - Web `apiClient` sets `timeout: 30000` so a stalled backend surfaces as an error instead of an infinite "Pending" row.

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
  - **Frontend Web (`/web`)**: `VITE_API_URL` (REQUIRED in production on Vercel — must point at the Render API origin, otherwise `/api/v1` hits the static host), `VITE_VAPID_PUBLIC_KEY`. Optional: `VITE_SENTRY_DSN`.
  - **Mobile (`/mobile`)**: `EXPO_PUBLIC_APP_ENV` (or `EXPO_PUBLIC_ENV`: `"development"` | `"production"`; switches between local server and deployed Render API `https://lifeos-api-hqcz.onrender.com`), `EXPO_PUBLIC_API_URL` (optional custom endpoint override).
- **System Ports Overview**:
  - `4000`: Express API REST & WebSocket server.
  - `5173`: Vite Web application dev server.
  - `8081`: Expo Metro bundler for React Native.
  - `27017`: MongoDB database container / local instance.
  - `6379`: Redis cache & Bull queue container / local instance.
- **Local Secrets vs. EAS Build Secrets**:
  - Local development loads secrets from workspace `.env` files (git-ignored) or shell variables.
  - EAS Build mobile secrets must be configured via `npx eas-cli secret:create` or in the Expo EAS dashboard, injected during cloud APK/AAB build steps without committing `.env` files into source control.
