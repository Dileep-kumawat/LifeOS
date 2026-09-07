import { Types } from "mongoose";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { Event } from "../models/Event.js";
import { Goal } from "../models/Goal.js";
import { Habit } from "../models/Habit.js";
import { HabitCheckIn } from "../models/HabitCheckIn.js";
import { Note } from "../models/Note.js";
import { NoteFolder } from "../models/NoteFolder.js";
import { NoteVersion } from "../models/NoteVersion.js";
import { Transaction } from "../models/Transaction.js";
import { Budget } from "../models/Budget.js";
import { BudgetHistory } from "../models/BudgetHistory.js";
import { Category } from "../models/Category.js";
import { Subject } from "../models/Subject.js";
import { Topic } from "../models/Topic.js";
import { Flashcard } from "../models/Flashcard.js";
import { FocusSession } from "../models/FocusSession.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { Summary } from "../models/Summary.js";
import { Recommendation } from "../models/Recommendation.js";
import { Notification } from "../models/Notification.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { SyncTombstone } from "../models/SyncTombstone.js";
import { anonymizeIp } from "./auditService.js";

export interface UserDataExport {
  metadata: {
    exportVersion: string;
    exportedAt: string;
    userId: string;
    dataPortabilityStandard: "GDPR Article 20 / India DPDP 2023 Section 11";
    excludedSecurityFields: string[];
  };
  profile: {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerified: boolean;
    subscriptionTier: string;
    notificationPreferences: any;
    createdAt?: string;
    updatedAt?: string;
  };
  sessions: Array<{
    id: string;
    deviceType?: string;
    userAgent?: string;
    anonymizedIp?: string;
    expiresAt?: string;
    createdAt?: string;
  }>;
  calendar: Array<any>;
  goals: Array<any>;
  habits: {
    habits: Array<any>;
    checkIns: Array<any>;
  };
  notes: {
    folders: Array<any>;
    notes: Array<any>;
    versions: Array<any>;
  };
  finance: {
    transactions: Array<any>;
    budgets: Array<any>;
    budgetHistory: Array<any>;
    categories: Array<any>;
  };
  studyPlanner: {
    subjects: Array<any>;
    topics: Array<any>;
    flashcards: Array<any>;
  };
  focusSessions: Array<any>;
  aiAssistant: {
    conversations: Array<any>;
    messages: Array<any>;
    dailySummaries: Array<any>;
    periodicRecommendations: Array<any>;
  };
  notifications: {
    notifications: Array<any>;
    pushEndpoints: Array<{
      id: string;
      type: string;
      endpoint: string;
      deviceType?: string;
      userAgent?: string;
      createdAt?: string;
    }>;
  };
  syncTombstones: Array<any>;
}

/**
 * Generates a complete, structured JSON user data export for portability
 * under GDPR Art. 20 and India DPDP Section 11.
 *
 * Excludes all security secrets (password hashes, reset tokens, session token hashes,
 * WebPush private keys, infrastructure credentials).
 */
export async function generateUserDataExport(userId: string): Promise<UserDataExport | null> {
  const userObjectId = new Types.ObjectId(userId);

  const user = await User.findById(userObjectId).lean();
  if (!user) {
    return null;
  }

  // Query all user-owned collections in parallel
  const [
    refreshTokens,
    events,
    goals,
    habits,
    checkIns,
    notes,
    folders,
    versions,
    transactions,
    budgets,
    budgetHistory,
    categories,
    subjects,
    topics,
    flashcards,
    focusSessions,
    conversations,
    messages,
    summaries,
    recommendations,
    notifications,
    pushSubscriptions,
    syncTombstones
  ] = await Promise.all([
    RefreshToken.find({ userId: userObjectId }).lean(),
    Event.find({ userId: userObjectId }).lean(),
    Goal.find({ userId: userObjectId }).lean(),
    Habit.find({ userId: userObjectId }).lean(),
    HabitCheckIn.find({ userId: userObjectId }).lean(),
    Note.find({ userId: userObjectId }).lean(),
    NoteFolder.find({ userId: userObjectId }).lean(),
    NoteVersion.find({ userId: userObjectId }).lean(),
    Transaction.find({ userId: userObjectId }).lean(),
    Budget.find({ userId: userObjectId }).lean(),
    BudgetHistory.find({ userId: userObjectId }).lean(),
    Category.find({ userId: userObjectId }).lean(),
    Subject.find({ userId: userObjectId }).lean(),
    Topic.find({ userId: userObjectId }).lean(),
    Flashcard.find({ userId: userObjectId }).lean(),
    FocusSession.find({ userId: userObjectId }).lean(),
    Conversation.find({ userId: userObjectId }).lean(),
    Message.find({ userId: userObjectId }).lean(),
    Summary.find({ userId: userObjectId }).lean(),
    Recommendation.find({ userId: userObjectId }).lean(),
    Notification.find({ userId: userObjectId }).lean(),
    PushSubscription.find({ userId: userObjectId }).lean(),
    SyncTombstone.find({ userId: userObjectId }).lean()
  ]);

  // Sanitize and format active sessions (exclude hashedToken)
  const sanitizedSessions = refreshTokens.map((token: any) => ({
    id: token._id.toString(),
    deviceType: token.deviceType || "unknown",
    userAgent: token.userAgent || "unknown",
    anonymizedIp: anonymizeIp(token.ipAddress),
    expiresAt: token.expiresAt ? token.expiresAt.toISOString() : undefined,
    createdAt: token.createdAt ? token.createdAt.toISOString() : undefined
  }));

  // Sanitize push subscriptions (exclude cryptographic keys)
  const sanitizedPushEndpoints = pushSubscriptions.map((sub: any) => ({
    id: sub._id.toString(),
    type: sub.type,
    endpoint: sub.endpoint,
    deviceType: sub.deviceType,
    userAgent: sub.userAgent,
    createdAt: sub.createdAt ? sub.createdAt.toISOString() : undefined
  }));

  return {
    metadata: {
      exportVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      userId: user._id.toString(),
      dataPortabilityStandard: "GDPR Article 20 / India DPDP 2023 Section 11",
      excludedSecurityFields: [
        "User.passwordHash",
        "User.passwordResetTokenHash",
        "User.passwordResetExpiresAt",
        "RefreshToken.hashedToken",
        "PushSubscription.keys",
        "OAuthClientSecrets"
      ]
    },
    profile: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      subscriptionTier: user.subscriptionTier,
      notificationPreferences: user.notificationPreferences,
      createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : undefined
    },
    sessions: sanitizedSessions,
    calendar: events.map((e: any) => ({
      id: e._id.toString(),
      title: e.title,
      description: e.description,
      startTime: e.startTime,
      endTime: e.endTime,
      isAllDay: e.isAllDay,
      category: e.category,
      recurrence: e.recurrence,
      linkedTopicId: e.linkedTopicId ? e.linkedTopicId.toString() : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    })),
    goals: goals.map((g: any) => ({
      id: g._id.toString(),
      title: g.title,
      description: g.description,
      category: g.category,
      targetDate: g.targetDate,
      progress: g.progress,
      status: g.status,
      keyResults: g.keyResults,
      parentGoalId: g.parentGoalId ? g.parentGoalId.toString() : null,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    })),
    habits: {
      habits: habits.map((h: any) => ({
        id: h._id.toString(),
        name: h.name,
        description: h.description,
        frequency: h.frequency,
        targetCount: h.targetCount,
        streakCount: h.streakCount,
        bestStreak: h.bestStreak,
        isActive: h.isActive,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt
      })),
      checkIns: checkIns.map((c: any) => ({
        id: c._id ? c._id.toString() : "",
        habitId: c.habitId ? c.habitId.toString() : null,
        date: c.date,
        completedAt: c.completedAt
      }))
    },
    notes: {
      folders: folders.map((f: any) => ({
        id: f._id.toString(),
        name: f.name,
        parentFolderId: f.parentFolderId ? f.parentFolderId.toString() : null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      })),
      notes: notes.map((n: any) => ({
        id: n._id.toString(),
        title: n.title,
        content: n.content,
        contentText: n.contentText,
        folderId: n.folderId ? n.folderId.toString() : null,
        tags: n.tags,
        isPinned: n.isPinned,
        isArchived: n.isArchived,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt
      })),
      versions: versions.map((v: any) => ({
        id: v._id ? v._id.toString() : "",
        noteId: v.noteId ? v.noteId.toString() : null,
        versionNumber: v.versionNumber,
        title: v.title,
        content: v.content,
        contentText: v.contentText,
        tags: v.tags,
        createdAt: v.createdAt
      }))
    },
    finance: {
      transactions: transactions.map((t: any) => ({
        id: t._id.toString(),
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        notes: t.notes,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      budgets: budgets.map((b: any) => ({
        id: b._id.toString(),
        category: b.category,
        limit: b.limit,
        alertThreshold: b.alertThreshold,
        period: b.period,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      })),
      budgetHistory: budgetHistory.map((bh: any) => ({
        id: bh._id ? bh._id.toString() : "",
        budgetId: bh.budgetId ? bh.budgetId.toString() : null,
        category: bh.category,
        period: bh.period,
        periodStart: bh.periodStart,
        periodEnd: bh.periodEnd,
        limit: bh.limit,
        finalSpend: bh.finalSpend,
        wasOverBudget: bh.wasOverBudget
      })),
      categories: categories.map((cat: any) => ({
        id: cat._id.toString(),
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
        isDefault: cat.isDefault,
        createdAt: cat.createdAt
      }))
    },
    studyPlanner: {
      subjects: subjects.map((s: any) => ({
        id: s._id.toString(),
        name: s.name,
        color: s.color,
        examDate: s.examDate,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      })),
      topics: topics.map((top: any) => ({
        id: top._id ? top._id.toString() : "",
        subjectId: top.subjectId ? top.subjectId.toString() : null,
        title: top.title,
        deadline: top.deadline,
        priority: top.priority,
        status: top.status,
        estimatedMinutes: top.estimatedMinutes,
        createdAt: top.createdAt,
        updatedAt: top.updatedAt
      })),
      flashcards: flashcards.map((fc: any) => ({
        id: fc._id.toString(),
        subjectId: fc.subjectId ? fc.subjectId.toString() : null,
        topicId: fc.topicId ? fc.topicId.toString() : null,
        front: fc.front,
        back: fc.back,
        easeFactor: fc.easeFactor,
        intervalDays: fc.intervalDays,
        repetitions: fc.repetitions,
        nextReviewDate: fc.nextReviewDate,
        createdAt: fc.createdAt,
        updatedAt: fc.updatedAt
      }))
    },
    focusSessions: focusSessions.map((fs: any) => ({
      id: fs._id.toString(),
      workMinutes: fs.workMinutes,
      breakMinutes: fs.breakMinutes,
      longBreakMinutes: fs.longBreakMinutes,
      longBreakInterval: fs.longBreakInterval,
      currentCycle: fs.currentCycle,
      currentPhase: fs.currentPhase,
      linkedType: fs.linkedType,
      linkedId: fs.linkedId,
      status: fs.status,
      startedAt: fs.startedAt,
      completedAt: fs.completedAt,
      pausedAt: fs.pausedAt,
      accumulatedWorkSeconds: fs.accumulatedWorkSeconds,
      totalFocusMinutes: fs.totalFocusMinutes,
      createdAt: fs.createdAt,
      updatedAt: fs.updatedAt
    })),
    aiAssistant: {
      conversations: conversations.map((conv: any) => ({
        id: conv._id.toString(),
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      })),
      messages: messages.map((m: any) => ({
        id: m._id ? m._id.toString() : "",
        conversationId: m.conversationId ? m.conversationId.toString() : null,
        role: m.role,
        content: m.content,
        toolCallData: m.toolCallData,
        createdAt: m.createdAt
      })),
      dailySummaries: summaries.map((s: any) => ({
        id: s._id.toString(),
        date: s.date,
        yesterdayCompleted: s.yesterdayCompleted,
        todaySchedule: s.todaySchedule,
        topPriorities: s.topPriorities,
        generatedAt: s.generatedAt
      })),
      periodicRecommendations: recommendations.map((r: any) => ({
        id: r._id.toString(),
        period: r.period,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        recommendations: r.recommendations,
        generatedAt: r.generatedAt
      }))
    },
    notifications: {
      notifications: notifications.map((n: any) => ({
        id: n._id.toString(),
        type: n.type,
        channel: n.channel,
        payload: n.payload,
        deliveryStatus: n.deliveryStatus,
        readStatus: n.readStatus,
        scheduledFor: n.scheduledFor,
        sentAt: n.sentAt,
        readAt: n.readAt,
        createdAt: n.createdAt
      })),
      pushEndpoints: sanitizedPushEndpoints
    },
    syncTombstones: syncTombstones.map((st: any) => ({
      id: st._id.toString(),
      module: st.module,
      entityId: st.entityId,
      deletedAt: st.deletedAt
    }))
  };
}
