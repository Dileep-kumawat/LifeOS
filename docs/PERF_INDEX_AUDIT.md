# MongoDB Index Performance Audit & Optimization Report

**Audit Date:** September 2026  
**Auditor:** LifeOS Core Performance & Database Engineering  
**Scope:** MongoDB collections backing all Express routes (`/api/src/routes`) and service layers (`/api/src/services`), focusing on high-frequency, userId-scoped CRUD, date-bounded analytics aggregations (capped at 366 days), spaced repetition queues, Pomodoro focus aggregations, and local-first sync workloads.

---

## 1. Executive Summary

A comprehensive audit was conducted across all 27 Mongoose models in `/api/src/models` by cross-referencing schema indexes against actual production query shapes in `/api/src/routes` and `/api/src/services`.

### Key Findings:
1. **Unindexed Compound Sorts in High-Frequency Queries:** Several high-volume queries (e.g. `GET /study/topics/:id`, `GET /focus/sessions`, `GET /notes`, `GET /goals`, `GET /notifications`) filter by multi-tenant ownership (`userId`) and category/status, but request reverse chronological or date sorting (`startedAt: -1`, `updatedAt: -1`, `createdAt: -1`, `scheduledFor: -1`). Because existing indexes lack the trailing sort field, MongoDB executes a blocking in-memory `SORT` stage rather than streaming pre-sorted index keys.
2. **Parallel Topic Detail Aggregation Optimization:** `GET /api/v1/study/topics/:id` executes 4 parallel operations: child flashcards, focus stats aggregation, top 10 recent focus sessions, and planned calendar events. While flashcards are supported by `{ userId: 1, topicId: 1, createdAt: -1 }`, the focus session query `{ userId, linkedType: "topic", linkedId: id }` sorted by `startedAt: -1` and the planned event query `{ userId, linkedTopicId }` sorted by `startTime: 1` both lacked compound sort support, resulting in unindexed document scans.
3. **High-Frequency Budget Recalculation:** `recalculateBudgetSpend` runs on every transaction mutation (create, update, delete, offline batch push) and monthly rollover. It filters on `{ userId, type: "expense", category, date: { $gte, $lte } }`. Existing indexes split `type` and `category` into separate indexes (`{ userId, type, date }` vs `{ userId, category, date }`), forcing MongoDB to index-scan one and filter the other in document memory. A dedicated compound index resolves this bottleneck.
4. **Non-Destructive Migration:** In accordance with constraints, no existing indexes were modified or dropped, and no application queries were altered. All recommendations are purely additive and executed idempotently via `scripts/db/create-indexes.ts`.

---

## 2. Comprehensive Model Index Inventory (27 Models)

The following table documents every model in `/api/src/models`, its corresponding collection name, and its existing standing indexes:

| # | Model | Collection | Current Indexes |
|---|---|---|---|
| 1 | `AiRequestLog` | `airequestlogs` | `_id_`, `userId_1`, `requestType_1`, `status_1`, `timestamp_1`, `providerServed_1_timestamp_-1`, `userId_1_timestamp_-1` |
| 2 | `AuditLog` | `auditlogs` | `_id_`, `timestamp_1`, `actorUserId_1`, `actorRole_1`, `action_1`, `resourceType_1`, `targetUserId_1`, `outcome_1`, `timestamp_-1`, `actorUserId_1_timestamp_-1`, `targetUserId_1_timestamp_-1`, `action_1_timestamp_-1`, `outcome_1_timestamp_-1`, `correlationId_1`, `expiresAt_1` (TTL: 0s) |
| 3 | `Budget` | `budgets` | `_id_`, `userId_1`, `category_1`, `period_1`, `userId_1_category_1_period_1` (unique) |
| 4 | `BudgetHistory` | `budgethistories` | `_id_`, `userId_1`, `budgetId_1`, `userId_1_category_1_periodStart_-1` |
| 5 | `Category` | `categories` | `_id_`, `userId_1`, `type_1`, `userId_1_type_1_name_1` (unique) |
| 6 | `Conversation` | `conversations` | `_id_`, `userId_1`, `userId_1_updatedAt_-1` |
| 7 | `Embedding` | `embeddings` | `_id_`, `userId_1`, `sourceType_1`, `sourceId_1`, `sourceType_1_sourceId_1` (unique), `userId_1_sourceType_1` |
| 8 | `Event` | `events` | `_id_`, `userId_1`, `isOverride_1`, `parentEventId_1`, `linkedTopicId_1`, `userId_1_startTime_1` |
| 9 | `Flashcard` | `flashcards` | `_id_`, `userId_1`, `subjectId_1`, `topicId_1`, `nextReviewDate_1`, `userId_1_nextReviewDate_1`, `userId_1_topicId_1_createdAt_-1` |
| 10 | `FocusSession` | `focussessions` | `_id_`, `userId_1`, `status_1`, `userId_1_status_1`, `userId_1_startedAt_-1`, `userId_1_linkedType_1_linkedId_1` |
| 11 | `Goal` | `goals` | `_id_`, `userId_1`, `status_1`, `userId_1_status_1` |
| 12 | `Habit` | `habits` | `_id_`, `userId_1`, `userId_1_createdAt_-1` |
| 13 | `HabitCheckIn` | `habitcheckins` | `_id_`, `habitId_1`, `userId_1`, `habitId_1_date_1` (unique), `userId_1_date_1` |
| 14 | `Message` | `messages` | `_id_`, `conversationId_1`, `userId_1`, `conversationId_1_createdAt_1`, `userId_1_createdAt_-1` |
| 15 | `Note` | `notes` | `_id_`, `userId_1`, `tags_1`, `userId_1_folderId_1_updatedAt_-1`, `notes_text` (`title`: 10, `contentText`: 1) |
| 16 | `NoteFolder` | `notefolders` | `_id_`, `userId_1`, `userId_1_parentFolderId_1_name_1` |
| 17 | `NoteVersion` | `noteversions` | `_id_`, `noteId_1`, `userId_1`, `noteId_1_versionNumber_-1`, `userId_1_noteId_1` |
| 18 | `Notification` | `notifications` | `_id_`, `userId_1`, `type_1`, `deliveryStatus_1`, `readStatus_1`, `scheduledFor_1`, `userId_1_readStatus_1`, `deliveryStatus_1_scheduledFor_1` |
| 19 | `PushSubscription` | `pushsubscriptions` | `_id_`, `userId_1`, `type_1`, `endpoint_1` (unique), `userId_1_endpoint_1` |
| 20 | `Recommendation` | `recommendations` | `_id_`, `userId_1`, `period_1`, `periodStart_1`, `userId_1_period_1_periodStart_1` (unique), `userId_1_period_1_generatedAt_-1` |
| 21 | `RefreshToken` | `refreshtokens` | `_id_`, `tokenHash_1`, `userId_1`, `familyId_1`, `expiresAt_1` |
| 22 | `Subject` | `subjects` | `_id_`, `userId_1`, `userId_1_createdAt_-1` |
| 23 | `Summary` | `summaries` | `_id_`, `userId_1`, `date_1`, `userId_1_date_1` (unique) |
| 24 | `SyncTombstone` | `synctombstones` | `_id_`, `userId_1`, `module_1`, `entityId_1`, `deletedAt_1`, `userId_1_deletedAt_1`, `userId_1_module_1_entityId_1` (unique) |
| 25 | `Topic` | `topics` | `_id_`, `userId_1`, `subjectId_1`, `priority_1`, `status_1`, `userId_1_subjectId_1_createdAt_-1`, `userId_1_deadline_1` |
| 26 | `Transaction` | `transactions` | `_id_`, `userId_1`, `type_1`, `category_1`, `date_1`, `userId_1_date_-1`, `userId_1_type_1_date_-1`, `userId_1_category_1_date_-1` |
| 27 | `User` | `users` | `_id_`, `email_1` (unique), `status_1`, `googleId_1` (sparse) |

---

## 3. Query Shape Cross-Reference & Bottleneck Analysis

### A. Analytics Aggregations (`/api/src/routes/analytics*` & backing services)
1. **`GET /api/v1/analytics/productivity`** (`productivityAnalyticsService.ts`):
   - `Habit.find({ userId })`: Fully supported by index `{ userId: 1, createdAt: -1 }` (prefix match on `userId`).
   - `HabitCheckIn.find({ userId, date: { $gte: startDateIso, $lte: endDateIso } })`: Fully supported by compound index `{ userId: 1, date: 1 }` (Equality on `userId`, Range on `date`).
   - `FocusSession.aggregate`: `$match: { userId, startedAt: { $gte: startBound, $lte: endBound } }` followed by facet groups on status, polymorphic links, and date strings. Fully supported by compound index `{ userId: 1, startedAt: -1 }`.
2. **`GET /api/v1/analytics/finance`** (`financeAnalyticsService.ts`):
   - `Transaction.aggregate`: `$match: { userId, date: { $gte: startBound, $lte: endBound } }` followed by category breakdown and daily/monthly trends. Fully supported by compound index `{ userId: 1, date: -1 }`.
   - `Budget.find({ userId })`: Fully supported by unique index `{ userId: 1, category: 1, period: 1 }` (prefix match on `userId`).

### B. Calendar Module (`/api/src/routes/calendar.ts`)
- `Event.find(overlapWindowQuery(userId, start, end))`: Uses `userId` and `startTime` bounds (`startTime: { $lt: end }`). Supported by `{ userId: 1, startTime: 1 }`.
- **Bottleneck Identified:** Study Topic Planned Events query in `studyRouter.get("/study/topics/:id")`:
  ```typescript
  Event.find({ userId, linkedTopicId: topic._id }).sort({ startTime: 1 })
  ```
  `Event` only possesses single-field `linkedTopicId: 1` and `{ userId: 1, startTime: 1 }`. The query must execute an unindexed filter or in-memory sort.

### C. Finance Module (`/api/src/routes/finance.ts` & `budgetService.ts`)
- `Transaction.find(filter).sort({ date: -1, _id: -1 })`: Supports category, type, and date range filters.
- **Bottleneck Identified:** `recalculateBudgetSpend` in `budgetService.ts` (lines 45–53 & 115–123):
  ```typescript
  Transaction.aggregate([
    {
      $match: {
        userId,
        type: "expense",
        category,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    { $group: { _id: null, totalSpend: { $sum: "$amount" } } }
  ]);
  ```
  This is the most critical financial query in the system. The existing compound indexes are `{ userId: 1, type: 1, date: -1 }` and `{ userId: 1, category: 1, date: -1 }`. Neither covers both `category` and `type`, forcing partial index scans and document heap filtering.

### D. Habits Module (`/api/src/routes/habits.ts`)
- `Habit.find({ userId }).sort({ createdAt: -1 })`: Supported by `{ userId: 1, createdAt: -1 }`.
- **Bottleneck Identified:** Habit check-in history heatmap and streak recalculations:
  ```typescript
  // GET /habits/:id/check-ins
  HabitCheckIn.find({ habitId: id, userId, date: { $gte, $lte } }).sort({ date: 1 })
  // updateHabitStats
  HabitCheckIn.find({ habitId: habit._id, userId }).select("date completed")
  // DELETE /habits/:id
  HabitCheckIn.deleteMany({ habitId: id, userId })
  ```
  `HabitCheckIn` only has `{ habitId: 1, date: 1 }` (without `userId`) and `{ userId: 1, date: 1 }` (without `habitId`). Multi-tenant lookups on a specific habit must evaluate documents outside the index.

### E. Focus Module (`/api/src/routes/focus.ts` & `study.ts`)
- **Bottleneck Identified:** Topic detail view parallel query in `study.ts` (line 634):
  ```typescript
  FocusSession.find({ userId, linkedType: "topic", linkedId: id })
    .sort({ startedAt: -1 })
    .limit(10)
  ```
  The existing index is `{ userId: 1, linkedType: 1, linkedId: 1 }`, which lacks `startedAt: -1`. MongoDB must fetch every session ever logged for this topic and run an in-memory sort to return the top 10.
- **Bottleneck Identified:** Active session lookup in `focus.ts` (line 302) and status-filtered session list:
  ```typescript
  FocusSession.findOne({ userId, status: { $in: ["active", "paused"] } }).sort({ startedAt: -1 })
  FocusSession.find({ userId, status }).sort({ startedAt: -1 })
  ```
  The existing index is `{ userId: 1, status: 1 }`. Lacking `startedAt`, status-filtered queries incur blocking sorts.

### F. Notes Module (`/api/src/routes/notes.ts` & `noteSearch.ts`)
- `buildNotesListFilter` produces:
  ```typescript
  // Root / all-notes view
  Note.find({ userId }).sort({ updatedAt: -1 })
  // Tag-filtered view
  Note.find({ userId, tags: tag }).sort({ updatedAt: -1 })
  ```
- **Bottleneck Identified:** The only existing compound index is `{ userId: 1, folderId: 1, updatedAt: -1 }`. Under MongoDB index prefix rules, an index on `{ A, B, C }` **cannot** satisfy a sort on `C` unless `B` (`folderId`) is provided as an equality match. When viewing root notes (`folderId` omitted), MongoDB cannot use this index for sorting. Similarly, `{ tags: 1 }` lacks `userId` and `updatedAt`.

### G. Goals Module (`/api/src/routes/goals.ts`)
- `Goal.find(filter).sort({ createdAt: -1 })`: Filter is either `{ userId }` or `{ userId, status }`.
- **Bottleneck Identified:** `Goal` only has `{ userId: 1, status: 1 }`. Lacks `createdAt: -1` for both all-goals and status-filtered views.

### H. Notifications Module (`/api/src/routes/notifications.ts`)
- `Notification.find(filter).sort({ scheduledFor: -1, createdAt: -1 })`: Filter is `{ userId }` or `{ userId, readStatus }`.
- **Bottleneck Identified:** Existing index is `{ userId: 1, readStatus: 1 }`. Lacks `scheduledFor: -1`, forcing in-memory sorts for all notification feeds.

### I. Study Planner Flashcards & Topics (`/api/src/routes/study.ts`)
- `Flashcard.find({ userId, subjectId }).sort({ createdAt: -1 })`: Filter by subject. `Flashcard` has `{ userId: 1, topicId: 1, createdAt: -1 }`, but lacks an equivalent for `subjectId`.
- `Topic.find({ userId }).sort({ createdAt: -1 })`: Listing topics without specifying `subjectId`. Currently only indexed as `{ userId: 1, subjectId: 1, createdAt: -1 }`.

---

## 4. Index Audit & Recommendation Matrix

The following table details every identified query pattern lacking optimal compound index coverage, the current index behavior, the recommended replacement/addition, and the technical rationale:

| Collection | Query Pattern | Current Index | Recommended Index | Rationale |
|---|---|---|---|---|
| `events` | `find({ userId, linkedTopicId }).sort({ startTime: 1 })` | `linkedTopicId: 1` & `userId_1_startTime_1` | `{ userId: 1, linkedTopicId: 1, startTime: 1 }` | Satisfies the ESR (Equality, Sort, Range) rule for topic study plan events in `GET /study/topics/:id`, eliminating index intersection and in-memory sorting. |
| `transactions` | `aggregate([{ $match: { userId, type: "expense", category, date: { $gte, $lte } } }])` & `find({ userId, category, type, date: ... })` | `userId_1_type_1_date_-1` & `userId_1_category_1_date_-1` | `{ userId: 1, category: 1, type: 1, date: -1 }` | Unifies category and type equality filters before the date range, optimizing the high-frequency `recalculateBudgetSpend` hook executed on every transaction mutation. |
| `habitcheckins` | `find({ userId, habitId, date: { $gte, $lte } }).sort({ date: 1 })` & `find({ userId, habitId })` | `habitId_1_date_1` (unique) & `userId_1_date_1` | `{ userId: 1, habitId: 1, date: 1 }` | Ensures multi-tenant isolation and covers habit check-in streak calculations (`updateHabitStats`) and heatmap date range retrieval with zero memory sorting. |
| `focussessions` | `find({ userId, linkedType, linkedId }).sort({ startedAt: -1 }).limit(10)` | `userId_1_linkedType_1_linkedId_1` | `{ userId: 1, linkedType: 1, linkedId: 1, startedAt: -1 }` | Directly satisfies topic/goal detail view recent sessions query in `GET /study/topics/:id`, converting a blocking in-memory sort into an indexed forward-scan. |
| `focussessions` | `findOne({ userId, status: { $in: [...] } }).sort({ startedAt: -1 })` & `find({ userId, status }).sort({ startedAt: -1 })` | `userId_1_status_1` & `userId_1_startedAt_-1` | `{ userId: 1, status: 1, startedAt: -1 }` | Backs `GET /focus/sessions/active` and status-filtered session history, providing index-ordered retrieval of active/paused sessions. |
| `notes` | `find({ userId }).sort({ updatedAt: -1 })` | `userId_1_folderId_1_updatedAt_-1` | `{ userId: 1, updatedAt: -1 }` | Resolves index prefix limitation when `folderId` is omitted (root notes view), preventing collection scans and in-memory sorting. |
| `notes` | `find({ userId, tags: tag }).sort({ updatedAt: -1 })` | `tags_1` & `userId_1_folderId_1_updatedAt_-1` | `{ userId: 1, tags: 1, updatedAt: -1 }` | Powers tag-filtered note listings, combining user scoping, tag multikey filtering, and reverse-chronological sorting into a single index. |
| `flashcards` | `find({ userId, subjectId }).sort({ createdAt: -1 })` | `subjectId_1` & `userId_1_topicId_1_createdAt_-1` | `{ userId: 1, subjectId: 1, createdAt: -1 }` | Parallels the existing `topicId` compound index, accelerating subject-level flashcard reviews and cascade deletions. |
| `topics` | `find({ userId }).sort({ createdAt: -1 })` | `userId_1_subjectId_1_createdAt_-1` | `{ userId: 1, createdAt: -1 }` | Covers general syllabus topic listings where `subjectId` is not filtered, eliminating in-memory sorting across the user's topics. |
| `goals` | `find({ userId }).sort({ createdAt: -1 })` | `userId_1_status_1` | `{ userId: 1, createdAt: -1 }` | Allows unconstrained goal listings in `GET /goals` to stream pre-sorted documents by creation date. |
| `goals` | `find({ userId, status }).sort({ createdAt: -1 })` | `userId_1_status_1` | `{ userId: 1, status: 1, createdAt: -1 }` | Satisfies status-filtered goal listings (`active`, `completed`, `abandoned`) without in-memory sorting. |
| `notifications` | `find({ userId }).sort({ scheduledFor: -1, createdAt: -1 })` | `userId_1_readStatus_1` | `{ userId: 1, scheduledFor: -1 }` | Enables fast pagination of the caller's main notification feed ordered by schedule time. |
| `notifications` | `find({ userId, readStatus }).sort({ scheduledFor: -1, createdAt: -1 })` | `userId_1_readStatus_1` | `{ userId: 1, readStatus: 1, scheduledFor: -1 }` | Supports filtered notification feed queries (e.g. unread feed) with index-backed sorting by `scheduledFor: -1`. |

---

## 5. Migration Strategy & Execution Plan

1. **Script Path:** `scripts/db/create-indexes.ts`
2. **Idempotency Guarantee:** Utilizes native MongoDB driver `collection.createIndex(keys, options)`. In MongoDB, calling `createIndex` on an existing index with matching specifications is a strict no-op, ensuring zero impact and idempotent re-runs across local, staging, and production environments.
3. **Execution Command:**
   ```bash
   npx tsx scripts/db/create-indexes.ts [--uri=mongodb://localhost:27017/lifeos]
   ```
4. **Verification:**
   The script inspects `db.collection.getIndexes()` immediately after creation and validates that all 13 recommended indexes are present and active.
