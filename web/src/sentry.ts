// Sentry wiring for the web app — same rationale as api/src/sentry.ts,
// stubbed now so it isn't forgotten later.
//
// To activate: `npm install --workspace=web @sentry/react`, set
// VITE_SENTRY_DSN in a web/.env, then call initSentry() at the top of
// src/main.tsx before ReactDOM.createRoot(...).render(...).
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  if (!dsn) {
    console.warn("VITE_SENTRY_DSN not set — error tracking disabled (fine for local dev).");
    return;
  }

  // Sentry.init({ dsn, integrations: [Sentry.browserTracingIntegration()], tracesSampleRate: 0.1 });
}
