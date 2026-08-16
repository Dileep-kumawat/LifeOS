# LifeOS

Monorepo for LifeOS — AI Personal Operating System. This is the **Phase 0** scaffold: a boring, working skeleton per the build plan. No feature code yet.

## Stack (Phase 0)

- **Monorepo:** npm workspaces — `/api`, `/web`, `/packages/shared`
- **Backend:** Express + TypeScript, Mongoose, Zod validation, pino logging, Swagger via `swagger-jsdoc`/`swagger-ui-express`, Passport.js (JWT strategy active, Google OAuth stubbed for Phase 10)
- **Frontend:** Vite + React + TypeScript, Tailwind, Zustand, TanStack Query, React Router, Storybook
- **Infra:** Docker Compose (MongoDB + Redis + API), GitHub Actions CI

## Prerequisites

- Node.js 22 LTS
- Docker + Docker Compose
- npm 10+

## First-time setup

```bash
git clone <your-repo-url> lifeos
cd lifeos
npm install                     # installs all workspaces
cp api/.env.example api/.env    # adjust secrets as needed
```

## Running locally

**Option A — everything in Docker (API + Mongo + Redis):**

```bash
docker compose up --build
```

Then in a second terminal, run the web app on the host (faster HMR than dockerizing it):

```bash
npm run dev:web
```

- API: http://localhost:4000/api/v1/health
- Swagger UI: http://localhost:4000/api/v1/docs
- Web: http://localhost:5173

**Option B — everything on the host (no Docker for app code, just DB/cache):**

```bash
docker compose up mongo redis
npm run dev:api     # separate terminal
npm run dev:web     # separate terminal
```

If running the API on the host instead of in Docker, edit `api/.env` and point `MONGO_URI`/`REDIS_URL` at `localhost` instead of the Docker service names (see comments in `api/.env.example`).

## Running the Mobile App (Expo)

### Running on Physical Device via USB Cable

#### 📱 Android (via USB Debugging)

1. **Enable USB Debugging on your phone:**
   - Go to **Settings** → **About Phone** → tap **Build Number** 7 times until Developer Mode is unlocked.
   - Go to **Settings** → **System** / **Developer Options** → enable **USB Debugging**.

2. **Connect Phone to PC:**
   - Connect your phone using a USB cable.
   - Set USB connection mode to **File Transfer / MTP**.
   - Accept the prompt on your phone: *"Allow USB debugging from this computer"*.

3. **Verify Device Connection:**
   ```bash
   adb devices
   ```
   *(Your device should show with status `device`)*.

4. **Port Forwarding (Essential for Bundler & Local API access):**
   ```bash
   # Forward Metro bundler port
   adb reverse tcp:8081 tcp:8081

   # Forward LifeOS API backend port (allows mobile app to reach http://localhost:4000)
   adb reverse tcp:4000 tcp:4000
   ```

5. **Start Expo & Run on Android:**
   - Install **Expo Go** from Google Play Store on your phone.
   - Start the mobile app:
     ```bash
     cd mobile
     npx expo start --localhost
     ```
     *(or from workspace root: `npm run dev:mobile`)*
   - Press **`a`** in your terminal to launch and bundle the app directly onto your phone.

---

#### 🍎 iOS (iPhone via USB)

1. **Install Expo Go** from the Apple App Store.
2. **Connect iPhone via Cable** and tap **"Trust This Computer"** when prompted.
3. **Start Expo:**
   ```bash
   cd mobile
   npx expo start --localhost
   ```
4. Open the **Camera app** on your iPhone and scan the QR code displayed in the terminal to open in Expo Go.

---

## Storybook

```bash
npm run storybook --workspace=web
```

Runs at http://localhost:6006. The `Button` component's stories are the first example — every new shared component in `web/src/components` should get a `.stories.tsx` alongside it.

## Scripts (root)

| Command             | What it does                           |
| ------------------- | -------------------------------------- |
| `npm run dev:api`   | Start the API in watch mode            |
| `npm run dev:web`   | Start the Vite dev server              |
| `npm run lint`      | ESLint across the monorepo             |
| `npm run typecheck` | TypeScript project-wide check          |
| `npm run test`      | Run tests in api + web                 |
| `npm run build`     | Production build of shared → api → web |

## Exit criteria for Phase 0 (from the build plan)

- [x] `docker compose up` boots API + DB + Redis
- [x] `npm run dev:web` boots the web app
- [x] Empty `/health` route documented and visible in Swagger UI
- [x] `Button` component has a working Storybook story
- [ ] CI passes on a trivial PR — verify once this is pushed to GitHub and Actions runs

## Auth scaffold

Passport.js is wired per the SRS's auth standardization (`api/src/auth/passport.ts`):

- **JWT strategy** — active now. Verifies Bearer tokens signed with `JWT_ACCESS_SECRET`.
- **`requireAuth` middleware** (`api/src/auth/requireAuth.ts`) — drop it on any route that needs a logged-in user: `v1.get("/me", requireAuth, handler)`. There's nothing to protect yet since no routes exist beyond `/health`.
- **Google OAuth strategy** — present but commented out; deferred to Phase 10 per the build plan. Uncomment once `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.

What's _not_ here yet, because it's Phase 1 work: register/login endpoints, password hashing, refresh-token rotation, RBAC middleware, password reset flow. The strategy above just means Phase 1 only has to add those routes, not set up Passport from scratch.

## What's deliberately not here yet

Per the build plan, Phase 0 explicitly defers:

- Mobile scaffold (Phase 5)
- Any real feature code — auth, calendar, goals, habits, notes all start in Phase 1

## Next step

Phase 1 — Auth + Core CRUD. See `LifeOS_Build_Plan.md`.
