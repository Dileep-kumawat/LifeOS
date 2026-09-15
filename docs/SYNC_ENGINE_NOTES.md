# LifeOS Offline Sync Engine Architecture, Lifecycle & Scaling Analysis

**Document Date:** September 2026  
**Module Scope:**  
- Mobile SQLite Sync Engine: [`mobile/src/services/syncEngine.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/mobile/src/services/syncEngine.ts), [`mobile/src/db/schema.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/mobile/src/db/schema.ts), [`mobile/src/db/repositories/localRepo.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/mobile/src/db/repositories/localRepo.ts)  
- Backend Sync Services: [`api/src/routes/sync.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/api/src/routes/sync.ts), [`api/src/services/sync/syncProcessor.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/api/src/services/sync/syncProcessor.ts)  
- Tombstone Storage: [`api/src/models/SyncTombstone.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/api/src/models/SyncTombstone.ts)  
**Status:** Architectural Investigation & Performance Audit (No sync logic modified)

---

## 1. Executive Summary

LifeOS implements a **local-first, bidirectional delta synchronization protocol** designed to support offline mobile client mutations on Expo SDK 52 (React Native with SQLite) and synchronize with MongoDB via an Express API backend.

### Key Architectural Findings:
1. **Delta Computation Strategy:** The synchronization protocol operates as a **delta-only engine** for incremental synchronizations. The mobile client queries dirty SQLite records (`WHERE syncStatus = 'pending'`), and the backend queries documents modified after the client's high-water mark timestamp (`updatedAt > sinceDate`).
2. **Conflict Resolution Mechanism:** Conflict detection is performed on a **per-record basis during push** (not a full-table diff). When concurrent mutations are detected on the same record (`serverUpdatedAt > clientLastModifiedAt`), field-level 3-way merge is evaluated against version history. Domain-specific policies govern resolution: Notes and Finance surface explicit conflict UI; Calendar and Focus sessions apply Last-Write-Wins (LWW) with informational notices; Habit check-ins use idempotent date deduping; Spaced Repetition retains monotonic SM-2 progress.
3. **Tombstone Lifecycle & Accumulation:** `SyncTombstone` records **accumulate indefinitely**. There is **no cleanup mechanism, no TTL index, and no BullMQ pruning job** for active users. Over long-term usage, tombstones accumulate without bound, severely degrading initial pull synchronization performance (`since: null`).
4. **Critical Asymmetric Deletion Bug Identified:**
   - On Mobile: `localRepo.delete` hard-deletes rows directly from SQLite (`DELETE FROM ${tableName} WHERE id = ?`). Because the record is erased immediately, `syncEngine.ts` never sees it during pending scans and hardcodes `operation: "create"` on all pushed mutations. Mobile offline deletions **never** propagate to the server.
   - On Backend: Standard REST deletion endpoints (e.g., `DELETE /api/v1/notes/:id`, `DELETE /api/v1/calendar/events/:id`) execute `findOneAndDelete()` without calling `recordTombstone()`. Web-side deletions **never** propagate to mobile clients.
5. **Scaling Bottlenecks:** While conflict resolution is delta-only, the system contains hidden $O(N)$ and full-table scaling hazards: unpaginated initial sync dumps across 14 collections, sequential un-batched SQLite single-row writes during pull without database transactions, and unbounded tombstone growth.

---

## 2. Current Sync Algorithm Architecture

The LifeOS sync engine operates across 14 mirrored modules:
`categories`, `note_folders`, `subjects`, `topics`, `flashcards`, `habits`, `goals`, `notes`, `events`, `budgets`, `transactions`, `habit_check_ins`, `note_versions`, and `focus_sessions`.

### 2.1 Sync Lifecycle Overview

```
Mobile (SQLite)                                  Backend (MongoDB)
┌───────────────────────┐                        ┌───────────────────────┐
│ 1. Collect pending    │                        │                       │
│    mutations          │                        │                       │
│    (syncStatus=       │                        │                       │
│     'pending')        │                        │                       │
└──────────┬────────────┘                        └───────────────────────┘
           │                                                 │
           │ POST /api/v1/sync/push                          │
           │ { changes: [SyncPushItem] }                     │
           ├────────────────────────────────────────────────>│ 2. Prioritize modules
           │                                                 │    (topological order)
           │                                                 │ 3. Per-item validation
           │                                                 │ 4. 3-way merge & diff
           │                                                 │ 5. Save to MongoDB /
           │                                                 │    record Tombstone
           │                                                 │ 6. Generate new cursor
           │ <SyncPushResponse { results, cursor }>          │
           │<────────────────────────────────────────────────┤
┌──────────┴────────────┐                                    │
│ 7. Mark 'synced' or   │                                    │
│    record conflict in │                                    │
│    sync_conflicts     │                                    │
└──────────┬────────────┘                                    │
           │                                                 │
           │ POST /api/v1/sync/pull                          │
           │ { since: lastStoredCursor }                     │
           ├────────────────────────────────────────────────>│ 8. Query 14 collections
           │                                                 │    (updatedAt > since)
           │                                                 │ 9. Query SyncTombstone
           │                                                 │    (deletedAt > since)
           │ <SyncPullResponse { cursor, changes }>          │
           │<────────────────────────────────────────────────┤
┌──────────┴────────────┐                                    │
│ 10. Ingest upserts    │                                    │
│     (skip pending/    │                                    │
│      conflict rows)   │                                    │
│ 11. Delete tombstones │                                    │
│ 12. Save new cursor   │                                    │
└───────────────────────┘                                    └───────────────────────┘
```

---

### 2.2 Delta Computation

#### A. Push Delta (Client -> Server)
- **Source of Truth:** Mobile SQLite tables defined in [`mobile/src/db/schema.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/mobile/src/db/schema.ts). Every mirrored entity table includes `syncStatus` (`'synced' | 'pending' | 'conflict'`) and `lastModifiedAt` (Unix timestamp in milliseconds).
- **Extraction:** [`syncEngine.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/mobile/src/services/syncEngine.ts) iterates over `SYNC_TABLES` and executes:
  ```sql
  SELECT * FROM ${tableName} WHERE syncStatus = 'pending';
  ```
- **Serialization:** Local JSON string columns (e.g., ProseMirror `content`, `tags`, `milestones`, `frequency`) are parsed back into native JSON objects.
- **Payload Construction:** Emits an array of `SyncPushItem` objects:
  ```typescript
  {
    id: row.id,
    module: tableMapping.module,
    operation: "create", // Hardcoded upsert
    data: parsedData,
    lastModifiedAt: row.lastModifiedAt || Date.now()
  }
  ```

#### B. Topological Ordering (Server Push Processing)
To ensure parent dependencies (e.g., categories, note folders, subjects) are persisted before their dependent children (transactions, notes, topics/flashcards), [`syncProcessor.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/api/src/services/sync/syncProcessor.ts) sorts the incoming batch using `prioritizeChanges`:
1. **Creation / Update Order:**
   1. `categories` -> 2. `note_folders` -> 3. `subjects` -> 4. `topics` -> 5. `flashcards` -> 6. `habits` -> 7. `goals` -> 8. `notes` -> 9. `events` -> 10. `budgets` -> 11. `transactions` -> 12. `habit_check_ins` -> 13. `note_versions` -> 14. `focus_sessions`.
2. **Deletion Order:** Inverted relative to creation order to avoid foreign key / parent reference violations.

#### C. Pull Delta (Server -> Client)
- **Cursor Mechanism:** Client supplies an ISO 8601 string (`since`) retrieved from `tokenStorage` (`lifeos_last_sync_cursor`).
- **Server Delta Query:** In `processSyncPull`, the backend constructs queries across all 14 models:
  ```typescript
  const filter = (extra = {}) => {
    const q = { userId: userObjectId, ...extra };
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      q.updatedAt = { $gt: sinceDate };
    }
    return q;
  };
  ```
- **Tombstone Delta Query:**
  ```typescript
  const tombstoneQuery = { userId: userObjectId };
  if (sinceDate && !isNaN(sinceDate.getTime())) {
    tombstoneQuery.deletedAt = { $gt: sinceDate };
  }
  const tombstones = await SyncTombstone.find(tombstoneQuery).lean();
  ```
- **Initial Sync Fallback:** When `since` is `null` or omitted, `filter()` matches all active records for the user, and `tombstoneQuery` matches all tombstones ever created for that user.

#### D. Client SQLite Ingestion
In `syncEngine.ts`:
1. **Remote Upserts:** For each record in `moduleChanges.upserted`, SQLite is checked:
   ```sql
   SELECT syncStatus, lastModifiedAt FROM ${tableName} WHERE id = ?;
   ```
   If local record exists with `syncStatus === 'pending'` or `'conflict'`, the incoming update is **skipped** to avoid clobbering un-pushed local edits. Otherwise, it executes `INSERT OR REPLACE INTO ${tableName} ...` with `syncStatus = 'synced'`.
2. **Remote Deletions:** For each ID in `moduleChanges.deleted`, if the local row is not `pending` or `conflict`, it runs:
   ```sql
   DELETE FROM ${tableName} WHERE id = ?;
   ```
3. **Cursor Update:** The returned `cursor` timestamp is persisted to `tokenStorage`.

---

### 2.3 Conflict Detection & Resolution Algorithm

Conflict resolution is evaluated **per-entity during push**. LifeOS utilizes a 3-way field-level diff engine in `diffAndMergeFields()`:

```typescript
export function diffAndMergeFields<T>(
  serverDoc: T,
  clientData: Record<string, any>,
  baseDoc: Record<string, any> | null | undefined,
  fields: string[]
): FieldMergeResult<T>
```

#### Diffing Logic:
1. **Normalization:** All candidate values (`Date`, ISO string, JSON object, primitives) are normalized via `normalizeValue()` to prevent false conflicts arising from serialization differences.
2. **Base Comparison:**
   - **Disjoint Modifications:** If client modified Field A from `baseDoc` while server did not, client's Field A is accepted cleanly. If server modified Field B while client did not, server's Field B is retained. Result: `status: "applied"`.
   - **Concurrent True Conflict:** If both client and server modified Field A to differing normalized values, Field A is marked as a true conflict. Result: `status: "conflict"`.
   - **No Base Available:** If `baseDoc` is missing, any discrepancy between client and server fields is flagged as a conflict.

#### Per-Module Conflict Policies:

| Module | Policy | Conflict Mechanism | Resolution UX |
|---|---|---|---|
| **Notes (`notes`)** | 3-Way Merge against `NoteVersion` | Compares `title`, `content`, `contentText`, `folderId`, `tags` against latest `NoteVersion` where `createdAt <= lastModifiedAt`. Clean fields auto-merge. True conflicts fork a new version with `changeSource: "conflict_merge"`. | Surfaced in Mobile `ConflictResolutionScreen`. Returns both states; user chooses `keep_local`, `keep_server`, or `manual_merge`. |
| **Finance (`transactions`, `budgets`)** | 3-Way Field Merge | Compares monetary fields (`amount`, `category`, `type`, `date`, `limit`) against base. Any concurrent edit flags `status: "conflict"` to prevent silent balance distortion. | Blocking UI in `ConflictResolutionScreen`. |
| **Calendar (`events`)** | Last-Write-Wins (LWW) with Notice | Overwrites server record with client payload. If `serverUpdatedTime > clientLastModifiedAt`, returns `conflictNotice` string. | Non-blocking toast/notice informing user that event was updated on another device. |
| **Focus Sessions (`focus_sessions`)** | Last-Write-Wins (LWW) with Notice | Short-lived session updates apply LWW with informational notice if server timestamp is newer. | Non-blocking toast. |
| **Habits (`habits`)** | Field-level definition merge; Check-in dedup | Habit definitions check title/frequency. Check-ins (`habit_check_ins`) deduplicate on compound key `(habitId, date)` with boolean LWW and synchronous streak recalculation. | Transparent auto-resolution; no user intervention. |
| **Study (`flashcards`)** | Progress-Monotonic SM-2 Merge | If concurrent reviews occur, server retains higher `repetitions` and latest `nextReviewDate`, but updates card front/back if edited. | Transparent auto-resolution. |

---

### 2.4 Tombstone Lifecycle (Creation & Consumption)

`SyncTombstone` tracks entity deletions across devices:

```typescript
// api/src/models/SyncTombstone.ts
const syncTombstoneSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    module: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    deletedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

syncTombstoneSchema.index({ userId: 1, deletedAt: 1 });
syncTombstoneSchema.index({ userId: 1, module: 1, entityId: 1 }, { unique: true });
```

#### Current Creation Path:
Inside `api/src/services/sync/syncProcessor.ts`:
```typescript
async function recordTombstone(userId: string, module: string, entityId: string) {
  await SyncTombstone.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), module, entityId },
    { $set: { userId: new Types.ObjectId(userId), module, entityId, deletedAt: new Date() } },
    { upsert: true }
  );
}
```
This is called inside `processSinglePushItem` when `operation === "delete"` for any of the 14 supported modules.

#### Current Consumption Path:
Inside `processSyncPull`:
1. Queries `SyncTombstone.find({ userId, deletedAt: { $gt: sinceDate } })`.
2. Groups deleted entity IDs by `module` in `tombstonesByModule`.
3. Returns `changes[module].deleted: string[]`.
4. Mobile receives deleted IDs and executes `DELETE FROM ${tableName} WHERE id = ?`.

---

## 3. Tombstone Lifecycle & Pruning Findings

### 3.1 Indefinite Accumulation Finding
> [!CAUTION]
> **Finding: `SyncTombstone` records accumulate indefinitely for active users.**
> 
> A complete audit of `/api` reveals that `SyncTombstone.deleteMany` is **only** executed inside `accountPurgeService.ts` when a user account undergoes permanent GDPR/DPDP deletion. There is:
> - **NO TTL index** on `deletedAt` in `SyncTombstone.ts`.
> - **NO scheduled job** (BullMQ or cron) that purges tombstones.
> - **NO multi-device convergence tracking** to identify when all client devices have consumed a tombstone.

### 3.2 Impact of Unbounded Tombstones
1. **Unbounded Storage Growth:** For users with high deletion activity (e.g. daily habit check-ins, completed focus sessions, flashcard cleanups, transaction adjustments), thousands of tombstone records remain in MongoDB indefinitely.
2. **Initial Sync Degradation:** When a user links a new mobile device (or logs in after clearing app storage), the client issues an initial pull with `since: null`. The server executes:
   ```typescript
   SyncTombstone.find({ userId: userObjectId }).lean()
   ```
   This returns **every single entity ever deleted by that user**, serializing large arrays of dead IDs over HTTP and forcing mobile SQLite to execute useless `DELETE FROM` statements on tables that are already empty.

---

### 3.3 Proposed Tombstone Pruning Mechanism (BullMQ Job)

To safely purge tombstones without breaking convergence across multi-device setups, we propose a **Sliding Retention Window with Cursor Invalidation**, reusing the Phase 2 `enqueueJob` infrastructure ([`api/src/services/queue.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/api/src/services/queue.ts)).

#### Proposed Architecture:
1. **Device Registry & Cursor Tracking:**
   Create a lightweight `DeviceSyncState` model (or extend `RefreshToken` / user preferences) capturing:
   ```typescript
   interface DeviceSyncState {
     userId: Types.ObjectId;
     deviceId: string;
     lastSyncedAt: Date;
     appVersion: string;
   }
   ```
   Update `lastSyncedAt` whenever a device calls `/sync/push` or `/sync/pull`.

2. **Retention Policy:**
   - **Standard Window ($N = 30$ days):** Tombstones older than 30 days are candidates for pruning.
   - **Convergence Condition:** If all active devices for `userId` (active within last 30 days) have `lastSyncedAt > tombstone.deletedAt`, the tombstone is safe to delete immediately.
   - **Hard Ceiling ($M = 60$ days):** Any tombstone older than 60 days is purged unconditionally.
   - **Stale Device Reset:** If an offline device attempts to sync with a cursor older than 60 days (`since < now - 60 days`), the server responds with `410 Gone / SyncCursorExpired`. The client must drop local SQLite data and execute a fresh initial pull (`since: null`).

3. **BullMQ Recurring Job Specification:**
   - **Queue:** Reuses singleton `jobsQueue` via `enqueueJob`.
   - **Schedule:** Recurring daily at 03:00 UTC via cron or delayed repeat.
   - **Job Type:** `"sync_tombstone_prune"`.

```typescript
// Proposed implementation blueprint (NOT implemented):
export async function pruneSyncTombstonesJob(): Promise<{ prunedCount: number }> {
  const RETENTION_DAYS = 30;
  const HARD_CEILING_DAYS = 60;
  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const hardCutoffDate = new Date(Date.now() - HARD_CEILING_DAYS * 24 * 60 * 60 * 1000);

  // 1. Purge tombstones beyond hard ceiling unconditionally
  const hardResult = await SyncTombstone.deleteMany({
    deletedAt: { $lt: hardCutoffDate }
  });

  // 2. Identify active users with devices and determine min(lastSyncedAt) per user
  // Delete tombstones older than cutoffDate where all user devices have synced past deletedAt
  const activeDevices = await DeviceSyncState.aggregate([
    { $match: { lastSyncedAt: { $gte: cutoffDate } } },
    { $group: { _id: "$userId", minLastSyncedAt: { $min: "$lastSyncedAt" } } }
  ]);

  let convergedPrunedCount = 0;
  for (const { _id: userId, minLastSyncedAt } of activeDevices) {
    const res = await SyncTombstone.deleteMany({
      userId,
      deletedAt: { $lt: minLastSyncedAt }
    });
    convergedPrunedCount += res.deletedCount || 0;
  }

  logger.info(
    { hardPruned: hardResult.deletedCount, convergedPruned: convergedPrunedCount },
    "Completed sync tombstone pruning job"
  );

  return { prunedCount: (hardResult.deletedCount || 0) + convergedPrunedCount };
}
```

---

## 4. Diff Strategy & Scaling Risk Analysis

### 4.1 Full-Table Diff vs. Delta-Only Finding

> [!NOTE]
> **Finding: Conflict resolution is DELTA-ONLY per entity, NOT a full-table diff.**
> 
> When the mobile client pushes changes:
> 1. Mobile transmits only dirty records (`WHERE syncStatus = 'pending'`).
> 2. Backend iterates over the incoming batch and queries only the single existing document (`_id: item.id`).
> 3. `diffAndMergeFields()` evaluates field-level differences for that single record against its corresponding `NoteVersion` base or existing state.
> 
> At no point does the conflict resolution engine load all user rows into memory to perform an $O(N \times M)$ full-table comparison.

---

### 4.2 Scaling Cost Estimation: What If Full-Table Diff Were Used?

To quantify why full-table diffing was avoided (and why full-table operations in initial sync must be strictly bounded), the following model calculates the cost of full-table diff comparison at **1,000**, **10,000**, and **100,000** records per user across all 14 modules.

**Assumptions:**
- Average document JSON footprint: ~1 KB (Notes with TipTap JSON ~3–5 KB; check-ins/transactions ~400 bytes; weighted average: 1.2 KB).
- Mobile device: Mid-tier Android / iOS device (4 GB RAM, SQLite 3.x, React Native Hermes runtime).
- Network: Standard 4G LTE mobile connection (average 15 Mbps download, 5 Mbps upload, 50ms RTT).

| Metric | 1,000 Records / User | 10,000 Records / User | 100,000 Records / User |
|---|---|---|---|
| **Raw JSON Payload Size** | ~1.2 MB | ~12.0 MB | ~120.0 MB |
| **Gzipped Transfer Size** | ~240 KB | ~2.4 MB | ~24.0 MB |
| **Network Transfer Time (Mobile 4G)** | ~0.4 – 0.8 s | ~3.5 – 6.0 s | ~35 – 70 s |
| **Node.js JSON Serialization Latency** | ~8 ms | ~95 ms | ~1,250 ms *(blocks event loop)* |
| **MongoDB Query Time (Full Scan)** | ~15 ms *(indexed)* | ~180 ms | ~2,200 ms |
| **Mobile Heap Allocation (Hermes/V8)** | ~4 MB | ~45 MB | ~450 MB *(Fatal OOM Crash)* |
| **Diff CPU Time (In-Memory Comparison)**| ~12 ms | ~140 ms | ~1,800 ms *(UI freeze)* |
| **SQLite Batch Insert / Update Time** | ~180 ms *(with txn)* / ~2.8s *(no txn)* | ~1.9 s *(with txn)* / ~28s *(no txn)* | ~22 s *(with txn)* / ~300s+ *(lock crash)* |
| **Overall Verdict** | **Feasible** | **Severe Degraded UX** | **Fatal System Failure** |

#### Critical Risks at Scale:
1. **Node.js Event Loop Blocking:** Serializing 100k records into a single JSON response string blocks the single-threaded Node.js event loop for $>1$ second, causing request queuing and health check timeouts across the entire API process.
2. **Mobile Out-Of-Memory (OOM) Termination:** Mobile apps on iOS/Android typically crash when allocating single contiguous JS heap buffers exceeding 150–200 MB. A 120 MB payload parsed through the React Native bridge will trigger immediate OS process termination.
3. **SQLite Lock & fsync Exhaustion:** Without wrapping operations in an explicit `BEGIN TRANSACTION ... COMMIT`, SQLite flushes to disk (`fsync`) after every single query. At 10,000 records, 10,000 sequential `runAsync` operations take nearly 30 seconds and lock the database completely.

---

### 4.3 Identified Scaling Hazards in the Current Implementation

Even though conflict diffing is delta-only, three severe scaling risks exist in the current codebase:

1. **Unbounded Initial Sync (`since: null`):**
   When a user adds a new device, `processSyncPull` executes 14 parallel `Collection.find({ userId })` queries without pagination or `limit`. For a heavy user with 50,000 transactions and check-ins, this triggers the 10k–100k failure modes modeled above.
2. **Sequential Un-Batched SQLite Writes in `syncEngine.ts`:**
   In lines 268–320 of `syncEngine.ts`:
   ```typescript
   for (const serverRecord of moduleChanges.upserted) {
     const localRecord = await db.getFirstAsync(...);
     ...
     await db.runAsync(`INSERT OR REPLACE INTO ...`);
   }
   ```
   This executes $2 \times N$ individual asynchronous SQLite round-trips over the native bridge without a transaction. If a sync pull returns 1,000 updates, it performs 2,000 separate disk I/O operations sequentially.
3. **Missing Compound Indexes on Pull Queries:**
   While `PERF_INDEX_AUDIT.md` added several compound indexes, `processSyncPull` queries `updatedAt: { $gt: sinceDate }` with `userId`. Collections without compound index `{ userId: 1, updatedAt: 1 }` perform partial collection scans during incremental pulls.

---

## 5. Critical Asymmetric Deletion Bugs Discovered

During investigation of tombstone consumption and generation, two critical design flaws were identified in the current synchronization engine:

### Bug A: Mobile Local Deletions Are Never Synchronized to Backend
- **Root Cause:** In [`mobile/src/db/repositories/localRepo.ts`](file:///c:/Users/dilee_jc6ujqb/Documents/Web%20Development%202.0/projects/LifeOs/mobile/src/db/repositories/localRepo.ts) (line 102), `localRepo.delete` performs a hard delete:
  ```typescript
  async delete(tableName: string, id: string): Promise<boolean> {
    const db = await getDatabase();
    const sql = `DELETE FROM ${tableName} WHERE id = ?;`;
    const res = await db.runAsync(sql, id);
    return res.changes > 0;
  }
  ```
- **Consequence:** Once deleted from SQLite, the entity no longer exists. When `syncEngine.ts` scans for pending changes via `SELECT * FROM ${tableName} WHERE syncStatus = 'pending'`, the deleted record is gone. Furthermore, line 166 of `syncEngine.ts` hardcodes:
  ```typescript
  operation: "create" // Upsert behavior on server
  ```
  The mobile client **never produces `operation: "delete"`**. Any item deleted on mobile while offline or online is deleted locally, but remains forever untouched on the server and on other devices!

### Bug B: Web REST Deletions Never Create Sync Tombstones
- **Root Cause:** Standard REST routes in `/api/src/routes/` (e.g. `notesRouter.delete("/notes/:id")`, `eventsRouter.delete("/calendar/events/:id")`) invoke Mongoose `findOneAndDelete()` directly without calling `recordTombstone(userId, module, id)`.
- **Consequence:** `SyncTombstone` records are only generated when mutations arrive through `POST /api/v1/sync/push`. If a user deletes a note on the Web app, MongoDB deletes the document, but no tombstone is created. The mobile app will **never receive a deletion signal** during pull and will retain the deleted note in its local SQLite database indefinitely.

---

## 6. Prioritized List of Follow-up Tasks (Not Implemented)

The following improvements are documented and prioritized for future implementation passes. **No sync logic has been altered during this investigation task.**

### Priority 0: Critical Data Integrity & Convergence Fixes
- [ ] **P0.1: Implement Local Deletion Tracking in Mobile SQLite**
  - Add a dedicated `local_tombstones` table in SQLite (`id`, `entityId`, `module`, `deletedAt`, `syncStatus`), or replace hard-deletes in `localRepo.delete()` with soft-delete flags (`syncStatus = 'pending'`, `isDeleted = 1`).
  - Update `syncEngine.ts` to collect deleted rows and dispatch `SyncPushItem` with `operation: "delete"`.
  - Upon server `status: "applied"`, purge the record from `local_tombstones`.
- [ ] **P0.2: Instrument Backend REST Delete Endpoints with Tombstone Recording**
  - Add `recordTombstone(userId, module, id)` calls across all REST deletion controllers (`/api/src/routes/notes.ts`, `/calendar.ts`, `/finance.ts`, `/habits.ts`, `/goals.ts`, `/study.ts`, `/focus.ts`).
  - Ensure any server-side deletion (whether initiated via web, mobile sync, or cascade) creates a `SyncTombstone` entry.

### Priority 1: Lifecycle Management & Scaling Safeguards
- [ ] **P1.1: BullMQ Tombstone Pruning Job**
  - Implement scheduled BullMQ job `sync_tombstone_prune` (daily at 03:00 UTC) using the existing `enqueueJob` abstraction.
  - Establish a 30-day sliding window for confirmed synced devices and a 60-day hard cutoff.
- [ ] **P1.2: Device Registry & Cursor Management**
  - Persist device metadata and last sync cursor in a new `DeviceSyncState` MongoDB collection on `/sync/push` and `/sync/pull`.
  - Track per-device convergence to enable safe, automated tombstone purging.
- [ ] **P1.3: Cursor Expiration & Reset Protocol**
  - Return HTTP `410 Gone` with code `SYNC_CURSOR_EXPIRED` if a client presents a cursor older than the hard tombstone retention ceiling (60 days).
  - Implement client-side handler in `syncEngine.ts` to reset SQLite database and trigger a clean initial synchronization.

### Priority 2: Performance & Mobile Throughput Optimization
- [ ] **P2.1: SQLite Batch Transactions on Mobile Pull Ingestion**
  - Wrap the entire pull ingestion loop (lines 264–320 of `syncEngine.ts`) in `await db.withTransactionAsync(async () => { ... })`.
  - Batching all upserts and deletes into a single SQLite transaction will reduce mobile sync disk I/O time by ~90% (from seconds to milliseconds).
- [ ] **P2.2: Paginated Pull Synchronization for High-Volume Accounts**
  - Add `limit` (default 500) and cursor pagination to `POST /api/v1/sync/pull`.
  - Return `hasMore: boolean` to allow clients to stream deltas incrementally rather than receiving a monolithic multi-megabyte response.
- [ ] **P2.3: Compound Index Validation for Sync Queries**
  - Ensure all 14 MongoDB collections possess compound index `{ userId: 1, updatedAt: 1 }` to guarantee index scans on `updatedAt > sinceDate`.
