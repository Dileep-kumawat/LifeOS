import { defineConfig } from "vitest/config";

// Vitest injects `env` into process.env before any test module loads. The
// notification engine reads VAPID keys (required, fail-fast at boot) — tests
// get placeholders so the env schema passes without a real keypair.
export default defineConfig({
  test: {
    environment: "node",
    env: {
      VAPID_PUBLIC_KEY: "test-public-key-placeholder",
      VAPID_PRIVATE_KEY: "test-private-key-placeholder",
      VAPID_SUBJECT: "mailto:test@lifeos.local"
    }
  }
});
