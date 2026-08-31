# Software Requirements Specification (SRS)

## LifeOS — AI Personal Operating System

**Document Version:** 1.0
**Date:** August 1, 2026
**Prepared for:** LifeOS Product & Engineering Team
**Status:** Draft

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for **LifeOS**, an AI-powered personal operating system that unifies calendar management, goal/habit tracking, note-taking, finance tracking, study planning, and an AI assistant into a single ecosystem across Web, Android, and (later) Desktop. It is intended for use by the product owner, designers, backend/frontend/mobile engineers, QA, and DevOps to guide design, development, and testing.

### 1.2 Intended Audience

- Product Manager / Founder
- Backend Engineers (Node.js, MongoDB, Redis)
- Frontend Engineers (React)
- Mobile Engineers (React Native)
- AI/ML Engineers
- QA / Test Engineers
- DevOps / Infra Engineers
- UI/UX Designers

### 1.3 Product Scope

LifeOS aims to replace a fragmented stack of apps (Notion, Google Calendar, ChatGPT, habit trackers, budgeting apps) with a single, AI-native personal productivity ecosystem. The AI assistant acts as the connective layer — capable of reading across a user's calendar, notes, habits, and finances to answer natural-language questions and proactively generate recommendations, plans, and summaries.

### 1.4 Definitions, Acronyms, and Abbreviations

| Term | Definition                          |
| ---- | ----------------------------------- |
| SRS  | Software Requirements Specification |
| LLM  | Large Language Model                |
| OCR  | Optical Character Recognition       |
| JWT  | JSON Web Token                      |
| WS   | WebSocket                           |
| PWA  | Progressive Web App                 |
| CRUD | Create, Read, Update, Delete        |
| MVP  | Minimum Viable Product              |
| RAG  | Retrieval-Augmented Generation      |
| API  | Application Programming Interface   |

### 1.5 References

- IEEE 830 SRS Standard (structural reference)
- OWASP Top 10 (security baseline)
- WCAG 2.1 AA (accessibility baseline)

---

## 2. Overall Description

### 2.1 Product Perspective

LifeOS is a new, standalone SaaS product built as a multi-client system (Web, Android, later Desktop) sharing a single Node.js backend, MongoDB + Redis data layer, WebSocket server for real-time sync, and a dedicated AI services layer that orchestrates LLM calls, embeddings, and retrieval over user data.

```
┌─────────────┐   ┌──────────────────┐   ┌────────────────┐
│  React Web  │   │ React Native App │   │  Desktop (v2)  │
└──────┬──────┘   └────────┬─────────┘   └───────┬────────┘
       │                    │                      │
       └────────────────────┼──────────────────────┘
                             │  HTTPS / WSS
                    ┌────────▼─────────┐
                    │   Node.js API    │
                    │ (REST + WS Gateway)│
                    └────────┬─────────┘
              ┌──────────────┼──────────────┐
       ┌──────▼─────┐  ┌─────▼─────┐  ┌─────▼──────┐
       │  MongoDB   │  │   Redis   │  │ AI Services │
       │ (primary)  │  │ (cache/  │  │ (LLM, OCR,  │
       │            │  │  queue)   │  │  embeddings)│
       └────────────┘  └───────────┘  └─────────────┘
```

### 2.2 Product Functions (Summary)

1. AI conversational assistant with cross-module context (RAG over user data)
2. Calendar management with smart scheduling
3. Goal and habit tracking with streaks and analytics
4. Notes (text + OCR-scanned) with AI summarization/tagging
5. Personal finance tracking with AI insights
6. Study planner with spaced repetition and AI-generated plans
7. Pomodoro-based focus timer integrated with tasks/goals
8. Voice command interface
9. Daily AI-generated summary and smart recommendations
10. Analytics dashboard (productivity, finance, health)
11. Push/local notification engine
12. Offline-first sync on mobile

### 2.3 User Classes and Characteristics

| User Class         | Description                                                       | Technical Proficiency |
| ------------------ | ----------------------------------------------------------------- | --------------------- |
| Free Tier User     | Core features, limited AI calls/storage                           | Low–Medium            |
| Premium Subscriber | Full AI usage, unlimited storage, advanced analytics              | Low–Medium            |
| Admin/Support      | Manages users, subscriptions, moderates flagged content           | High                  |
| System (AI Agent)  | Automated background jobs (summaries, reminders, recommendations) | N/A                   |

### 2.4 Operating Environment

- **Web:** Modern evergreen browsers (Chrome, Edge, Firefox, Safari), responsive down to tablet width; PWA installable.
- **Android:** Android 9.0 (API 28) and above.
- **Backend:** Node.js (LTS) on containerized cloud infrastructure (e.g., AWS/GCP), horizontally scalable.
- **Database:** MongoDB Atlas (or self-managed replica set) + Redis (managed).
- **Desktop (future):** Electron or Tauri wrapper around the Web client.

### 2.5 Design and Implementation Constraints

- Must support offline-first usage on Android with eventual consistency sync.
- AI responses must degrade gracefully when the LLM provider is rate-limited or unavailable.
- All financial data must be encrypted at rest and in transit; no raw bank credentials stored (use aggregator like Plaid/Setu where applicable).
- Must comply with data protection regulations relevant to target markets (e.g., GDPR, India's DPDP Act) given health/finance data sensitivity.
- Real-time sync must not conflict-overwrite user data (last-write-wins is insufficient for critical modules like finance/notes — requires conflict resolution strategy).

### 2.6 Assumptions and Dependencies

- Third-party LLM API (e.g., Anthropic/OpenAI) is used for core AI reasoning; system does not train its own foundation model.
- Push notifications depend on Firebase Cloud Messaging (Android) and Web Push API.
- OCR may use a third-party service or on-device ML Kit for MVP speed.
- Users have consistent (if intermittent) internet access; fully air-gapped offline AI is out of scope for MVP.

---

## 3. System Features (Functional Requirements)

Each feature below includes description, priority, and functional requirements (FR) with unique IDs for traceability.

### 3.1 Authentication & User Management

**Priority:** Critical (MVP)

| ID     | Requirement                                                                                  |
| ------ | -------------------------------------------------------------------------------------------- |
| FR-1.1 | System shall allow registration via email/password, Google OAuth, and phone OTP.             |
| FR-1.2 | System shall issue JWT access tokens (short-lived) and refresh tokens (long-lived, rotated). |
| FR-1.3 | System shall support multi-factor authentication (optional, TOTP-based).                     |
| FR-1.4 | System shall support password reset via email link with expiring token.                      |
| FR-1.5 | System shall allow users to manage active sessions/devices and revoke access remotely.       |
| FR-1.6 | System shall enforce role-based access control (User, Admin).                                |
| FR-1.7 | System shall support account deletion with full data purge within 30 days (compliance).      |

### 3.2 AI Personal Assistant

**Priority:** Critical (Core differentiator)

| ID     | Requirement                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-2.1 | System shall provide a chat interface where users can ask natural-language questions about their own data (calendar, notes, habits, finance).                             |
| FR-2.2 | System shall use a RAG pipeline: retrieve relevant user records (via embeddings/vector search) before passing context to the LLM.                                         |
| FR-2.3 | System shall support example queries: "How productive was I this month?", "Create tomorrow's study plan", "Summarize my meeting", "Help me get financially better."       |
| FR-2.4 | System shall support function-calling/tool-use so the AI can create calendar events, tasks, or notes directly from chat (with user confirmation for destructive actions). |
| FR-2.5 | System shall maintain conversational memory scoped per user, with the ability to reference past conversations.                                                            |
| FR-2.6 | System shall clearly indicate when the AI is uncertain or lacks sufficient data to answer accurately.                                                                     |
| FR-2.7 | System shall log AI interactions for quality monitoring, excluding sensitive raw content beyond retention policy.                                                         |
| FR-2.8 | System shall rate-limit AI requests per subscription tier.                                                                                                                |
| FR-2.9 | System shall support streaming responses in chat UI.                                                                                                                      |

### 3.3 Calendar & Scheduling

**Priority:** Critical (MVP)

| ID     | Requirement                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| FR-3.1 | Users shall create, edit, delete, and view events (day/week/month views).                                  |
| FR-3.2 | System shall support recurring events (daily, weekly, monthly, custom RRULE).                              |
| FR-3.3 | System shall support two-way sync with Google Calendar (import/export).                                    |
| FR-3.4 | AI shall suggest optimal time slots for new tasks/events based on existing schedule and stated priorities. |
| FR-3.5 | System shall send reminders before events (configurable lead time).                                        |
| FR-3.6 | System shall detect and warn on scheduling conflicts.                                                      |

### 3.4 Goals & Habits

**Priority:** High (MVP)

| ID     | Requirement                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| FR-4.1 | Users shall create goals with target dates, milestones, and progress tracking.                                  |
| FR-4.2 | Users shall create habits with frequency (daily/weekly/custom) and track completion via check-ins.              |
| FR-4.3 | System shall calculate and display streaks, completion rate, and longest streak per habit.                      |
| FR-4.4 | System shall send habit reminder notifications at user-configured times.                                        |
| FR-4.5 | AI shall suggest habit adjustments based on completion patterns (e.g., "You miss this habit most on weekends"). |
| FR-4.6 | System shall link goals to relevant tasks/calendar events/notes.                                                |

### 3.5 Notes & OCR

**Priority:** High (MVP)

| ID     | Requirement                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| FR-5.1 | Users shall create, edit, organize (folders/tags), and search notes.                                        |
| FR-5.2 | System shall support rich text formatting (headings, lists, checkboxes, embedded images).                   |
| FR-5.3 | Users shall capture handwritten or printed notes via camera; system shall OCR the image into editable text. |
| FR-5.4 | AI shall auto-summarize long notes and suggest tags.                                                        |
| FR-5.5 | System shall support full-text search across all notes.                                                     |
| FR-5.6 | System shall support note version history (last N versions).                                                |

### 3.6 Finance Tracker

**Priority:** High

| ID     | Requirement                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| FR-6.1 | Users shall manually log income and expenses with category, amount, date, and notes.                               |
| FR-6.2 | Users shall scan receipts (OCR) to auto-populate expense entries.                                                  |
| FR-6.3 | System shall support budget creation per category with alerts on overspend.                                        |
| FR-6.4 | System shall generate monthly financial summaries (charts: category breakdown, trend over time).                   |
| FR-6.5 | AI shall analyze spending patterns and generate actionable recommendations ("Help me get financially better").     |
| FR-6.6 | System shall support multi-currency entries with conversion for reporting (v2).                                    |
| FR-6.7 | (Optional/v2) System shall support bank account linking via a licensed aggregator for auto-import of transactions. |

### 3.7 Study Planner

**Priority:** Medium

| ID     | Requirement                                                                              |
| ------ | ---------------------------------------------------------------------------------------- |
| FR-7.1 | Users shall define subjects/topics and syllabus items with deadlines.                    |
| FR-7.2 | AI shall generate a study plan given available time, deadline, and topic priority.       |
| FR-7.3 | System shall support spaced-repetition style review scheduling for flashcard-type items. |
| FR-7.4 | System shall track study session time and link sessions to Pomodoro timer.               |

### 3.8 Pomodoro / Focus Timer

**Priority:** Medium

| ID     | Requirement                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------- |
| FR-8.1 | Users shall start a focus session (customizable work/break intervals) linked to a task/goal.             |
| FR-8.2 | System shall send a notification at interval completion.                                                 |
| FR-8.3 | System shall log focus session history and aggregate total focus time per day/week.                      |
| FR-8.4 | System shall block/mute non-critical notifications during an active focus session (mobile only, opt-in). |

### 3.9 Voice Commands

**Priority:** Medium

| ID     | Requirement                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| FR-9.1 | Users shall issue voice commands (e.g., "Add a task for tomorrow at 5pm") via mobile mic input.              |
| FR-9.2 | System shall transcribe speech to text and route it through the AI assistant's intent/tool-calling pipeline. |
| FR-9.3 | System shall confirm ambiguous or destructive voice actions before executing.                                |

### 3.10 Daily AI Summary & Smart Recommendations

**Priority:** High (core differentiator)

| ID      | Requirement                                                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FR-10.1 | System shall generate a daily summary each morning covering: yesterday's completed tasks/habits, today's schedule, and top 3 priorities. |
| FR-10.2 | System shall push the daily summary via notification and make it available in-app.                                                       |
| FR-10.3 | System shall generate periodic (weekly/monthly) smart recommendations across productivity, health, and finance.                          |
| FR-10.4 | Users shall configure the delivery time and channels (push/email) for summaries.                                                         |

### 3.12 Analytics Dashboard

*(Section 3.11 "File Storage" and FR-11.x have been removed from scope — this app has no file/attachment functionality. Section and requirement numbering from 3.12/FR-12.x onward is left unchanged rather than renumbered, so existing cross-references elsewhere in this document and in the phase build plans stay valid.)*

**Priority:** Medium

| ID      | Requirement                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------- |
| FR-12.1 | System shall display productivity analytics (tasks completed, focus time, habit consistency) with charts. |
| FR-12.2 | System shall display finance analytics (spend by category, trend lines, budget adherence).                |
| FR-12.3 | System shall support custom date-range filtering for all analytics views.                                 |
| FR-12.4 | System shall allow exporting analytics data (CSV/PDF).                                                    |

### 3.13 Notification Engine

**Priority:** Critical (MVP)

| ID      | Requirement                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------- |
| FR-13.1 | System shall support push notifications (Android via FCM, Web Push).                            |
| FR-13.2 | System shall support in-app notification center with read/unread state.                         |
| FR-13.3 | Users shall configure notification preferences per module (calendar, habits, AI summary, etc.). |
| FR-13.4 | System shall batch/de-duplicate notifications to avoid spam.                                    |
| FR-13.5 | System shall support scheduled/local notifications on Android for offline reliability.          |

### 3.14 Offline Sync

**Priority:** High (Android)

| ID      | Requirement                                                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-14.1 | Android app shall allow full CRUD on core modules (tasks, notes, habits) while offline, using local storage (e.g., SQLite/WatermelonDB).                                           |
| FR-14.2 | System shall sync local changes to the server upon reconnection.                                                                                                                   |
| FR-14.3 | System shall detect and resolve sync conflicts using a defined strategy (e.g., last-write-wins with field-level merge for non-conflicting fields, user prompt for true conflicts). |
| FR-14.4 | System shall show sync status indicators (synced/pending/error) in the UI.                                                                                                         |

---

## 4. External Interface Requirements

### 4.1 User Interfaces

- Responsive React web dashboard (desktop-first, tablet-friendly).
- React Native Android app following Material Design 3 guidelines.
- Consistent design system (shared component tokens/colors) across Web and Android.
- Dark mode support on both platforms.
- Accessibility: WCAG 2.1 AA compliance for web (contrast, screen-reader labels, keyboard navigation).

### 4.2 Hardware Interfaces

- Android device microphone (voice commands).
- Android device camera (OCR note/receipt capture).
- Local device storage for offline cache.

### 4.3 Software Interfaces

| Interface                                                | Purpose                                           |
| -------------------------------------------------------- | ------------------------------------------------- |
| LLM Provider API (e.g., Anthropic Claude API)            | Core AI reasoning, summarization, recommendations |
| Vector DB (e.g., MongoDB Atlas Vector Search / Pinecone) | Embedding storage for RAG retrieval               |
| OCR Service (e.g., Google Vision / ML Kit / Tesseract)   | Text extraction from images                       |
| Google Calendar API                                      | Two-way calendar sync                             |
| Firebase Cloud Messaging                                 | Android push notifications                        |
| Web Push API                                             | Browser push notifications                        |
| Payment Gateway (e.g., Stripe/Razorpay)                  | Subscription billing                              |
| Bank Aggregator (e.g., Plaid/Setu) — v2                  | Auto-import of transactions                       |

### 4.4 Communication Interfaces

- HTTPS/TLS 1.2+ for all REST API traffic.
- WSS (WebSocket Secure) for real-time sync, chat streaming, and live notifications.
- REST API following JSON:API-like conventions; versioned (`/api/v1/...`).

---

## 5. System Architecture Overview

### 5.1 High-Level Components

1. **Client Layer:** React Web (PWA-capable), React Native Android app, future Electron/Tauri desktop.
2. **API Gateway / Node.js Backend:** REST API + WebSocket gateway; handles auth, business logic, orchestration.
3. **Data Layer:**
   - **MongoDB:** Primary document store (users, events, notes, habits, transactions).
   - **Redis:** Session cache, rate limiting, pub/sub for WebSocket scaling, job queue (e.g., BullMQ) for background tasks (notifications, AI summary generation, OCR processing).
4. **AI Services Layer:** Dedicated microservice(s) handling:
   - LLM orchestration and prompt/tool-calling management
   - Embedding generation and vector search (RAG)
   - OCR pipeline
   - Scheduled jobs for daily summaries/recommendations
5. **Notification Service:** Manages push (FCM/Web Push), in-app, and email notifications, decoupled via message queue.

### 5.2 Data Flow (Example: AI Assistant Query)

1. User sends a question via chat (Web/Android) over WSS or REST.
2. API Gateway authenticates the request and forwards to AI Services.
3. AI Services retrieves relevant context via vector search against the user's embedded data (RAG).
4. AI Services constructs a prompt with retrieved context + tool definitions and calls the LLM provider.
5. If the LLM invokes a tool (e.g., "create calendar event"), AI Services validates and (pending confirmation if needed) executes it against MongoDB via the API layer.
6. Response streams back to the client over WSS.

### 5.3 Scalability Considerations

- Stateless Node.js API instances behind a load balancer, horizontally scalable.
- Redis pub/sub to fan out WebSocket messages across multiple API instances.
- Background/async processing (OCR, embeddings, notifications, daily summaries) offloaded to a job queue to keep API response times low.
- MongoDB indexing strategy on high-query fields (userId, date ranges, tags) and sharding readiness for scale beyond MVP.

---

## 6. Data Requirements

### 6.1 Core Entities (Simplified)

- **User:** profile, auth credentials, subscription tier, preferences.
- **Event:** title, start/end, recurrence rule, linked goal/task, source (native/Google sync).
- **Goal:** title, target date, milestones, status, linked habits/tasks.
- **Habit:** title, frequency, streak data, check-in history.
- **Note:** title, content (rich text), tags, folder, OCR source flag, version history.
- **Transaction:** amount, category, type (income/expense), date, note.
- **Budget:** category, limit, period, current spend.
- **StudyPlan:** subject, topics, deadlines, generated schedule, progress.
- **FocusSession:** start/end, duration, linked task/goal.
- **Notification:** type, payload, channel, read status, scheduled time.
- **File:** owner, type, size, storage URL, linked entity.
- **AIConversation:** messages, timestamps, retrieved-context references (not raw sensitive payloads beyond retention window).

### 6.2 Data Retention & Privacy

- AI conversation logs retained for a defined period (e.g., 90 days) for quality/debugging, then anonymized or purged.
- Financial and health-adjacent data encrypted at rest (AES-256) and in transit (TLS).
- Users can export all their data (data portability) and request full deletion.

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID      | Requirement                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------- |
| NFR-1.1 | 95th percentile API response time shall be under 500ms for non-AI endpoints.                                      |
| NFR-1.2 | AI chat first-token latency shall be under 2 seconds under normal load.                                           |
| NFR-1.3 | System shall support at least 10,000 concurrent WebSocket connections at MVP scale, horizontally scalable beyond. |

### 7.2 Security

| ID      | Requirement                                                                                |
| ------- | ------------------------------------------------------------------------------------------ |
| NFR-2.1 | All traffic shall use TLS 1.2+; no data transmitted in plaintext.                          |
| NFR-2.2 | Passwords shall be hashed using bcrypt/argon2 with per-user salt.                          |
| NFR-2.3 | System shall implement rate limiting and brute-force protection on auth endpoints.         |
| NFR-2.4 | System shall follow OWASP Top 10 mitigation practices (injection, XSS, CSRF, etc.).        |
| NFR-2.5 | Sensitive data (finance, health notes) shall be encrypted at rest.                         |
| NFR-2.6 | System shall support audit logging for admin actions and data access on sensitive modules. |

### 7.3 Reliability & Availability

| ID      | Requirement                                                                           |
| ------- | ------------------------------------------------------------------------------------- |
| NFR-3.1 | System shall target 99.5% uptime for MVP, 99.9% post-scale.                           |
| NFR-3.2 | AI feature degradation (LLM provider outage) shall not block core CRUD functionality. |
| NFR-3.3 | System shall have automated database backups with point-in-time recovery.             |

### 7.4 Usability

| ID      | Requirement                                                                                |
| ------- | ------------------------------------------------------------------------------------------ |
| NFR-4.1 | New user shall be able to complete onboarding and create first task/note within 3 minutes. |
| NFR-4.2 | UI shall maintain consistent design language across Web and Android.                       |

### 7.5 Scalability & Maintainability

| ID      | Requirement                                                                                                                                                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-5.1 | Backend shall be modular (feature-based service structure) to allow independent scaling of AI services.                                                                                                                                              |
| NFR-5.2 | Codebase shall maintain automated test coverage of at least 70% for core business logic.                                                                                                                                                             |
| NFR-5.3 | Backend shall expose interactive API documentation via Swagger UI (OpenAPI spec), kept in sync with routes via inline annotations, and accessible at a dedicated `/api-docs` endpoint (restricted in production, e.g., auth-gated or internal-only). |
| NFR-5.4 | Frontend shall maintain a Storybook instance documenting shared UI components, serving as the reference for the design system referenced in NFR-4.2.                                                                                                 |

### 7.6 Compliance

| ID      | Requirement                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| NFR-6.1 | System shall comply with applicable data protection law (GDPR/DPDP) for user data handling and consent.    |
| NFR-6.2 | System shall provide clear AI-usage disclosure (data sent to third-party LLM providers) in privacy policy. |

---

## 8. Use Case Scenarios (Illustrative)

### UC-1: Ask AI for Monthly Productivity Review

**Actor:** User
**Preconditions:** User has logged habits/tasks for the month.
**Flow:**

1. User opens AI chat and types "How productive was I this month?"
2. System retrieves relevant task/habit/focus-session data via RAG.
3. AI generates a natural-language summary with key stats (completion rate, most productive day, focus hours).
4. User can tap to view the underlying analytics dashboard.

### UC-2: Generate Tomorrow's Study Plan

**Actor:** User
**Preconditions:** User has active study subjects/topics with deadlines.
**Flow:**

1. User asks "Create tomorrow's study plan."
2. AI checks tomorrow's calendar for free time blocks.
3. AI generates a topic-by-time-block plan prioritized by deadline proximity.
4. User confirms; system creates corresponding calendar events.

### UC-3: Receipt-to-Expense via OCR

**Actor:** User
**Flow:**

1. User photographs a receipt in the mobile app.
2. System runs OCR, extracts merchant, amount, date.
3. System pre-fills a transaction entry for user confirmation/edit.
4. User confirms; transaction is saved and budget updated.

### UC-4: Offline Habit Check-in

**Actor:** User (no internet)
**Flow:**

1. User marks a habit complete while offline.
2. App stores the change locally with a pending-sync flag.
3. On reconnect, app syncs the change to the server.
4. Server resolves any conflicts and confirms sync status to the client.

---

## 9. Future Enhancements (Post-MVP / v2+)

- Desktop app (Electron/Tauri).
- Bank account linking for automatic transaction import.
- Health tracking integration (wearables, sleep, steps).
- Collaborative/shared spaces (family or team goals).
- Multi-language support.
- On-device/local AI fallback for privacy-sensitive queries.
- Browser extension for quick capture.

---

## 10. Recommended Tech Stack

This section maps each architectural component to concrete technology choices, so the SRS also doubles as a build reference.

### 10.1 Frontend — Web

| Layer                        | Choice                          | Notes                                                                                                                                                                                         |
| ---------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                    | React (Vite)                    | Fast dev/build tooling                                                                                                                                                                        |
| State management             | Zustand or Redux Toolkit        | Zustand for simplicity at MVP scale                                                                                                                                                           |
| Data fetching/cache          | TanStack Query (React Query)    | Handles server-state caching, retries                                                                                                                                                         |
| Styling                      | Tailwind CSS + shadcn/ui        | Fast, consistent design system                                                                                                                                                                |
| Charts                       | Recharts or Chart.js            | Analytics dashboard                                                                                                                                                                           |
| Forms                        | React Hook Form + Zod           | Validation                                                                                                                                                                                    |
| Realtime                     | Socket.IO client (or native WS) | Chat streaming, live sync                                                                                                                                                                     |
| PWA                          | Vite PWA plugin / Workbox       | Installable web app, offline shell                                                                                                                                                            |
| Animation                    | Framer Motion                   | Component-level transitions, layout animation, gesture-driven UI (modals, cards, page transitions)                                                                                            |
| Animation (complex/timeline) | GSAP                            | Scroll-triggered sequences, landing/marketing page animation, complex multi-step timelines beyond what Framer Motion handles cleanly                                                          |
| Smooth scrolling             | Lenis                           | Inertia-based smooth scroll for the landing page and long dashboard views; pair with GSAP ScrollTrigger for scroll-linked animation                                                           |
| Component documentation      | Storybook                       | Isolated development/testing of UI components (buttons, cards, chart widgets, modals) outside the full app; doubles as a living design-system reference shared between design and engineering |

### 10.2 Mobile — Android

| Layer              | Choice                                                                        | Notes                                     |
| ------------------ | ----------------------------------------------------------------------------- | ----------------------------------------- |
| Framework          | React Native (with Expo, or bare RN if native modules needed early)           | Expo speeds up MVP; eject later if needed |
| Local DB (offline) | WatermelonDB or SQLite (op-sqlite)                                            | Offline-first CRUD + sync                 |
| State management   | Zustand/Redux (shared patterns with web where possible)                       |                                           |
| Push notifications | Firebase Cloud Messaging (FCM) + Notifee for local scheduling                 |                                           |
| Camera/OCR capture | react-native-vision-camera + ML Kit Text Recognition (on-device) or cloud OCR | On-device is faster/cheaper for MVP       |
| Voice input        | react-native-voice or platform Speech-to-Text API                             |                                           |

### 10.3 Backend

| Layer                 | Choice                                                                                                       | Notes                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime/Framework     | Node.js (LTS) + Express or Fastify                                                                           | Fastify for better throughput if performance matters early                                                                                                                       |
| Language              | TypeScript                                                                                                   | Type safety across a growing codebase                                                                                                                                            |
| API style             | REST (versioned `/api/v1`) + WebSocket gateway                                                               | GraphQL is optional but adds complexity not needed at MVP                                                                                                                        |
| Realtime              | Socket.IO (with Redis adapter for multi-instance scaling)                                                    |                                                                                                                                                                                  |
| Auth                  | Passport.js (`passport-jwt` for access/refresh token strategy, `passport-google-oauth20` for Google sign-in) | Standardizes on Passport for all auth strategies rather than mixing custom middleware with OAuth libs                                                                            |
| Validation            | Zod or Joi                                                                                                   |                                                                                                                                                                                  |
| Background jobs/queue | BullMQ (Redis-backed)                                                                                        | OCR, embeddings, daily summaries, notifications                                                                                                                                  |
| ORM/ODM               | Mongoose                                                                                                     | MongoDB schema modeling                                                                                                                                                          |
| API documentation     | Swagger UI (via `swagger-jsdoc` + `swagger-ui-express`)                                                      | Auto-generates interactive `/api-docs` from JSDoc/OpenAPI annotations on routes; keeps API contract discoverable for frontend/mobile devs and any future third-party integrators |

### 10.4 Data Layer

| Layer               | Choice                                                                            | Notes                                                                          |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Primary DB          | MongoDB Atlas                                                                     | Managed, handles flexible document schemas well (notes, chat, varied entities) |
| Cache/session/queue | Redis (managed, e.g., Upstash/ElastiCache)                                        | Sessions, rate limiting, pub/sub, BullMQ                                       |
| Vector search (RAG) | MongoDB Atlas Vector Search (keeps one DB) or Pinecone/Qdrant if scale demands it | Start with Atlas Vector Search to avoid a second DB dependency                 |

### 10.5 AI Services

| Layer                         | Choice                                                                                            | Notes                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestration framework       | LangChain (LangChain.js)                                                                          | Model-agnostic chains/agents, tool-calling abstraction, retriever interface for RAG — makes multi-provider fallback and prompt/tool reuse much easier than hand-rolling it |
| LLM providers (primary chain) | Mistral AI → Groq → Google Gemini (fallback order)                                                | See 10.5.1 below                                                                                                                                                           |
| Embeddings                    | Provider's embedding API (e.g., Mistral Embed) or an open-source model                            | For RAG retrieval over notes/finance/calendar                                                                                                                              |
| OCR                           | On-device ML Kit (mobile) + Google Vision API or Tesseract (server-side fallback for web uploads) |                                                                                                                                                                            |
| Speech-to-text                | Device-native STT (Android) or Whisper API server-side                                            |                                                                                                                                                                            |

#### 10.5.1 Multi-Provider AI Fallback Orchestration

To avoid a single point of failure on any one LLM vendor (rate limits, outages, latency spikes), AI Services shall route every LLM call through a **provider fallback chain** rather than a single hardcoded provider.

**Fallback order:** `Mistral AI → Groq → Gemini`

**Design:**

- Implement as a LangChain `Runnable` with `.withFallbacks()`, wrapping each provider's chat model in the same order. LangChain.js natively supports this pattern, so provider switching doesn't require rewriting prompts or tool schemas per-provider.
- Each provider is wrapped with a per-call timeout (e.g., 8–10s) and a retry budget (e.g., 1 retry) before the chain falls through to the next provider.
- Tool/function-calling schemas (for calendar/task/note creation from chat) shall be defined once and reused across all three providers via LangChain's unified tool-calling interface — avoid provider-specific prompt formats where possible.
- Streaming responses shall be supported per-provider; if a provider fails mid-stream, the client shows a "retrying with backup model" state rather than a hard error.
- Log which provider actually served each request (for cost tracking, latency monitoring, and debugging quality differences between models).

**New functional requirements:**

| ID      | Requirement                                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-2.10 | AI Services shall attempt LLM calls in the order Mistral AI → Groq → Gemini, automatically falling through to the next provider on error, timeout, or rate-limit response.                      |
| FR-2.11 | System shall cap retry/fallback attempts per user request (e.g., max 1 retry per provider) to bound total response latency.                                                                     |
| FR-2.12 | System shall log the serving provider, latency, and token usage per AI request for monitoring and cost analysis.                                                                                |
| FR-2.13 | If all three providers fail, system shall return a graceful in-app error and queue the request for async retry where applicable (e.g., daily summary generation), rather than silently failing. |
| FR-2.14 | Tool-calling schemas (calendar/task/note/finance actions) shall be provider-agnostic, defined once via LangChain and reused across all three providers.                                         |

**Why this order:** This chain is built around free-tier availability to keep AI costs near-zero at MVP/pre-revenue stage — Mistral AI, Groq, and Gemini all offer usable free tiers, which is the primary reason for this provider mix over paid-only options like Claude/OpenAI. This has a few practical implications worth planning for:

- **Free tiers = low rate limits.** This is exactly why the fallback chain matters — you'll likely exhaust one provider's free quota during normal usage spikes (e.g., many users triggering daily summaries around the same time), and the chain absorbs that instead of erroring out.
- **Track usage against each provider's free-tier ceiling** (requests/min, tokens/day) in the logging from FR-2.12, so you get an early warning before silently falling through to the next provider constantly.
- **Free tiers can change or disappear** with little notice — treat the specific provider order as a config value (not hardcoded), so it's a one-line change if a provider tightens or removes its free tier.
- **Data usage policies differ on free tiers** — some providers use free-tier traffic for model training/improvement unless you opt out. Worth checking each provider's current terms before sending real user data (notes, finance entries) through them, and disclosing this in your privacy policy (ties to NFR-6.2).
- **Revisit at scale:** once you have paying users, it's worth comparing the real cost of a paid tier (predictable quota, no training use, better SLAs) against staying on stacked free tiers — the fallback chain pattern still holds, you'd just swap which providers sit in it.

### 10.6 Infrastructure / DevOps

| Layer               | Choice                                                                 | Notes                                      |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| Hosting             | AWS, GCP, or Render/Railway for faster MVP deploys                     | Move to raw AWS/GCP as scale grows         |
| Containers          | Docker + Docker Compose (local), ECS/Fargate or Kubernetes (scale)     | K8s likely overkill pre-PMF                |
| CI/CD               | GitHub Actions                                                         | Build/test/deploy pipelines                |
| Monitoring/Logging  | Sentry (errors), Grafana + Prometheus or a managed APM (e.g., Datadog) |                                            |
| Analytics (product) | PostHog or Mixpanel                                                    | Separate from in-app user-facing analytics |

### 10.7 Payments & Notifications

| Layer   | Choice                                           | Notes                                                      |
| ------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Billing | Stripe (international) or Razorpay (India-first) | Pick based on primary launch market                        |
| Email   | Resend, Postmark, or SES                         | Transactional email (reminders, summaries, password reset) |
| Push    | FCM (Android/Web)                                | Already covered above                                      |

### 10.8 Why this stack fits LifeOS specifically

- **MongoDB over Postgres:** LifeOS entities (notes, chat messages, flexible AI-tool payloads) are naturally document-shaped and vary in structure; Mongo also lets you co-locate vector search instead of running a separate vector DB at MVP.
- **Redis is doing triple duty** (cache, pub/sub for WS scaling, job queue) — keeps infra simple for a small team.
- **Expo for React Native** trades a little native flexibility for much faster MVP velocity; you can eject later once camera/voice/OCR needs get more custom.
- **On-device ML Kit OCR** keeps receipt/note scanning fast and free at small scale; move to a cloud OCR service only if accuracy becomes a problem.
- **LangChain + multi-provider fallback (Mistral → Groq → Gemini):** avoids vendor lock-in and single-point-of-failure on one LLM API; Groq's low latency makes it a strong fast-fallback layer even though its model catalog is narrower, and Gemini's broad availability makes it a solid last resort.
- **GSAP + Framer Motion + Lenis together:** Framer Motion handles everyday React component/page transitions with minimal code; GSAP is reserved for more complex scroll-driven or timeline-based sequences (e.g., a marketing/landing page) where Framer Motion gets awkward; Lenis smooths native scroll so GSAP's ScrollTrigger-based animations feel consistent instead of jittery on trackpads/touch.

---

## 11. Appendix

### 10.1 Suggested MVP Priority Order

1. Auth + core CRUD (Calendar, Notes, Habits, Goals)
2. Notification engine (push + reminders)
3. AI Assistant (basic Q&A + daily summary, RAG over core modules)
4. Finance tracker (manual entry + basic analytics)
5. Offline sync (Android)
6. OCR (notes + receipts)
7. Pomodoro + Study Planner
8. Voice commands
9. Advanced analytics + smart recommendations
10. Desktop app

### 10.2 Open Questions for Stakeholders

- Which LLM provider(s) will be used, and what is the target cost-per-user budget for AI usage?
- Is bank-account linking in scope for MVP or deferred to v2?
- What subscription tiers and pricing are planned (affects rate-limit/quota design)?
- Target launch markets (affects compliance requirements — GDPR vs. DPDP vs. others)?