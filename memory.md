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
│   ├── index.css          # Design tokens & Tailwind setup
├── mobile/                # Expo React Native App
│   ├── src/
│   │   ├── db/            # Local DB setup & offline sync logic
│   │   ├── navigation/    # RootNavigator & FloatingDock (sliding dynamic navigation)
│   │   ├── screens/       # Auth & Main screens (Dashboard, Calendar, Finance, Habits, Notes, Chat, ConflictResolution)
│   │   ├── store/         # Mobile Zustand state
│   │   ├── services/      # API client & offline sync engine
│   ├── eas.json           # EAS Build configuration (preview, production profiles)
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
> Whenever you complete a feature, add an API endpoint, create/modify database models, add UI screens, or alter workspace config, you **MUST** update this `memory.md` file before completing your task.

### Step-by-Step Maintenance Workflow:
1. **Locate `memory.md`**: File path is `memory.md` at workspace root.
2. **Review Affected Sections**:
   - New database model/field -> Update **Section 3**.
   - New API route -> Update **Section 4**.
   - New UI screen or workspace package -> Update **Section 1 & 2**.
   - New script or dependency setup -> Update **Section 5 & 6**.
3. **Maintain Format Constraints**:
   - Keep entries dense, token-efficient, and bulleted.
   - Do NOT add prose, fluff, or changelogs. Update the current state directly.
4. **Validate**: Ensure file paths and command names accurately match the repository state.
