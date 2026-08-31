import type { Express, NextFunction, Request, Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env.js";

// Swagger UI is set up in Phase 0 per the build plan ("do this now, not
// later"). Spec is generated from JSDoc `@openapi` blocks on each route file
// (see routes/health.ts) rather than a hand-written parallel spec — point
// swagger-jsdoc's `apis` glob at every routes file as new modules are added.
const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "LifeOS API",
      description: `AI Personal Operating System — REST API & Real-time WebSocket Protocol

<div style="background-color: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 6px; margin: 16px 0 24px 0; color: #dbeafe;">
  <strong style="color: #60a5fa;">Note on Testing:</strong> The real-time AI conversation protocol operates over WebSockets (Socket.IO) for token-by-token streaming, mid-request provider fallback notifications, and interactive write confirmation modals.<br/>
  <span style="font-size: 13px; opacity: 0.9;"><strong>Swagger UI's "Try It Out" interface only supports standard REST HTTP endpoints and cannot execute WebSocket connections.</strong> To test real-time AI chat stream, connect using a Socket.IO v4 client or the LifeOS web app frontend.</span>
</div>

### WebSocket Chat Protocol Documentation (FR-2.3, FR-2.4, FR-2.6, FR-2.10, FR-2.14)

#### 1. Connection & Authentication Handshake
* **WS Endpoint**: <code>ws://&lt;host&gt;:&lt;port&gt;/socket.io/</code> (or via HTTP upgrade with <code>transports: ["websocket", "polling"]</code>)
* **Auth Token**: Pass JWT Access Token via:
  * **Socket.IO Auth Object (Mobile / React Native standard)**: <code>{ auth: { token: "&lt;jwt_access_token&gt;" } }</code>
  * **HTTP Header**: <code>Authorization: Bearer &lt;token&gt;</code>
  * **Browser Cookie (Web standard)**: <code>Cookie: accessToken=&lt;jwt_access_token&gt;</code>

#### 2. Client-to-Server Events (Upstream)
| Event | Action & Description | Example Payload |
| :--- | :--- | :--- |
| <code>send_message</code> | Send user prompt to AI assistant | <code>{ "conversationId"?: "662c9f1e9f0b...", "content": "How productive was I this week?" }</code> |
| <code>confirm_tool_call</code> | Explicit user confirmation of proposed action (FR-2.4) | <code>{ "conversationId": "662c9f1e9f0b...", "messageId": "msg-101", "toolCallId": "tc-101" }</code> |
| <code>cancel_tool_call</code> | Explicit user cancellation of proposed action (FR-2.4) | <code>{ "conversationId": "662c9f1e9f0b...", "messageId": "msg-101", "toolCallId": "tc-101" }</code> |

#### 3. Server-to-Client Events (Downstream)
| Event | Purpose & Trigger | Example Payload |
| :--- | :--- | :--- |
| <code>conversation_created</code> | Emitted when new conversation is auto-initialized | <code>{ "conversationId": "662c9f1e9f0b...", "title": "How productive was I..." }</code> |
| <code>user_message_ack</code> | Acknowledges receipt & DB persistence of user prompt | <code>{ "conversationId": "...", "messageId": "...", "content": "...", "createdAt": "ISO" }</code> |
| <code>chat_stream_chunk</code> | Token-by-token text streaming chunk | <code>{ "conversationId": "...", "chunk": "Based on your habit logs..." }</code> |
| <code>chat_stream_end</code> | Stream completion signal for AI response | <code>{ "conversationId": "...", "messageId": "msg-102" }</code> |
| <code>retrying_with_backup_model</code> | Mid-request fallback indicator (SRS §10.5.1) | <code>{ "provider": "groq", "attempt": 2, "message": "Switching to backup model (groq)..." }</code> |
| <code>tool_call_proposed</code> | Proposed write action needing confirmation modal (FR-2.4) | <code>{ "conversationId": "...", "messageId": "...", "toolCallId": "tc-101", "toolName": "generate_study_plan", "args": { "targetDate": "2026-08-31", "maxStudyHours": 3 } }</code> |
| <code>tool_call_executed</code> | Execution result after explicit confirmation | <code>{ "conversationId": "...", "messageId": "...", "toolCallId": "tc-101", "toolName": "generate_study_plan", "result": { "message": "Created 3 study plan calendar events", "createdEvents": [...] } }</code> |
| <code>tool_call_cancelled</code> | Emitted when user cancels proposed action | <code>{ "conversationId": "...", "messageId": "...", "toolCallId": "tc-101" }</code> |
| <code>uncertainty_signal</code> | Emitted when context is insufficient for personal query (FR-2.6) | <code>{ "conversationId": "...", "message": "I don't have enough data in your account to answer that." }</code> |
| <code>chat_error</code> | Error signal when execution or fallback chain fails | <code>{ "conversationId": "...", "message": "All AI providers in fallback chain failed." }</code> |

#### 4. Available AI Tools & Actions (FR-2.14, FR-7.2 / UC-2)
LifeOS AI conversational agent binds structured LangChain tools. All write actions adhere strictly to the **confirm-before-write** safety paradigm:

| Tool Name | Scope & Description | Parameters & Input Schema | Confirmation & Execution Behavior |
| :--- | :--- | :--- | :--- |
| <code>generate_study_plan</code> | **AI Study Planner (FR-7.2, UC-2):** Scans the user's existing Calendar for free time gaps within an 8am–10pm working window, queries active Study Topics sorted by deadline proximity and priority, and generates an optimized daily study schedule. | <code>targetDate</code> (string, YYYY-MM-DD), <code>maxStudyHours</code> (number, optional, default 4), <code>preferredSubjectId</code> (string, optional) | **Proposed:** Emits <code>tool_call_proposed</code> with candidate sessions.<br/>**Executed:** On user confirmation, writes real <code>Event</code> records with <code>linkedTopicId</code> linking directly to the syllabus topics.<br/>**No Free Time / No Topics (Graceful Fallback):** When no calendar gap &ge; 30m is found or no active topics exist, returns an expected conversational guidance shape explaining the schedule constraint, rather than throwing an error. |
| <code>create_calendar_event</code> | Schedules a single calendar event with optional start/end timestamps and recurrence. | <code>title</code> (string), <code>startTime</code> (ISO date-time), <code>endTime</code> (ISO date-time), <code>recurrenceRule</code> (optional string) | Proposed to user &rarr; writes to <code>Event</code> collection upon confirmation. |
| <code>create_habit</code> | Initializes a new habit tracker with frequency and target counts. | <code>title</code> (string), <code>frequency</code> (daily/weekly), <code>targetCount</code> (number) | Proposed to user &rarr; writes to <code>Habit</code> collection upon confirmation. |
| <code>create_note</code> | Creates a markdown note with title and tags. | <code>title</code> (string), <code>content</code> (string), <code>tags</code> (string[]) | Proposed to user &rarr; writes to <code>Note</code> collection upon confirmation. |
| <code>query_spending</code> | Read-only aggregation query over user financial transactions and budgets. | <code>category</code> (optional string), <code>startDate</code> (optional ISO), <code>endDate</code> (optional ISO) | Read-only tool execution — runs directly without requiring user confirmation modal. |

#### 5. Client-Side Voice Input Layer & Protocol Parity (Phase 8 / FR-9.1, FR-9.2, FR-9.3)
* **Architecture & Zero Backend Surface**: Voice command functionality is implemented strictly as a client-side audio capture and speech-to-text (STT) transcription layer across both Web (Web Speech API + Web Audio API AnalyserNode) and Mobile (on-device native SpeechRecognizer adapter).
* **Protocol Uniformity**: Voice transcriptions feed directly into the existing <code>send_message</code> upstream event with identical JSON payloads (<code>{ "conversationId"?: "...", "content": "..." }</code>). There are **no separate audio-upload, binary streaming, or STT endpoints** on the backend.
* **Tool Calling & Safety Parity**: Destructive and write tool actions triggered via voice input (such as scheduling events, creating habits, or generating study plans) route through the identical <code>tool_call_proposed</code> &rarr; <code>confirm_tool_call</code> confirmation modal safety pipeline (FR-2.4) as typed input with full behavioral parity.

---

### Core Module Architectural Protocols (Phase 7: Study Planner & Focus)

#### A. SuperMemo SM-2 Spaced Repetition Protocol (FR-7.3)
Flashcards use the pure deterministic SM-2 algorithm implemented in <code>@lifeos/shared</code> (<code>calculateNextReview</code>):
* **Self-Assessment Rating Scale (0 to 5):**
  * **0 (Blackout):** Complete failure to recall. Resets repetitions to 0, interval to 1 day.
  * **1 (Incorrect / Remembered):** Incorrect answer, but remembered upon seeing answer. Resets repetitions to 0, interval to 1 day.
  * **2 (Incorrect / Seemed Easy):** Incorrect answer; correct answer seemed easy. Resets repetitions to 0, interval to 1 day.
  * **3 (Correct with Difficulty):** Recalled with serious difficulty. Advances repetitions; decreases ease factor.
  * **4 (Correct with Hesitation):** Correct recall after brief hesitation. Standard SM-2 progression.
  * **5 (Perfect Recall):** Immediate, effortless recall. Increases ease factor, accelerates interval growth.
* **Mathematical Progression:**
  * Ease Factor formula: <code>EF' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))</code>
  * Interval progression: <code>repetitions = 1 &rarr; 1d</code>, <code>repetitions = 2 &rarr; 6d</code>, <code>repetitions &ge; 3 &rarr; round(prevInterval * EF)</code>.
* **Daily Review Queue:** <code>GET /api/v1/study/flashcards/due</code> retrieves all cards where <code>nextReviewDate &le; now</code>, sorted ascending (most overdue first).

#### B. Pomodoro Focus Engine & Time Accumulation Semantics (FR-8.1, FR-8.2, FR-8.4)
* **Precise Elapsed Time Accounting:** <code>accumulatedWorkSeconds</code> tracks raw active seconds strictly during the <code>"work"</code> phase. Active elapsed time is computed as <code>(now - lastResumedAt) / 1000</code>.
* **Pause & Resume Semantics:** Pausing commits pending active work time into <code>accumulatedWorkSeconds</code> / <code>totalFocusMinutes</code> and resets <code>lastResumedAt = null</code>; resuming resets <code>lastResumedAt = new Date()</code>. Paused downtime and break phases (short and long breaks) are strictly excluded from <code>totalFocusMinutes</code>.
* **Abandon Semantics:** Abandoning a session early preserves all partial focus time accumulated up to the exact moment of abandon, preventing data loss in historical analytics (FR-8.3).
* **Cycle Progression:** Standard 25m work / 5m break cycles, switching to a 15m <code>long_break</code> on every 4th cycle. Break completions transition to <code>"work"</code> on cycle <code>N + 1</code>.
* **Client-Triggered vs. Server-Scheduled Alerts:** Pomodoro interval alerts (FR-8.2) are **client-triggered** (when countdown hits 0, client calls <code>POST /focus/sessions/:id/interval-complete</code>, which enqueues notifications via Phase 2's notification engine respecting <code>focusSessionAlerts</code> preferences and DND mode), in contrast to server-scheduled cron notifications (e.g. daily summaries, calendar event reminders).
* **Do Not Disturb (DND) Mode (FR-8.4):** Opt-in DND during active focus sessions suppresses non-critical reminders (calendar events, habit nudges) while strictly preserving interval transition alerts and critical system messages.

#### C. Study Planner Cascade Deletion Architecture (FR-7.1)
Unlike the Notes module where deleting a folder reassigns notes to the root directory (because notes possess standalone semantic value), study topics and flashcards are intrinsically scoped to their syllabus/subject domain. An orphaned topic or flashcard cannot exist without its parent subject context, making complete cascade deletion of all child topics and associated flashcards upon subject deletion the correct domain behavior.
`,
      version: "1.0.0"
    },
    servers: [{ url: "/api/v1" }]
  },
  apis: ["./src/routes/*.ts"]
});

// Docs are a read-only surface that can leak schema internals and CSRF-able
// endpoints, so expose them broadly only in local development. In any
// non-local environment they sit behind an IP allowlist (SWAGGER_ALLOWED_IPS,
// comma-separated). With an empty allowlist, docs are disabled outright.
function normalizeIp(ip: string): string {
  return ip
    .replace(/^::ffff:/, "")
    .replace(/^::1$/, "127.0.0.1")
    .replace(/^\[?(.*?)\]?$/, "$1");
}

function gateSwaggerDocs(req: Request, res: Response, next: NextFunction) {
  const isLocal = env.NODE_ENV === "development";

  if (isLocal) {
    return next();
  }

  const allowed = (env.SWAGGER_ALLOWED_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.length === 0) {
    return res.status(403).json({
      error: "Forbidden",
      message: "API docs are disabled in this environment."
    });
  }

  const ip = normalizeIp(req.ip ?? req.socket.remoteAddress ?? "");
  if (allowed.includes(ip)) {
    return next();
  }

  return res.status(403).json({
    error: "Forbidden",
    message: "Your IP is not allowed to access the API docs."
  });
}

export function registerSwagger(app: Express) {
  const customCss = `
    .swagger-ui .info .description { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .swagger-ui .description table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 16px 0; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; overflow: hidden; background: rgba(0, 0, 0, 0.2); }
    .swagger-ui .description th { background: rgba(255, 255, 255, 0.06); padding: 10px 14px; text-align: left; font-size: 13px; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.12); }
    .swagger-ui .description td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); vertical-align: top; }
    .swagger-ui .description td:first-child { white-space: nowrap; }
    .swagger-ui .description code { background: rgba(59, 130, 246, 0.18); color: #93c5fd; padding: 3px 6px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; border: 1px solid rgba(59, 130, 246, 0.3); }
  `;

  app.use(
    "/api/v1/docs",
    gateSwaggerDocs,
    swaggerUi.serve,
    swaggerUi.setup(spec, { customCss, customSiteTitle: "LifeOS API Documentation" })
  );

  if (env.NODE_ENV !== "development" && !env.SWAGGER_ALLOWED_IPS) {
    console.warn(
      "Swagger UI is mounted at /api/v1/docs but SWAGGER_ALLOWED_IPS is not set — docs will return 403 until an allowlist is configured."
    );
  }
}
