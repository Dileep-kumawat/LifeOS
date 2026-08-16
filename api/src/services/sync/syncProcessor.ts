import { Types } from "mongoose";
import {

  type SyncPushItem,
  type SyncPushItemResult,
  type SyncModule,
  type SyncPullResponse,
  syncModules
} from "@lifeos/shared";
import { Habit } from "../../models/Habit.js";
import { HabitCheckIn } from "../../models/HabitCheckIn.js";
import { Event } from "../../models/Event.js";
import { Goal } from "../../models/Goal.js";
import { Note } from "../../models/Note.js";
import { NoteFolder } from "../../models/NoteFolder.js";
import { NoteVersion } from "../../models/NoteVersion.js";
import { Transaction } from "../../models/Transaction.js";
import { Budget } from "../../models/Budget.js";
import { Category } from "../../models/Category.js";
import { SyncTombstone } from "../../models/SyncTombstone.js";
import { calculateHabitStats, formatDateString } from "../streak.js";
import {
  onTransactionCreated,
  onTransactionUpdated,
  onTransactionDeleted
} from "../financeHooks.js";
import { recalculateBudgetSpend } from "../budgetService.js";
import { enqueueEmbeddingJob, deleteEmbedding } from "../ai/embeddingJob.js";
import { logger } from "../../logger.js";

/**
 * Recalculate habit stats after a check-in change
 */
async function updateHabitStatsForSync(habitId: any, userId: any, refDateStr?: string) {
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) return;

  const allCheckIns = await HabitCheckIn.find({ habitId: habit._id, userId }).select(
    "date completed"
  );
  const checkIns = allCheckIns.map((c) => ({
    date: c.date,
    completed: c.completed
  }));

  const stats = calculateHabitStats(
    checkIns,
    habit.frequency,
    habit.longestStreak || 0,
    refDateStr || formatDateString(new Date())
  );

  habit.currentStreak = stats.currentStreak;
  habit.longestStreak = stats.longestStreak;
  habit.completionRate = stats.completionRate;
  habit.lastCheckInDate = stats.lastCheckInDate;

  await habit.save();
}

/**
 * Plaintext extractor for ProseMirror documents
 */
function extractTextFromDoc(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromDoc).join(" ");
  }
  return "";
}

/**
 * Order sync operations so dependencies resolve cleanly within a batch.
 */
function prioritizeChanges(changes: SyncPushItem[]): SyncPushItem[] {
  const modulePriority: Record<SyncModule, number> = {
    categories: 1,
    note_folders: 2,
    habits: 3,
    goals: 4,
    notes: 5,
    events: 6,
    budgets: 7,
    transactions: 8,
    habit_check_ins: 9,
    note_versions: 10
  };

  const opPriority: Record<string, number> = {
    create: 1,
    update: 2,
    delete: 3
  };

  return [...changes].sort((a, b) => {
    // Creates first, then updates, then deletes
    const opA = opPriority[a.operation] ?? 99;
    const opB = opPriority[b.operation] ?? 99;
    if (opA !== opB) return opA - opB;

    // For creates & updates, follow dependency hierarchy
    if (a.operation !== "delete") {
      return (modulePriority[a.module] ?? 50) - (modulePriority[b.module] ?? 50);
    }
    // For deletes, reverse dependency hierarchy
    return (modulePriority[b.module] ?? 50) - (modulePriority[a.module] ?? 50);
  });
}

/**
 * Process a batch of push items through full server validation & business logic.
 */
export async function processSyncPush(
  userId: string,
  changes: SyncPushItem[],
  deviceId?: string
): Promise<{ cursor: string; results: SyncPushItemResult[] }> {
  const results: SyncPushItemResult[] = [];
  const orderedChanges = prioritizeChanges(changes);
  const now = new Date();

  for (const item of orderedChanges) {
    try {
      const result = await processSinglePushItem(userId, item, deviceId);
      results.push(result);
    } catch (err: any) {
      logger.error({ err, item }, "Sync push processing error on item");
      results.push({
        id: item.id,
        module: item.module,
        status: "error",
        error: err.message || "Failed to process change"
      });
    }
  }

  const cursor = now.toISOString();
  return { cursor, results };
}

async function processSinglePushItem(
  userId: string,
  item: SyncPushItem,
  _deviceId?: string
): Promise<SyncPushItemResult> {
  const { id, module, operation, data = {}, lastModifiedAt } = item;
  const userObjectId = new Types.ObjectId(userId);

  switch (module) {
    case "habits": {
      if (operation === "delete") {
        const habit = await Habit.findOneAndDelete({ _id: id, userId: userObjectId });
        if (habit) {
          await HabitCheckIn.deleteMany({ habitId: id, userId: userObjectId });
          await deleteEmbedding("habit", habit._id);
          await recordTombstone(userId, module, id);
        }
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
          return { id, module, status: "error", error: "Habit title is required" };
        }

        const habitData = {
          userId: userObjectId,
          title: data.title.trim(),
          frequency: data.frequency || { type: "daily", daysOfWeek: [], timesPerPeriod: 1 },
          reminderTime: data.reminderTime ?? null,
          reminderEnabled: Boolean(data.reminderEnabled),
          currentStreak: data.currentStreak || 0,
          longestStreak: data.longestStreak || 0,
          completionRate: data.completionRate || 0,
          lastCheckInDate: data.lastCheckInDate ?? null
        };

        const existing = await Habit.findOne({ _id: id, userId: userObjectId });
        let doc: any;
        if (existing) {
          // Conflict detection: if server record was modified more recently than client timestamp
          const serverUpdatedTime = new Date(existing.updatedAt || 0).getTime();
          if (lastModifiedAt && serverUpdatedTime > lastModifiedAt) {
            return {
              id,
              module,
              status: "conflict",
              conflictData: existing.toObject(),
              serverRecord: existing.toObject()
            };
          }
          Object.assign(existing, habitData);
          doc = await existing.save();
        } else {
          doc = await Habit.create({ _id: id, ...habitData });
        }

        await enqueueEmbeddingJob("habit", doc._id, userObjectId);
        return { id, module, status: "applied", serverRecord: doc.toObject() };
      }
      break;
    }

    case "habit_check_ins": {
      if (operation === "delete") {
        const checkIn = await HabitCheckIn.findOneAndDelete({ _id: id, userId: userObjectId });
        if (checkIn) {
          await updateHabitStatsForSync(checkIn.habitId, userObjectId, checkIn.date);
          await recordTombstone(userId, module, id);
        }
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        const { habitId, date, completed } = data;
        if (!habitId || !date) {
          return { id, module, status: "error", error: "habitId and date are required" };
        }

        const isCompleted = completed !== undefined ? Boolean(completed) : true;

        const checkIn = await HabitCheckIn.findOneAndUpdate(
          { habitId: new Types.ObjectId(habitId), date, userId: userObjectId },
          {
            $set: {
              _id: id,
              habitId: new Types.ObjectId(habitId),
              userId: userObjectId,
              date,
              completed: isCompleted
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await updateHabitStatsForSync(habitId, userObjectId, date);
        return { id, module, status: "applied", serverRecord: checkIn.toObject() };
      }
      break;
    }

    case "transactions": {
      if (operation === "delete") {
        const transaction = await Transaction.findOne({ _id: id, userId: userObjectId });
        if (transaction) {
          await onTransactionDeleted(transaction);
          await Transaction.deleteOne({ _id: id, userId: userObjectId });
          await recordTombstone(userId, module, id);
        }
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        const amount = Number(data.amount);
        if (isNaN(amount) || amount <= 0) {
          return { id, module, status: "error", error: "Amount must be a positive number" };
        }
        const categoryName = (data.category || "General").trim();
        const type = data.type === "income" ? "income" : "expense";
        const date = data.date ? new Date(data.date) : new Date();

        // Ensure category exists
        await Category.findOneAndUpdate(
          { userId: userObjectId, name: categoryName, type },
          { $setOnInsert: { userId: userObjectId, name: categoryName, type } },
          { upsert: true }
        );

        const existing = await Transaction.findOne({ _id: id, userId: userObjectId });
        let doc: any;
        if (existing) {
          const prevState = {
            category: existing.category,
            amount: existing.amount,
            type: existing.type,
            date: existing.date
          };
          existing.amount = amount;
          existing.type = type;
          existing.category = categoryName;
          existing.date = date;
          existing.note = data.note || "";
          existing.receiptAttachment = data.receiptAttachment || null;
          doc = await existing.save();
          await onTransactionUpdated(doc, prevState);
        } else {
          doc = await Transaction.create({
            _id: id,
            userId: userObjectId,
            amount,
            type,
            category: categoryName,
            date,
            note: data.note || "",
            receiptAttachment: data.receiptAttachment || null
          });
          await onTransactionCreated(doc);
        }

        return { id, module, status: "applied", serverRecord: doc.toObject() };
      }
      break;
    }

    case "budgets": {
      if (operation === "delete") {
        await Budget.findOneAndDelete({ _id: id, userId: userObjectId });
        await recordTombstone(userId, module, id);
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        const limit = Number(data.limit);
        const categoryName = (data.category || "General").trim();
        const budget = await Budget.findOneAndUpdate(
          { userId: userObjectId, category: categoryName, period: "monthly" },
          {
            $set: {
              _id: id,
              userId: userObjectId,
              category: categoryName,
              limit,
              period: "monthly",
              currentSpend: data.currentSpend || 0,
              notifiedOverspend: Boolean(data.notifiedOverspend)
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        await recalculateBudgetSpend(userObjectId.toString(), categoryName, new Date());
        return { id, module, status: "applied", serverRecord: budget.toObject() };
      }
      break;
    }

    case "categories": {
      if (operation === "delete") {
        await Category.findOneAndDelete({ _id: id, userId: userObjectId });
        await recordTombstone(userId, module, id);
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        const cat = await Category.findOneAndUpdate(
          { userId: userObjectId, name: data.name.trim(), type: data.type },
          {
            $set: {
              _id: id,
              userId: userObjectId,
              name: data.name.trim(),
              type: data.type
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return { id, module, status: "applied", serverRecord: cat.toObject() };
      }
      break;
    }

    case "events": {
      if (operation === "delete") {
        await Event.findOneAndDelete({ _id: id, userId: userObjectId });
        await recordTombstone(userId, module, id);
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        if (!data.title || !data.startTime || !data.endTime) {
          return { id, module, status: "error", error: "title, startTime, and endTime are required" };
        }

        const eventData = {
          userId: userObjectId,
          title: data.title.trim(),
          description: data.description || "",
          location: data.location || "",
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          timezone: data.timezone || "UTC",
          isAllDay: Boolean(data.isAllDay),
          recurrenceRule: data.recurrenceRule || null,
          recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
          exceptions: data.exceptions || [],
          reminderLeadMinutes: data.reminderLeadMinutes ?? null,
          isOverride: Boolean(data.isOverride),
          parentEventId: data.parentEventId ? new Types.ObjectId(data.parentEventId) : null
        };

        const existing = await Event.findOne({ _id: id, userId: userObjectId });
        let doc: any;
        if (existing) {
          Object.assign(existing, eventData);
          doc = await existing.save();
        } else {
          doc = await Event.create({ _id: id, ...eventData });
        }

        return { id, module, status: "applied", serverRecord: doc.toObject() };
      }
      break;
    }

    case "goals": {
      if (operation === "delete") {
        const goal = await Goal.findOneAndDelete({ _id: id, userId: userObjectId });
        if (goal) {
          await deleteEmbedding("goal", goal._id);
          await recordTombstone(userId, module, id);
        }
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        if (!data.title) {
          return { id, module, status: "error", error: "Goal title is required" };
        }

        const milestones = Array.isArray(data.milestones) ? data.milestones : [];
        let progress = typeof data.progressPercent === "number" ? data.progressPercent : 0;
        if (milestones.length > 0) {
          const completedCount = milestones.filter((m: any) => m.completed).length;
          progress = Math.round((completedCount / milestones.length) * 100);
        }

        const goalData = {
          userId: userObjectId,
          title: data.title.trim(),
          description: data.description || "",
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          status: data.status || "active",
          progressPercent: progress,
          milestones,
          linkedEventIds: Array.isArray(data.linkedEventIds) ? data.linkedEventIds : [],
          linkedNoteIds: Array.isArray(data.linkedNoteIds) ? data.linkedNoteIds : []
        };

        const existing = await Goal.findOne({ _id: id, userId: userObjectId });
        let doc: any;
        if (existing) {
          Object.assign(existing, goalData);
          doc = await existing.save();
        } else {
          doc = await Goal.create({ _id: id, ...goalData });
        }

        await enqueueEmbeddingJob("goal", doc._id, userObjectId);
        return { id, module, status: "applied", serverRecord: doc.toObject() };
      }
      break;
    }

    case "notes": {
      if (operation === "delete") {
        const note = await Note.findOneAndDelete({ _id: id, userId: userObjectId });
        if (note) {
          await NoteVersion.deleteMany({ noteId: id, userId: userObjectId });
          await deleteEmbedding("note", note._id);
          await recordTombstone(userId, module, id);
        }
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        const title = (data.title || "").trim();
        const content = data.content || { type: "doc", content: [] };
        const contentText = data.contentText || extractTextFromDoc(content);
        const folderId = data.folderId ? new Types.ObjectId(data.folderId) : null;
        const tags = Array.isArray(data.tags) ? data.tags : [];

        const existing = await Note.findOne({ _id: id, userId: userObjectId });
        let doc: any;
        if (existing) {
          const serverUpdatedTime = new Date(existing.updatedAt || 0).getTime();
          if (lastModifiedAt && serverUpdatedTime > lastModifiedAt) {
            return {
              id,
              module,
              status: "conflict",
              conflictData: existing.toObject(),
              serverRecord: existing.toObject()
            };
          }

          existing.title = title;
          existing.content = content;
          existing.contentText = contentText;
          existing.folderId = folderId;
          existing.tags = tags;
          doc = await existing.save();
        } else {
          doc = await Note.create({
            _id: id,
            userId: userObjectId,
            title,
            content,
            contentText,
            folderId,
            tags
          });
        }

        // Increment version
        const lastVersion = await NoteVersion.findOne({ noteId: id, userId: userObjectId }).sort({
          versionNumber: -1
        });
        const nextVersionNum = (lastVersion?.versionNumber || 0) + 1;
        await NoteVersion.create({
          noteId: doc._id,
          userId: userObjectId,
          versionNumber: nextVersionNum,
          title: doc.title,
          content: doc.content,
          contentText: doc.contentText,
          folderId: doc.folderId,
          tags: doc.tags,
          changeSource: "sync"
        });

        await enqueueEmbeddingJob("note", doc._id, userObjectId);
        return { id, module, status: "applied", serverRecord: doc.toObject() };
      }
      break;
    }

    case "note_folders": {
      if (operation === "delete") {
        const folder = await NoteFolder.findOneAndDelete({ _id: id, userId: userObjectId });
        if (folder) {
          // Reassign notes to root
          await Note.updateMany({ folderId: id, userId: userObjectId }, { $set: { folderId: null } });
          // Reparent children
          await NoteFolder.updateMany(
            { parentFolderId: id, userId: userObjectId },
            { $set: { parentFolderId: folder.parentFolderId ?? null } }
          );
          await recordTombstone(userId, module, id);
        }
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        const name = (data.name || "").trim();
        if (!name) {
          return { id, module, status: "error", error: "Folder name is required" };
        }
        const parentFolderId = data.parentFolderId ? new Types.ObjectId(data.parentFolderId) : null;

        const folder = await NoteFolder.findOneAndUpdate(
          { _id: id, userId: userObjectId },
          {
            $set: {
              _id: id,
              userId: userObjectId,
              name,
              parentFolderId
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return { id, module, status: "applied", serverRecord: folder.toObject() };
      }
      break;
    }

    case "note_versions": {
      if (operation === "delete") {
        await NoteVersion.findOneAndDelete({ _id: id, userId: userObjectId });
        await recordTombstone(userId, module, id);
        return { id, module, status: "applied" };
      }

      if (operation === "create" || operation === "update") {
        const version = await NoteVersion.findOneAndUpdate(
          { _id: id, userId: userObjectId },
          {
            $set: {
              _id: id,
              noteId: new Types.ObjectId(data.noteId),
              userId: userObjectId,
              versionNumber: data.versionNumber || 1,
              title: data.title || "",
              content: data.content || { type: "doc", content: [] },
              contentText: data.contentText || "",
              folderId: data.folderId ? new Types.ObjectId(data.folderId) : null,
              tags: data.tags || [],
              changeSource: data.changeSource || "sync"
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return { id, module, status: "applied", serverRecord: version.toObject() };
      }
      break;
    }
  }

  return { id, module, status: "applied" };
}

async function recordTombstone(userId: string, module: string, entityId: string) {
  try {
    await SyncTombstone.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), module, entityId },
      { $set: { userId: new Types.ObjectId(userId), module, entityId, deletedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    logger.warn({ err, userId, module, entityId }, "Failed to record sync tombstone");
  }
}

/**
 * Process a pull request, returning upserted documents and deleted IDs since cursor.
 */
export async function processSyncPull(
  userId: string,
  sinceCursor?: string | null,
  _deviceId?: string
): Promise<SyncPullResponse> {
  const userObjectId = new Types.ObjectId(userId);
  const now = new Date();
  const sinceDate = sinceCursor ? new Date(sinceCursor) : null;

  const filter = (extra: Record<string, any> = {}) => {
    const q: Record<string, any> = { userId: userObjectId, ...extra };
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      q.updatedAt = { $gt: sinceDate };
    }
    return q;
  };

  // Fetch updated docs for all modules
  const [
    events,
    goals,
    habits,
    habitCheckIns,
    notes,
    noteFolders,
    transactions,
    budgets,
    categories,
    noteVersions
  ] = await Promise.all([
    Event.find(filter()).lean(),
    Goal.find(filter()).lean(),
    Habit.find(filter()).lean(),
    HabitCheckIn.find(filter()).lean(),
    Note.find(filter()).lean(),
    NoteFolder.find(filter()).lean(),
    Transaction.find(filter()).lean(),
    Budget.find(filter()).lean(),
    Category.find(filter()).lean(),
    NoteVersion.find(
      sinceDate && !isNaN(sinceDate.getTime())
        ? { userId: userObjectId, createdAt: { $gt: sinceDate } }
        : { userId: userObjectId }
    ).lean()
  ]);

  // Fetch tombstones since cursor
  const tombstoneQuery: Record<string, any> = { userId: userObjectId };
  if (sinceDate && !isNaN(sinceDate.getTime())) {
    tombstoneQuery.deletedAt = { $gt: sinceDate };
  }
  const tombstones = await SyncTombstone.find(tombstoneQuery).lean();

  const tombstonesByModule: Record<SyncModule, string[]> = {
    events: [],
    goals: [],
    habits: [],
    habit_check_ins: [],
    notes: [],
    note_folders: [],
    transactions: [],
    budgets: [],
    categories: [],
    note_versions: []
  };

  for (const t of tombstones) {
    if (syncModules.includes(t.module as SyncModule)) {
      tombstonesByModule[t.module as SyncModule].push(t.entityId);
    }
  }

  const serializeDocs = (docs: any[]) =>
    docs.map((d) => ({
      ...d,
      _id: d._id.toString(),
      id: d._id.toString(),
      userId: d.userId.toString()
    }));

  const changes: Record<SyncModule, { upserted: any[]; deleted: string[] }> = {
    events: { upserted: serializeDocs(events), deleted: tombstonesByModule.events },
    goals: { upserted: serializeDocs(goals), deleted: tombstonesByModule.goals },
    habits: { upserted: serializeDocs(habits), deleted: tombstonesByModule.habits },
    habit_check_ins: {
      upserted: serializeDocs(habitCheckIns),
      deleted: tombstonesByModule.habit_check_ins
    },
    notes: { upserted: serializeDocs(notes), deleted: tombstonesByModule.notes },
    note_folders: { upserted: serializeDocs(noteFolders), deleted: tombstonesByModule.note_folders },
    transactions: { upserted: serializeDocs(transactions), deleted: tombstonesByModule.transactions },
    budgets: { upserted: serializeDocs(budgets), deleted: tombstonesByModule.budgets },
    categories: { upserted: serializeDocs(categories), deleted: tombstonesByModule.categories },
    note_versions: {
      upserted: serializeDocs(noteVersions),
      deleted: tombstonesByModule.note_versions
    }
  };

  return {
    cursor: now.toISOString(),
    serverTime: now.toISOString(),
    changes
  };
}
