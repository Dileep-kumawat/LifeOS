import type { Express } from "express";
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
      description: "AI Personal Operating System — REST API",
      version: "1.0.0"
    },
    servers: [{ url: "/api/v1" }]
  },
  apis: ["./src/routes/*.ts"]
});

export function registerSwagger(app: Express) {
  // TODO (Phase 10 hardening, flagged now so it isn't forgotten): gate this
  // behind auth or an IP-allowlist before production deploy. Fine to leave
  // open in local/staging dev.
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(spec));

  if (env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.warn(
      "Swagger UI is mounted at /api/v1/docs with no auth gate — restrict this before real production traffic."
    );
  }
}
