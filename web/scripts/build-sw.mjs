/**
 * Bundles the LifeOS service worker from its single TypeScript source
 * (src/features/notifications/serviceWorker/sw.ts) into plain JS served at
 * /sw.js. Run via `npm run sw:build` (also chained into `build`).
 */
import { build } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = dirname(dirname(fileURLToPath(import.meta.url)));

try {
  const result = await build({
    entryPoints: [join(webDir, "src/features/notifications/serviceWorker/sw.ts")],
    outfile: join(webDir, "public/sw.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: false,
    logLevel: "info"
  });
  if (result.errors.length > 0) {
    process.exit(1);
  }
  console.log("Built public/sw.js");
} catch (err) {
  console.error(err);
  process.exit(1);
}