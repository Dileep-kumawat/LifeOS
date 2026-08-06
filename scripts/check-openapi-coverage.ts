/**
 * OpenAPI coverage lint.
 *
 * Ensures every Express route registered in api/src/routes/*.ts has a matching
 * path + method in the generated swagger-jsdoc spec. Guards against a route
 * being added without its `@openapi` block (which would silently ship
 * undocumented to the Swagger UI / generated clients).
 *
 * Usage: tsx scripts/check-openapi-coverage.ts
 * Exits 0 when fully covered, 1 listing every undocumented route otherwise.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJsdoc from "swagger-jsdoc";

const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../api");
const ROUTES_DIR = join(API_DIR, "src/routes");

const HTTP_METHODS = ["get", "post", "patch", "delete"] as const;
type Method = (typeof HTTP_METHODS)[number];

// Matches `nameRouter.get("/path", ...)` in the route files.
const ROUTE_REGEX = /\b\w+Router\.(get|post|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;

/** Convert an Express path (:id) to an OpenAPI path ({id}). */
function toOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

interface RegisteredRoute {
  file: string;
  method: Method;
  path: string;
  openApiPath: string;
}

function collectRegisteredRoutes(): RegisteredRoute[] {
  const routes: RegisteredRoute[] = [];
  const files = readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

  for (const file of files) {
    const source = readFileSync(join(ROUTES_DIR, file), "utf8");
    for (const match of source.matchAll(ROUTE_REGEX)) {
      const method = match[1].toLowerCase() as Method;
      const path = match[2];
      if (!HTTP_METHODS.includes(method)) continue;
      routes.push({ file, method, path, openApiPath: toOpenApiPath(path) });
    }
  }

  return routes.sort((a, b) => a.file.localeCompare(b.file) || a.path.localeCompare(b.path));
}

function generateSpec() {
  return swaggerJsdoc({
    definition: {
      openapi: "3.0.3",
      info: { title: "LifeOS API", version: "1.0.0" },
      servers: [{ url: "/api/v1" }]
    },
    // Absolute glob (forward slashes — swagger-jsdoc's glob layer does not
    // resolve backslash paths) so the script works regardless of caller cwd.
    apis: [`${ROUTES_DIR.replace(/\\/g, "/")}/*.ts`]
  });
}

function main(): number {
  const routes = collectRegisteredRoutes();
  const spec = generateSpec();
  const paths = (spec as { paths?: Record<string, { [method: string]: unknown }> }).paths ?? {};

  const missing: string[] = [];

  for (const route of routes) {
    const pathDoc = paths[route.openApiPath];
    if (!pathDoc || !pathDoc[route.method]) {
      missing.push(`${route.method.toUpperCase().padEnd(6)} ${route.openApiPath.padEnd(40)} (${route.file})`);
    }
  }

  if (missing.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`✓ OpenAPI coverage OK — ${routes.length} routes documented.`);
    return 0;
  }

  console.error(`✗ ${missing.length} route(s) registered in Express but missing from the OpenAPI spec:`);
  for (const line of missing) {
    console.error(`  ${line}`);
  }
  console.error("Add an `@openapi` block documenting each route (see routes/calendar.ts for the pattern).");
  return 1;
}

process.exitCode = main();
