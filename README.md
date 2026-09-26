# LifeOS — AI Personal Operating System

> **Monorepo Architecture**: Node.js 22 LTS + Express + TypeScript, React 18 + Vite (Web), Expo SDK 52 (React Native Mobile), MongoDB + Redis, Socket.IO, BullMQ, and LangChain.

LifeOS is an intelligent personal management platform unifying calendar scheduling, task & goal tracking, habit formation, Markdown/ProseMirror knowledge management, personal finance with receipt OCR, study planning with SuperMemo SM-2 spaced repetition, Pomodoro focus timers, client-side voice input, and an AI assistant grounded in user metrics.

---

## 1. Monorepo Workspaces

The repository is structured as an `npm` workspaces monorepo:

```
LifeOS/
├── api/                   # Express REST API v1 & Socket.IO real-time server (Port 4000)
├── web/                   # React 18 + Vite + Tailwind CSS Web Application (Port 5173)
├── mobile/                # Expo React Native App with dynamic Floating Sliding Dock
├── mobile-v2/             # Capacitor 7 Android App (pixel-for-pixel responsive web shell)
├── packages/
│   └── shared/            # Shared TypeScript types, Zod schemas, and design tokens
├── scripts/
│   ├── backup/            # Automated database snapshot and encryption scripts
│   ├── restore/           # PITR forensic restore & application compatibility verifier
│   └── load-test/         # Socket.IO 10k WebSocket load testing & concurrency benchmark
├── docs/                  # Launch readiness reports and release checklists
├── DISASTER_RECOVERY.md   # Production MongoDB disaster recovery & PITR runbook
├── PRIVACY_POLICY.md      # GDPR & India DPDP compliance & third-party AI disclosures
└── docker-compose.yml     # Local orchestration for MongoDB, Redis, and API
```

---

## 2. Prerequisites & Environment Setup

- **Node.js**: 22 LTS
- **Package Manager**: npm 10+
- **Database & Cache**: Docker & Docker Compose (or local MongoDB 7+ and Redis 6+)
- **Mobile Tooling**: Expo CLI (`npx expo`), Android Studio / Xcode / Expo Go app

### First-Time Setup

```bash
# 1. Clone repository
git clone <repo-url> lifeos
cd lifeos

# 2. Install all workspace dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
cp api/.env.example api/.env
```

> [!NOTE]
> Review `.env.example` for required production variables (JWT secrets, VAPID push notification keys, MongoDB Atlas connection strings, and optional Google OAuth / AI provider keys).

---

## 3. Running Locally

### Option A: Hybrid Dev (Recommended)
Run databases in Docker and frontends/backends on host for instant HMR and debugging:

```bash
# 1. Start MongoDB and Redis in background
docker compose up -d mongo redis

# 2. Start services in separate terminals
npm run dev:api       # Express API in watch mode (http://localhost:4000)
npm run dev:web       # Vite Web App (http://localhost:5173)
npm run dev:mobile    # Expo Metro bundler (http://localhost:8081)
```

### Option B: Full Docker Compose
```bash
docker compose up --build
```

### Mobile Physical Device Debugging (Android via USB)
```bash
# Enable USB Debugging on Android, connect USB cable, then forward ports:
adb reverse tcp:8081 tcp:8081    # Metro bundler
adb reverse tcp:4000 tcp:4000    # LifeOS API backend

cd mobile && npx expo start --localhost
# Press 'a' in terminal to launch on connected Android device
```

### Mobile v2 (Capacitor Android Native Shell)

LifeOS Mobile v2 wraps the responsive web app in a native Android shell with full-bleed WebView, Chrome Custom Tabs OAuth (`lifeos://oauth`), native status bar, and FCM push notifications.

```bash
# 1. Configure mobile-v2/.env (or leave defaults for deployed Vercel site):
# CAPACITOR_WEB_URL=https://life-os-web-puce.vercel.app
# CAPACITOR_DEV=true

# 2. Run directly on connected device or emulator:
cd mobile-v2
npm run cap:run

# Or install pre-built APK directly via ADB:
adb install -r "mobile-v2/android/app/build/outputs/apk/debug/app-debug.apk"
adb shell am start -n com.lifeos.v2/.MainActivity
```
See [mobile-v2/README.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile-v2/README.md) for full configuration, Chrome DevTools remote debugging, and Android Studio workflows.

### Building & Sharing Standalone Android APK (EAS Cloud Build)

To build a standalone `.apk` file to install on physical devices or share directly with others (via WhatsApp, Google Drive, Telegram, etc.):

```bash
# 1. Navigate to the mobile workspace
cd mobile

# 2. Log in to your Expo account (free account at https://expo.dev/signup)
npx eas login

# 3. Build standalone APK using the pre-configured preview profile
npx eas build -p android --profile preview
```

> [!TIP]
> - **Pre-configured Profile**: The `preview` profile in [mobile/eas.json](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/mobile/eas.json) specifies `buildType: "apk"` and `EXPO_PUBLIC_APP_ENV: "production"`. This points the APK to the deployed cloud backend (`https://lifeos-api-hqcz.onrender.com`), so anyone installing the APK can register, log in, and use LifeOS without needing a local development server running.
> - **Keystore prompt**: When prompted *"Generate a new Android Keystore?"*, select **Yes** (Expo manages the signing key automatically).
> - **Download & Share**: When the build completes (~5–10 mins), EAS outputs a direct download URL and QR code for the `.apk` file.
> - **Installing on Android**: Android will prompt to allow installations from unknown sources (*Settings → Allow from this source*).

### Publishing Over-The-Air (OTA) Updates (Without Rebuilding APKs)

LifeOS Mobile is configured with `expo-updates`. Once users have installed an APK built with `expo-updates`, you can deliver UI changes, bug fixes, and feature additions instantly over-the-air:

```bash
# 1. Navigate to the mobile workspace
cd mobile

# 2. Publish update over-the-air
npx eas update --auto
```

> [!TIP]
> - **Zero-reinstall updates**: EAS bundles your updated React Native code and uploads it to Expo's update servers. The next time users open the LifeOS app on their phones, the new version loads automatically in the background without needing to download a new `.apk`.
> - **When to use `eas update`**: Any JavaScript, TypeScript, React components, Zustand state, styling, or bug fixes.
> - **When a new `eas build` is required**: Only when adding or removing native libraries (packages requiring custom Android code) or upgrading the Expo SDK.



---

## 4. Key Scripts Reference

| Command | Action | Scope |
| :--- | :--- | :--- |
| `npm run build` | Compile monorepo (`shared` → `api` → `web`) | Monorepo root |
| `npm run typecheck` | Run TypeScript type checks across all workspaces | All workspaces |
| `npm run lint` | Run ESLint across all workspaces | All workspaces |
| `npm run test` | Run automated test suites (over 400 tests) | `api`, `web`, `mobile` |
| `npm run check:openapi` | Verify 100% Swagger/OpenAPI documentation coverage | `api` routes |
| `npm run storybook --workspace=web` | Start Storybook dev server (Port 6006) | `web` |
| `npm run build-storybook --workspace=web` | Build static Storybook documentation | `web` |

---

## 5. Architecture & Security Highlights

### Authentication & Authorization (FR-1.1, NFR-2.2, NFR-2.3)
- **Dual Auth**: Email & password authentication (bcrypt cost factor 12) + Google OAuth 2.0 with cryptographic server-side ID token verification.
- **Session Tokens**: Short-lived (15 min) JWT access tokens + rotating single-use refresh tokens stored as salted hashes in MongoDB.
- **Rate Limiting**: Granular Redis-backed rate limiters on login (5/15m), register (5/15m), password reset (3/15m), and token refresh (60/15m).
- **Hardened HTTP**: Express mounts `helmet` with HSTS, CSP, Frameguard (`DENY`), and cross-origin isolation.

### Real-Time & Concurrency (NFR-1.3)
- **Socket.IO Clustering**: Backed by `@socket.io/redis-adapter` for horizontal multi-instance pub/sub and fan-out.
- **AI Streaming**: Real-time token streaming with subscription tier rate-limit enforcement (`checkAiRateLimit`).
- **Load Testing**: Automated benchmark suite in `scripts/load-test/` (`ws-load-test.ts`, `horizontal-scale-test.ts`).

### Privacy & Compliance (NFR-6.1, NFR-6.2, FR-1.6)
- **Data Portability**: `GET /api/v1/auth/export` generates structured JSON export across all 25 user collections (rate limited to 5 req/hr).
- **Cascade Deletion**: 30-day grace period with cascade hard-purge of user data across 25 collections and BullMQ background jobs.
- **AI Transparency**: Detailed in [PRIVACY_POLICY.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/PRIVACY_POLICY.md) documenting provider fallback order (**Mistral AI → Groq → Google Gemini**), zero-data-retention standards, and user opt-out toggles.

---

## 6. Disaster Recovery & Documentation Links

- **Disaster Recovery Runbook**: [DISASTER_RECOVERY.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/DISASTER_RECOVERY.md) — Step-by-step procedures for MongoDB Atlas continuous PITR, isolated recovery, and application compatibility verification.
- **Launch Readiness Report**: [docs/PHASE10_LAUNCH_READINESS.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/docs/PHASE10_LAUNCH_READINESS.md) — Comprehensive 13-section audit, requirement traceability table, and launch recommendation.
- **Launch Checklist**: [docs/LAUNCH_CHECKLIST.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/docs/LAUNCH_CHECKLIST.md) — Operational sign-off checklist across Auth, Security, Performance, Privacy, and Reliability.
- **Privacy Policy**: [PRIVACY_POLICY.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/PRIVACY_POLICY.md) — Data inventory, lawful processing bases, and AI provider disclosures.
- **API Documentation**: Interactive Swagger UI at `http://localhost:4000/api/v1/docs` (127 documented routes).
