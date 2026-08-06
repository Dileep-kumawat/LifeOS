import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().default("mongodb://localhost:27017/lifeos_dev"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars").default("dev-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars").default("dev-refresh-secret-change-me"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  SENTRY_DSN: z.string().optional(),

  // Optional transactional email keys
  RESEND_API_KEY: z.string().optional(),
  POSTMARK_API_KEY: z.string().optional(),

  // Web Push VAPID keys (Phase 2 notifications). REQUIRED — the API fails
  // fast on boot if any are missing so push senders never start half-wired.
  // webpush.generateVAPIDKeys() produces a public/private pair. The subject
  // is a contact URL or mailto: that appears in the Authorization header.
  VAPID_PUBLIC_KEY: z.string().min(1, "VAPID_PUBLIC_KEY is required for the notification engine"),
  VAPID_PRIVATE_KEY: z.string().min(1, "VAPID_PRIVATE_KEY is required for the notification engine"),
  VAPID_SUBJECT: z.string().min(1, "VAPID_SUBJECT is required for the notification engine"),

  // Optional — unused until the Google OAuth strategy is enabled in Phase 10.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Comma-separated IP allowlist that can view /api/v1/docs. In non-local
  // environments (test/production) Swagger is gated behind this list; when
  // empty it is disabled entirely. Local development stays open by default.
  SWAGGER_ALLOWED_IPS: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:");
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
