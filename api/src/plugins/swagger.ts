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
| <code>tool_call_proposed</code> | Proposed write action needing confirmation modal (FR-2.4) | <code>{ "conversationId": "...", "messageId": "...", "toolCallId": "tc-101", "toolName": "create_calendar_event", "args": { "title": "Study Session", "startTime": "..." } }</code> |
| <code>tool_call_executed</code> | Execution result after explicit confirmation | <code>{ "conversationId": "...", "messageId": "...", "toolCallId": "tc-101", "toolName": "create_calendar_event", "result": { "message": "Scheduled successfully" } }</code> |
| <code>tool_call_cancelled</code> | Emitted when user cancels proposed action | <code>{ "conversationId": "...", "messageId": "...", "toolCallId": "tc-101" }</code> |
| <code>uncertainty_signal</code> | Emitted when context is insufficient for personal query (FR-2.6) | <code>{ "conversationId": "...", "message": "I don't have enough data in your account to answer that." }</code> |
| <code>chat_error</code> | Error signal when execution or fallback chain fails | <code>{ "conversationId": "...", "message": "All AI providers in fallback chain failed." }</code> |
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
