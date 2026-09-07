# LifeOS Privacy Policy & AI Data Disclosure

> **Effective Date**: September 7, 2026  
> **Version**: 1.0.0 (MVP)  
> **Status**: Engineering Compliance Specification (Subject to Formal Legal Counsel Review)

---

> [!IMPORTANT]
> **Legal Review Notice**: This Privacy Policy reflects the actual software architecture and data handling mechanisms implemented in the LifeOS monorepo (Phase 10). It is designed to meet the technical and procedural requirements of the **General Data Protection Regulation (EU GDPR)** and the **India Digital Personal Data Protection Act, 2023 (DPDP Act)**. Formal review and customization by qualified legal counsel in the operating jurisdiction is required prior to public commercial launch.

---

## 1. Data Controller & Contact Information

- **Data Controller**: `[Entity Legal Name: LifeOS Project / Organization Placeholder]`
- **Registered Address**: `[Corporate Address Placeholder]`
- **Jurisdiction**: `[Applicable Jurisdiction Placeholder: e.g. European Union / Republic of India]`
- **Data Protection Officer (DPO) / Privacy Inquiries**: `[privacy@lifeos.example.com]`
- **Grievance Redressal Officer (DPDP)**: `[dpo@lifeos.example.com]`

---

## 2. Personal Data We Collect

LifeOS collects personal data strictly to provide personal productivity, knowledge, and financial management services:

1. **Account Identity & Authentication**:
   - Email address, full name, subscription tier (`free` or `pro`), account role (`user` or `admin`).
   - Cryptographically hashed passwords (using bcrypt, cost factor 12).
   - Linked Google OAuth identifier (`googleId`), if explicitly connected.
   - Active session metadata: device type, browser User-Agent, and anonymized IP addresses.
2. **Productivity & Time Management**:
   - Calendar events, start/end timestamps, descriptions, categories, and recurrence rules (RRULE).
   - Goals, targets, and key results.
   - Habits, frequency schedules, target counts, and daily completion check-in records.
   - Pomodoro focus sessions: work/break intervals, accumulated work seconds, and linked task references.
3. **Notes & Knowledge Base**:
   - Note titles, markdown/ProseMirror structured content, tags, folder hierarchies, and version revision histories.
4. **Financial Management**:
   - Expense and income transactions: amounts, categories, transaction dates, and custom notes.
   - Monthly category budget allocations, alert thresholds, and historical budget performance snapshots.
5. **Study Planner & Spaced Repetition**:
   - Subjects, exam deadlines, syllabus topics, estimated study durations, and flashcards with SuperMemo SM-2 spaced repetition state variables (`easeFactor`, `intervalDays`, `repetitions`, `nextReviewDate`).
6. **AI Conversations & Generated Insights**:
   - Chat session conversation titles and message logs with the AI assistant.
   - Daily life performance summaries and periodic weekly/monthly recommendations grounded in user metrics.
7. **Technical & Synchronization Data**:
   - Offline delta sync tombstones (tracking entity deletions across offline devices).
   - WebPush / Firebase Cloud Messaging (FCM) device endpoints and public keys.
   - Security audit logs: tamper-resistant security events (logins, exports, administrative mutations, access denials).

---

## 3. Lawful Bases for Processing (GDPR Art. 6 & DPDP Act 2023 Sec. 4)

We process personal data under the following legal bases:
- **Contractual Necessity (GDPR Art. 6(1)(b) / DPDP Sec. 4)**: To create and maintain your user account, calculate productivity analytics, sync data across devices, and deliver core LifeOS services requested by you.
- **Consent (GDPR Art. 6(1)(a) / DPDP Sec. 6)**: For optional features, including push notification delivery, browser notifications, camera-based receipt scanning, and voluntary interactions with third-party AI assistant models.
- **Legitimate Interests & Legal Obligations (GDPR Art. 6(1)(c)/(f))**: For platform security, defending against Distributed Denial of Service (DoS) attacks, brute-force protection, and maintaining tamper-resistant security audit trails (NFR-2.6).

---

## 4. Third-Party AI Data Processing & LLM Providers (NFR-6.2)

LifeOS incorporates artificial intelligence features (conversational assistant, daily life summaries, and periodic recommendations). To provide these features, data is transmitted to external Large Language Model (LLM) providers.

### Configured LLM Providers & Fallback Chain
LifeOS employs a resilient provider fallback chain (**Mistral AI → Groq → Google Gemini**):
1. **Primary Provider**: **Mistral AI** (Mistral Large / Mistral Small)
2. **Secondary Provider (Fallback 1)**: **Groq Inc.** (Groq Llama 3 models via GroqCloud LPUs)
3. **Tertiary Provider (Fallback 2)**: **Google LLC** (Google Gemini models via Google AI / Vertex AI)

If a provider encounters rate limits, timeouts, or transient API errors, your prompt and necessary context are automatically routed to the next configured provider in the fallback chain.

### What Data Is Sent to AI Providers?
When you use AI features, the following categories of data may be included in the context window sent to the configured provider:
- Your natural language prompt or query.
- Relevant contextual fragments retrieved via vector similarity search (RAG) over your notes, goals, or calendar events.
- Aggregated numerical performance statistics (e.g. weekly habit completion rates, budget category totals) when generating life summaries or periodic recommendations.

### AI Model Training & Data Retention Disclosure
> [!WARNING]
> **Free-Tier vs. Enterprise Zero-Data-Retention (ZDR) Notice**:
> - **Free / Developer API Tiers**: Under the standard terms of developer free tiers (specifically the Google AI Studio free tier), submitted prompts, responses, and related data may be retained for safety monitoring and **may be reviewed by human reviewers and used by the provider to train and improve AI models**.
> - **Commercial & Enterprise API Tiers**: On paid enterprise plans with Zero Data Retention (ZDR) agreements, providers commit that customer prompts and completions are **never used to train models** and are retained only for temporary operational processing or limited abuse prevention (typically 30 days maximum before automatic deletion).
> - **Deployment Configuration Dependency**: LifeOS administrators are strongly advised to configure production deployments exclusively with commercial enterprise API keys having explicit zero-retention / no-training commitments. When operating under free-tier developer keys, users are hereby notified that AI providers may use interaction data under their respective terms.

### User Choice & AI Opt-Out
- Interaction with the AI Assistant is entirely optional.
- You can use all core LifeOS modules (Calendar, Notes, Habits, Goals, Finance, Study Planner, Pomodoro Timer) without ever triggering an external LLM request.
- Automated daily summaries and periodic recommendations can be toggled off at any time in **Settings → Notification Preferences**.

---

## 5. Security & Data Protection Measures (NFR-6.1)

1. **Encryption in Transit**: All data transmitted between clients (web browser and mobile app) and the LifeOS backend is encrypted using Transport Layer Security (TLS 1.3 / HTTPS).
2. **Encryption at Rest**: Databases, persistent volumes, and backups must be deployed on encrypted storage volumes (e.g. AES-256 encrypted block storage).
3. **Security Audit Logging (NFR-2.6)**:
   - Security-sensitive actions (authentication, export of personal data, admin actions, access denials) are recorded in an append-only, tamper-resistant collection.
   - Client IP addresses are deterministically anonymized (IPv4 last octet zeroed, IPv6 truncated) prior to storage.
   - Passwords, authentication tokens, and sensitive document contents are scrubbed before audit logging.
4. **Rate Limiting & Abuse Prevention**:
   - Strict Redis-backed rate limiters are enforced on authentication, registration, password resets, and user data exports.

---

## 6. Retention Schedules & Data Minimization

- **Active Account Data**: Stored for the lifetime of your active account until you edit, delete, or request account closure.
- **Raw AI Chat Logs & Interaction Payloads**: Subject to a configurable retention cutoff (default: **90 days**, configurable via `AI_LOG_RETENTION_DAYS`). After this period, raw content is redacted or anonymized while keeping non-personal operational metadata (token counts and latency).
- **Security Audit Logs**: Retained for **90 days** for compliance and security defense under a MongoDB TTL index, after which records automatically expire.
- **Account Deletion & 30-Day Purge Window**: Described in Section 7.

---

## 7. Account Deletion & Permanent Purge Lifecycle (FR-1.6)

LifeOS implements a complete two-phase account deletion lifecycle:

```
[User Requests Deletion] 
       │
       ▼
[Account Enters "soft_deleted" State]
  - All active JWT sessions & refresh tokens revoked immediately
  - Authentication cookies cleared
  - Login & API access deterministically blocked (HTTP 403)
  - 30-day grace period commences
       │
       ▼ (30 Calendar Days Elapsed)
[Permanent Cascade Purge Executed]
  - All records across ALL 25 user data collections deleted permanently
  - Scheduled & delayed background jobs cancelled in queues
  - User profile document deleted
  - Tamper-resistant compliance confirmation audit log recorded
```

### Cascade Deletion Scope
The 30-day permanent purge irreversibly deletes all associated records across:
- User profile & authentication credentials
- Active & expired refresh tokens
- Calendar events & recurrence rules
- Goals & key results
- Habits & daily check-ins
- Notes, note folders, and version histories
- Transactions, budgets, budget snapshots, and custom categories
- Study subjects, topics, and flashcards
- Pomodoro focus sessions
- AI conversations, message history, and AI request logs
- Vector embeddings
- Daily summaries & periodic recommendations
- Notification feeds & push subscription endpoints
- Offline sync tombstones

Audit logs are retained until their statutory TTL (90 days) for security compliance verification, stored with anonymized IPs and without personal content.

---

## 8. Your Privacy Rights (GDPR Articles 15–22 & DPDP Act Section 11–14)

Under applicable data protection laws, you possess the following rights:

1. **Right to Access & Data Portability (GDPR Art. 15 & 20 / DPDP Sec. 11)**:
   - You can download a complete, machine-readable JSON archive of all your personal data at any time via **Settings → Privacy & Data → Export My Data** (or API `GET /api/v1/auth/export`).
   - The export contains your full productivity, financial, notes, and study history. Authentication secrets (passwords, session token hashes, push private keys) are strictly excluded for your security.
2. **Right to Rectification (GDPR Art. 16 / DPDP Sec. 12)**:
   - You can edit your profile information, notes, events, and other data directly within the application.
3. **Right to Erasure / Right to be Forgotten (GDPR Art. 17 / DPDP Sec. 12)**:
   - You can delete your account at any time via **Settings → Danger Zone → Delete Account** (or API `DELETE /api/v1/auth/account`).
4. **Right to Withdraw Consent (GDPR Art. 7 / DPDP Sec. 6)**:
   - You may withdraw consent for push notifications, marketing, or Google OAuth account linking via the in-app Settings page without affecting processing carried out prior to withdrawal.
5. **Right to Grievance Redressal (DPDP Act Sec. 13)**:
   - If you have inquiries, complaints, or unresolved concerns regarding your personal data, you may contact our Grievance Redressal Officer at `[privacy@lifeos.example.com]`.

---

## 9. Cookies & Local Storage

- **Authentication Cookies**: LifeOS uses a secure, `HttpOnly`, `SameSite=Strict` cookie to store rotating session refresh tokens. We do not use third-party advertising or tracking cookies.
- **Local Client Storage**: The web and mobile applications store temporary operational state and offline caches (via browser IndexedDB/LocalStorage on web, and SQLite/WatermelonDB on mobile) to support offline-first capabilities.

---

## 10. Policy Updates

We may update this Privacy Policy from time to time to reflect technological, operational, or legal developments. Significant changes will be communicated through in-app notices or email notifications.

*Last Updated: September 7, 2026*
