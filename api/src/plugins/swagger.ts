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
      description: "AI Personal Operating System — REST API",
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
  app.use("/api/v1/docs", gateSwaggerDocs, swaggerUi.serve, swaggerUi.setup(spec));

  if (env.NODE_ENV !== "development" && !env.SWAGGER_ALLOWED_IPS) {
    console.warn(
      "Swagger UI is mounted at /api/v1/docs but SWAGGER_ALLOWED_IPS is not set — docs will return 403 until an allowlist is configured."
    );
  }
}
