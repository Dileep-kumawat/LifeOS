# LifeOS System Memory & Architecture Map

> **Token-Optimized Project Blueprint for AI Agents**  
> Maintainer Notice: When completing new features, schemas, or modules, follow the update protocol in [Section 7](#7-memory-maintenance-protocol-for-ai-agents).

---

## 1. High-Level Architecture & Tech Stack

- **Monorepo Architecture**: `npm` Workspaces (`api`, `web`, `mobile`, `packages/shared`).
- **Backend (`/api`)**: Node.js 22 LTS, Express + TypeScript, Mongoose (MongoDB), Redis (Caching/Bull), Zod, Pino logging, Passport.js (JWT Access + Refresh tokens, OAuth stub), Swagger (`/api/v1/docs`), Sentry.
- **Frontend Web (`/web`)**: React 18 + Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query, React Router v6, Storybook, Sentry.
- **Mobile (`/mobile`)**: Expo SDK 52 (React Native), TypeScript, React Navigation with dynamic Floating Sliding Dock (`FloatingDock.tsx`, `useDockHeight` clearance hook, `BlurView`, `LinearGradient` edge fade masks, Reanimated spring physics, fixed static center indicator with proximity-driven transforms, gesture horizontal scrolling with auto-centering, single-fire haptic feedback, memoized subcomponents), SQLite local storage, EAS Build, Sentry.
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
  - `Event`: Calendar events, start/end timestamps, recurrence rules, Google Sync IDs.
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

---

## 9. Recent Fixes Log (rolling, capped)

> Short-term memory of intentional changes and bug fixes (newest first, max 15 entries).

- [Metro Bundler / Mobile OCR]: Changed `./apiClient.js` to `./apiClient` in `mobileOcrService.ts` and aligned `expo-image-picker` to `~16.0.6` — resolved Metro bundler module resolution error.
- [Notes OCR Integration]: Implemented FR-5.3 photographed text to editable note pre-fill — shared OCR-to-ProseMirror converter, Web & Mobile 4-state scan flow, Storybook stories, and review cards with low-confidence cues.
- [OCR Extraction Pipeline]: Added shared on-device ML Kit & BullMQ Tesseract OCR pipeline with unified spatial & confidence schemas — unified OCR contract for Notes and Finance.
- [DashboardScreen]: Added `flexWrap` and `gap` to `DailySummaryCard` badges/items — fixed scheduled item layout overflow on narrow device widths.
- [FloatingDock]: Maintained dock mounting and transitioned Reanimated opacity on keyboard show/hide — fixed active screen indicator resetting to first icon (Dashboard) after keyboard dismiss.
- [ChatScreen / Assistant]: Adjusted `KeyboardAvoidingView` offsets and dynamic bottom padding with dock auto-fade — fixed message input disappearing behind virtual keyboard when focused.
- [FloatingDock]: Added animated transient title pill with 1.3s hold and 280ms auto-fade — fixed permanently visible black tooltip pill obstructing screen content.
- [FloatingDock]: Guarded programmatic `scrollTo` with `isProgrammaticScrollRef` and timeout fallback — fixed rapid intermediate screen flashing/flickering when tapping distant dock icons.
- [Auth Screens]: Switched root container styling to `contentContainerStyle: { flexGrow: 1, justifyContent: "center" }` — fixed login/register forms top-aligning instead of vertically centering across devices.
- [ScreenContainer / Tab Screens]: Integrated `useDockHeight()` dynamic bottom clearance hook across all main tabs — fixed bottom cards and list items occluded behind floating dock overlay.
- [FloatingDock]: Memoized `DockItem`, `CenterIndicator`, and `LinearGradient` edge masks with `React.memo` — fixed dock glitching, mount jump, and layout thrashing on screen state updates.
- [FloatingDock]: Decoupled `scrollX` continuous animation worklet from synchronous React state updates — fixed dock pop/snapback desync during fast gestures.
- [FloatingDock]: Tuned `LinearGradient` edge fade overlays with `pointerEvents="none"` — fixed gradient masks intercepting tap events on outer dock icons.
- [FloatingDock]: Computed deterministic width and symmetric side padding `(dockWidth - ITEM_WIDTH) / 2` — fixed outer dock items unable to scroll fully into static center indicator.
- [FloatingDock]: Introduced static center active indicator with proximity-driven scale/opacity transforms — fixed sliding dock alignment and eliminated multi-fire haptic feedback.

---

## 10. Coding Conventions & Patterns

Standing codebase conventions to preserve consistency across web, mobile, and backend.

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
