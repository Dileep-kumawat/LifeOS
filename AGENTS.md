# Agent Guidelines & Skills

Always adhere to [DESIGN.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/DESIGN.md) for project design and visual language.

## Project Memory & Context Protocol

- **Context Initialization**: Every AI agent **MUST** read [memory.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/memory.md) at the start of a session/task to get immediate, token-efficient context on the monorepo architecture, database models, API endpoints, and workspace layout.
- **Memory Maintenance**: After completing any work (adding features, database models, API routes, screens, or build scripts), agents **MUST** update [memory.md](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOS/memory.md) following the protocol outlined in Section 7 of `memory.md`.

## Required Skills by Domain

### 1. Web & UI Design

- **`shadcn`**: For shadcn/ui components, composition, styling, and UI registry management.
- **`web-design-guidelines`**: For UI/UX reviews, accessibility audits, and web interface best practices.
- **`vercel-react-best-practices`**: For React performance optimization, clean rendering patterns, and bundle efficiency.

### 2. Mobile & Universal (Expo & React Native)

- **`expo-router`**: Navigation architecture, file-based routing, layouts, tabs, and modals.
- **`expo-native-ui`**: Native UI controls, Apple HIG styling, semantic tokens, and animations.
- **`expo-design-system`**: Design tokens, component theme structuring, and shared design system maintenance.
- **`expo-data-fetching`**: Data fetching, caching, React Query / SWR, and offline support.
- **`expo-tailwind-setup`**: Tailwind CSS & NativeWind setup and styling in Expo.
- **`expo-dom`**: Web code running in DOM components and incremental web-to-native migration.
- **`expo-web-to-native`**: End-to-end migration guides from web React to native Expo apps.
- **`expo-project-structure`**: Expo project folder layout and structural conventions.
- **`expo-dev-client`**: Expo development client builds and testing workflow.
- **`expo-upgrade`**: Expo SDK upgrades, dependency alignments, and troubleshooting.
- **`expo-examples`**: Canonical reference patterns and 3rd-party integrations in Expo.

### 3. Tooling & Observability

- **`sentry-cli`**: Sentry CLI operations, error tracking, release handling, and issue inspection.
