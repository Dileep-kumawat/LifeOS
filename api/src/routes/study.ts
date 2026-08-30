import { Router, type Request, type Response } from "express";
import { isValidObjectId, type FilterQuery } from "mongoose";
import {
  createSubjectSchema,
  updateSubjectSchema,
  subjectParamsSchema,
  listSubjectsQuerySchema,
  createTopicSchema,
  updateTopicSchema,
  topicParamsSchema,
  listTopicsQuerySchema,
  createFlashcardSchema,
  updateFlashcardSchema,
  flashcardParamsSchema,
  listFlashcardsQuerySchema,
  reviewFlashcardSchema,
  calculateNextReview
} from "@lifeos/shared";
import { Subject, type SubjectDoc } from "../models/Subject.js";
import { Topic, type TopicDoc } from "../models/Topic.js";
import { Flashcard, type FlashcardDoc } from "../models/Flashcard.js";
import { FocusSession } from "../models/FocusSession.js";
import { Event } from "../models/Event.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/authMiddleware.js";

export const studyRouter = Router();

studyRouter.use(requireAuth);

function formatFocusSession(doc: any) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    workMinutes: doc.workMinutes,
    breakMinutes: doc.breakMinutes,
    longBreakMinutes: doc.longBreakMinutes,
    longBreakInterval: doc.longBreakInterval,
    currentCycle: doc.currentCycle,
    currentPhase: doc.currentPhase,
    linkedType: doc.linkedType,
    linkedId: doc.linkedId ?? null,
    status: doc.status,
    startedAt: doc.startedAt instanceof Date ? doc.startedAt.toISOString() : doc.startedAt,
    completedAt: doc.completedAt ? (doc.completedAt instanceof Date ? doc.completedAt.toISOString() : doc.completedAt) : null,
    totalFocusMinutes: doc.totalFocusMinutes ?? 0,
    accumulatedWorkSeconds: doc.accumulatedWorkSeconds ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt
  };
}


function formatSubject(doc: SubjectDoc, extra?: { topicsCount?: number; completedTopicsCount?: number; dueFlashcardsCount?: number }) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    name: doc.name,
    color: doc.color,
    examDate: doc.examDate ? doc.examDate.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    ...(extra ?? {})
  };
}

function formatTopic(doc: TopicDoc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    subjectId: doc.subjectId.toString(),
    title: doc.title,
    deadline: doc.deadline ? doc.deadline.toISOString() : null,
    priority: doc.priority,
    status: doc.status,
    estimatedMinutes: doc.estimatedMinutes ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}

function formatFlashcard(doc: FlashcardDoc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    subjectId: doc.subjectId ? doc.subjectId.toString() : null,
    topicId: doc.topicId ? doc.topicId.toString() : null,
    front: doc.front,
    back: doc.back,
    easeFactor: doc.easeFactor,
    intervalDays: doc.intervalDays,
    repetitions: doc.repetitions,
    nextReviewDate: doc.nextReviewDate.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT ROUTES (CRUD + CASCADE DELETION)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /study/subjects:
 *   post:
 *     tags: [StudyPlanner]
 *     summary: Create a study subject
 *     description: Creates a new study subject/course with an optional target exam deadline and UI accent color.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Data Structures & Algorithms" }
 *               color: { type: string, example: "#0075de" }
 *               examDate: { type: string, format: date-time, nullable: true, example: "2026-11-15T09:00:00.000Z" }
 *     responses:
 *       201:
 *         description: Subject created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
studyRouter.post("/study/subjects", validate(createSubjectSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { name, color, examDate } = req.body;

    const subject = await Subject.create({
      userId,
      name,
      color: color || "#0075de",
      examDate: examDate ? new Date(examDate) : null
    });

    return res.status(201).json({ subject: formatSubject(subject) });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/subjects:
 *   get:
 *     tags: [StudyPlanner]
 *     summary: List study subjects
 *     description: Returns all subjects owned by the authenticated user, enriched with aggregate topic and flashcard counts.
 *     responses:
 *       200:
 *         description: Array of subjects with summary statistics
 *       401:
 *         description: Authentication required
 */
studyRouter.get(
  "/study/subjects",
  validate(listSubjectsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { search } = req.query as any;

      const filter: FilterQuery<SubjectDoc> = { userId };
      if (search && typeof search === "string" && search.trim()) {
        filter.name = { $regex: search.trim(), $options: "i" };
      }

      const subjects = await Subject.find(filter).sort({ createdAt: -1 });

      const subjectsWithStats = await Promise.all(
        subjects.map(async (subj) => {
          const topicsCount = await Topic.countDocuments({ subjectId: subj._id, userId });
          const completedTopicsCount = await Topic.countDocuments({
            subjectId: subj._id,
            userId,
          status: "completed"
        });
        const dueFlashcardsCount = await Flashcard.countDocuments({
          subjectId: subj._id,
          userId,
          nextReviewDate: { $lte: new Date() }
        });

        return formatSubject(subj, {
          topicsCount,
          completedTopicsCount,
          dueFlashcardsCount
        });
      })
    );

    return res.json({ subjects: subjectsWithStats });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/subjects/{id}:
 *   get:
 *     tags: [StudyPlanner]
 *     summary: Get subject details
 *     description: Retrieves a single subject and its child topics.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Subject details with child topics
 *       404:
 *         description: Subject not found
 */
studyRouter.get("/study/subjects/:id", validate(subjectParamsSchema, "params"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const subject = await Subject.findOne({ _id: id, userId });
    if (!subject) {
      return res.status(404).json({ error: "NotFound", message: "Subject not found" });
    }

    const topics = await Topic.find({ subjectId: subject._id, userId }).sort({ createdAt: -1 });

    return res.json({
      subject: formatSubject(subject),
      topics: topics.map(formatTopic)
    });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/subjects/{id}:
 *   patch:
 *     tags: [StudyPlanner]
 *     summary: Update a subject
 *     description: Updates name, color, or exam deadline of an existing subject.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               color: { type: string }
 *               examDate: { type: string, format: date-time, nullable: true }
 *     responses:
 *       200:
 *         description: Subject updated
 *       404:
 *         description: Subject not found
 */
studyRouter.patch(
  "/study/subjects/:id",
  validate(subjectParamsSchema, "params"),
  validate(updateSubjectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const { name, color, examDate } = req.body;

      const subject = await Subject.findOne({ _id: id, userId });
      if (!subject) {
        return res.status(404).json({ error: "NotFound", message: "Subject not found" });
      }

      if (name !== undefined) subject.name = name;
      if (color !== undefined) subject.color = color;
      if (examDate !== undefined) subject.examDate = examDate ? new Date(examDate) : null;

      await subject.save();

      return res.json({ subject: formatSubject(subject) });
    } catch (err: any) {
      return res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

/**
 * @openapi
 * /study/subjects/{id}:
 *   delete:
 *     tags: [StudyPlanner]
 *     summary: Delete a subject (Cascade Deletion)
 *     description: |
 *       Deletes a subject and **cascade-deletes all subordinate topics and flashcards**.
 *       
 *       *Architectural Precedent Note:* Unlike the Notes module where deleting a folder reassigns
 *       notes to the root directory (because notes possess standalone semantic value), study topics
 *       and flashcards are intrinsically scoped to their syllabus/subject domain. An orphaned topic
 *       or flashcard cannot exist without its parent subject context, making complete cascade deletion
 *       the correct domain behavior.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Subject and all associated child items deleted
 *       404:
 *         description: Subject not found
 */
studyRouter.delete("/study/subjects/:id", validate(subjectParamsSchema, "params"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const subject = await Subject.findOne({ _id: id, userId });
    if (!subject) {
      return res.status(404).json({ error: "NotFound", message: "Subject not found" });
    }

    // Find all child topics for this subject
    const topics = await Topic.find({ subjectId: subject._id, userId });
    const topicIds = topics.map((t) => t._id);

    // Cascade delete flashcards linked to this subject or any of its topics
    const deletedFlashcards = await Flashcard.deleteMany({
      userId,
      $or: [{ subjectId: subject._id }, { topicId: { $in: topicIds } }]
    });

    // Cascade delete topics
    const deletedTopics = await Topic.deleteMany({ subjectId: subject._id, userId });

    // Delete subject
    await Subject.deleteOne({ _id: subject._id, userId });

    return res.json({
      message: "Subject and all associated topics and flashcards deleted successfully",
      deletedSubjectId: id,
      deletedTopicsCount: deletedTopics.deletedCount,
      deletedFlashcardsCount: deletedFlashcards.deletedCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOPIC ROUTES (FR-7.1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /study/topics:
 *   post:
 *     tags: [StudyPlanner]
 *     summary: Create a study topic
 *     description: Creates a topic under a subject with priority, deadline, and optional duration estimate.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subjectId, title]
 *             properties:
 *               subjectId: { type: string, example: "662c9f1e9f0b2a001c3d4e5f" }
 *               title: { type: string, example: "Dynamic Programming & Memoization" }
 *               deadline: { type: string, format: date-time, nullable: true }
 *               priority: { type: string, enum: [low, medium, high], default: medium }
 *               status: { type: string, enum: [not_started, in_progress, completed], default: not_started }
 *               estimatedMinutes: { type: integer, nullable: true, example: 90 }
 *     responses:
 *       201:
 *         description: Topic created
 *       400:
 *         description: Validation error or parent subject not found
 */
studyRouter.post("/study/topics", validate(createTopicSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { subjectId, title, deadline, priority, status, estimatedMinutes } = req.body;

    const subject = await Subject.findOne({ _id: subjectId, userId });
    if (!subject) {
      return res.status(400).json({ error: "ValidationError", message: "Subject not found or access denied" });
    }

    const topic = await Topic.create({
      userId,
      subjectId: subject._id,
      title,
      deadline: deadline ? new Date(deadline) : null,
      priority: priority || "medium",
      status: status || "not_started",
      estimatedMinutes: estimatedMinutes ?? null
    });

    return res.status(201).json({ topic: formatTopic(topic) });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/topics:
 *   get:
 *     tags: [StudyPlanner]
 *     summary: List study topics
 *     description: Returns topics filterable by subjectId, status, priority, and dueSoon deadline proximity.
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [not_started, in_progress, completed] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: dueSoon
 *         schema: { type: string, enum: [true, false] }
 *         description: Filter for topics with deadlines within the next 7 days or overdue
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [deadline, priority, status, createdAt] }
 *     responses:
 *       200:
 *         description: List of topics
 */
studyRouter.get("/study/topics", validate(listTopicsQuerySchema, "query"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { subjectId, status, priority, dueSoon, sort } = req.query as any;

    const filter: FilterQuery<TopicDoc> = { userId };
    if (subjectId && isValidObjectId(subjectId)) {
      filter.subjectId = subjectId;
    }
    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (dueSoon === true || dueSoon === "true") {
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      filter.deadline = { $ne: null, $lte: in7Days };
    }

    let sortObj: any = { createdAt: -1 };
    if (sort === "deadline") {
      sortObj = { deadline: 1, createdAt: -1 };
    } else if (sort === "priority") {
      sortObj = { priority: -1, createdAt: -1 };
    } else if (sort === "status") {
      sortObj = { status: 1, createdAt: -1 };
    }

    const topics = await Topic.find(filter).sort(sortObj);
    return res.json({ topics: topics.map(formatTopic) });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/topics/{id}/focus-time:
 *   get:
 *     tags: [StudyPlanner]
 *     summary: Get aggregated focus time for a topic (FR-7.4)
 *     description: |
 *       Aggregates all Pomodoro FocusSession documents linked to this topic (`linkedType: "topic"`, `linkedId: id`).
 *       Calculates total focus minutes, total sessions, completed counts, and abandoned counts in real time via
 *       MongoDB aggregation without maintaining denormalized duplicate counters on Topic.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Aggregated focus time metrics for the specified topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topicId: { type: string, example: "662c9f1e9f0b2a001c3d4e60" }
 *                 totalFocusMinutes: { type: number, example: 125 }
 *                 sessionCount: { type: integer, example: 5 }
 *                 completedCount: { type: integer, example: 4 }
 *                 abandonedCount: { type: integer, example: 1 }
 *       404:
 *         description: Topic not found
 */
studyRouter.get(
  "/study/topics/:id/focus-time",
  validate(topicParamsSchema, "params"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { id } = req.params;

      const topic = await Topic.findOne({ _id: id, userId });
      if (!topic) {
        return res.status(404).json({ error: "NotFound", message: "Topic not found" });
      }

      const focusAggregation = await FocusSession.aggregate([
        {
          $match: {
            userId,
            linkedType: "topic",
            linkedId: id
          }
        },
        {
          $group: {
            _id: null,
            totalFocusMinutes: { $sum: "$totalFocusMinutes" },
            sessionCount: { $sum: 1 },
            completedCount: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            abandonedCount: {
              $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] }
            }
          }
        }
      ]);

      const stats = focusAggregation[0] || {
        totalFocusMinutes: 0,
        sessionCount: 0,
        completedCount: 0,
        abandonedCount: 0
      };

      return res.json({
        topicId: id,
        totalFocusMinutes: stats.totalFocusMinutes || 0,
        sessionCount: stats.sessionCount || 0,
        completedCount: stats.completedCount || 0,
        abandonedCount: stats.abandonedCount || 0
      });
    } catch (err: any) {
      return res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

/**
 * @openapi
 * /study/topics/{id}:
 *   get:
 *     tags: [StudyPlanner]
 *     summary: Get topic details with combined focus and study plan linkages (FR-7.4)
 *     description: |
 *       Retrieves comprehensive topic details including child flashcards, real-time aggregated focus time,
 *       recent focus sessions, linked calendar study plan events (`linkedTopicId`), and flashcard review status.
 *       Enables side-by-side comparison of planned study sessions vs. actual logged Pomodoro focus time.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Topic details with combined focus, plan events, and flashcards
 *       404:
 *         description: Topic not found
 */
studyRouter.get("/study/topics/:id", validate(topicParamsSchema, "params"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const topic = await Topic.findOne({ _id: id, userId });
    if (!topic) {
      return res.status(404).json({ error: "NotFound", message: "Topic not found" });
    }

    const [flashcards, focusAggregation, recentFocusSessions, planEvents] = await Promise.all([
      Flashcard.find({ topicId: topic._id, userId }).sort({ createdAt: -1 }),
      FocusSession.aggregate([
        {
          $match: {
            userId,
            linkedType: "topic",
            linkedId: id
          }
        },
        {
          $group: {
            _id: null,
            totalFocusMinutes: { $sum: "$totalFocusMinutes" },
            sessionCount: { $sum: 1 },
            completedCount: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            abandonedCount: {
              $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] }
            }
          }
        }
      ]),
      FocusSession.find({ userId, linkedType: "topic", linkedId: id })
        .sort({ startedAt: -1 })
        .limit(10),
      Event.find({ userId, linkedTopicId: topic._id }).sort({ startTime: 1 })
    ]);

    const focusStats = focusAggregation[0] || {
      totalFocusMinutes: 0,
      sessionCount: 0,
      completedCount: 0,
      abandonedCount: 0
    };

    const now = new Date();
    const totalCards = flashcards.length;
    const dueCards = flashcards.filter((f) => new Date(f.nextReviewDate) <= now).length;
    const masteredCards = flashcards.filter((f) => f.repetitions >= 3 && f.easeFactor >= 2.3).length;
    const learningCards = totalCards - masteredCards;

    return res.json({
      topic: formatTopic(topic),
      flashcards: flashcards.map(formatFlashcard),
      focusTime: {
        topicId: id,
        totalFocusMinutes: focusStats.totalFocusMinutes || 0,
        sessionCount: focusStats.sessionCount || 0,
        completedCount: focusStats.completedCount || 0,
        abandonedCount: focusStats.abandonedCount || 0
      },
      focusSessions: recentFocusSessions.map(formatFocusSession),
      planEvents: planEvents.map((e) => ({
        id: e._id.toString(),
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        status: (e as any).status || "scheduled"
      })),
      flashcardStats: {
        total: totalCards,
        due: dueCards,
        mastered: masteredCards,
        learning: learningCards
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});


/**
 * @openapi
 * /study/topics/{id}:
 *   patch:
 *     tags: [StudyPlanner]
 *     summary: Update a topic
 *     description: Updates title, priority, deadline, status, or estimated duration.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subjectId: { type: string }
 *               title: { type: string }
 *               deadline: { type: string, format: date-time, nullable: true }
 *               priority: { type: string, enum: [low, medium, high] }
 *               status: { type: string, enum: [not_started, in_progress, completed] }
 *               estimatedMinutes: { type: integer, nullable: true }
 *     responses:
 *       200:
 *         description: Topic updated
 *       404:
 *         description: Topic not found
 */
studyRouter.patch(
  "/study/topics/:id",
  validate(topicParamsSchema, "params"),
  validate(updateTopicSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const { subjectId, title, deadline, priority, status, estimatedMinutes } = req.body;

      const topic = await Topic.findOne({ _id: id, userId });
      if (!topic) {
        return res.status(404).json({ error: "NotFound", message: "Topic not found" });
      }

      if (subjectId && subjectId !== topic.subjectId.toString()) {
        const subject = await Subject.findOne({ _id: subjectId, userId });
        if (!subject) {
          return res.status(400).json({ error: "ValidationError", message: "Target subject not found" });
        }
        topic.subjectId = subject._id;
      }

      if (title !== undefined) topic.title = title;
      if (deadline !== undefined) topic.deadline = deadline ? new Date(deadline) : null;
      if (priority !== undefined) topic.priority = priority;
      if (status !== undefined) topic.status = status;
      if (estimatedMinutes !== undefined) topic.estimatedMinutes = estimatedMinutes;

      await topic.save();

      return res.json({ topic: formatTopic(topic) });
    } catch (err: any) {
      return res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

/**
 * @openapi
 * /study/topics/{id}:
 *   delete:
 *     tags: [StudyPlanner]
 *     summary: Delete a topic
 *     description: Deletes a topic and removes associated flashcards.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Topic and associated flashcards deleted
 *       404:
 *         description: Topic not found
 */
studyRouter.delete("/study/topics/:id", validate(topicParamsSchema, "params"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const topic = await Topic.findOne({ _id: id, userId });
    if (!topic) {
      return res.status(404).json({ error: "NotFound", message: "Topic not found" });
    }

    const deletedCards = await Flashcard.deleteMany({ topicId: topic._id, userId });
    await Topic.deleteOne({ _id: topic._id, userId });

    return res.json({
      message: "Topic deleted successfully",
      deletedTopicId: id,
      deletedFlashcardsCount: deletedCards.deletedCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FLASHCARD & SPACED REPETITION (SM-2) ROUTES (FR-7.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /study/flashcards:
 *   post:
 *     tags: [StudyPlanner]
 *     summary: Create a flashcard
 *     description: Creates a flashcard for spaced repetition review initialized with default SM-2 settings (easeFactor 2.5, interval 0d).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [front, back]
 *             properties:
 *               topicId: { type: string, nullable: true }
 *               subjectId: { type: string, nullable: true }
 *               front: { type: string, example: "What is the time complexity of QuickSelect average case?" }
 *               back: { type: string, example: "O(n) average case, O(n^2) worst case." }
 *     responses:
 *       201:
 *         description: Flashcard created
 *       400:
 *         description: Validation error
 */
studyRouter.post("/study/flashcards", validate(createFlashcardSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { topicId, subjectId, front, back } = req.body;

    let resolvedSubjectId = subjectId;
    if (topicId) {
      const topic = await Topic.findOne({ _id: topicId, userId });
      if (!topic) {
        return res.status(400).json({ error: "ValidationError", message: "Topic not found or access denied" });
      }
      if (!resolvedSubjectId) {
        resolvedSubjectId = topic.subjectId.toString();
      }
    }

    if (resolvedSubjectId) {
      const subject = await Subject.findOne({ _id: resolvedSubjectId, userId });
      if (!subject) {
        return res.status(400).json({ error: "ValidationError", message: "Subject not found or access denied" });
      }
    }

    const flashcard = await Flashcard.create({
      userId,
      topicId: topicId ? topicId : null,
      subjectId: resolvedSubjectId ? resolvedSubjectId : null,
      front,
      back,
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewDate: new Date() // ready immediately for initial review
    });

    return res.status(201).json({ flashcard: formatFlashcard(flashcard) });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/flashcards/due:
 *   get:
 *     tags: [StudyPlanner]
 *     summary: Get due flashcards for daily review queue
 *     description: |
 *       Returns all flashcards whose `nextReviewDate` is less than or equal to current time (`<= now`).
 *       Cards are sorted in ascending order of `nextReviewDate` (most overdue cards first),
 *       providing the daily spaced repetition queue.
 *     responses:
 *       200:
 *         description: Array of due flashcards
 */
studyRouter.get("/study/flashcards/due", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const now = new Date();

    const dueCards = await Flashcard.find({
      userId,
      nextReviewDate: { $lte: now }
    }).sort({ nextReviewDate: 1 });

    return res.json({
      count: dueCards.length,
      flashcards: dueCards.map(formatFlashcard)
    });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/flashcards:
 *   get:
 *     tags: [StudyPlanner]
 *     summary: List flashcards
 *     description: Returns flashcards owned by user, optionally filtered by topicId or subjectId.
 *     parameters:
 *       - in: query
 *         name: topicId
 *         schema: { type: string }
 *       - in: query
 *         name: subjectId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of flashcards
 */
studyRouter.get("/study/flashcards", validate(listFlashcardsQuerySchema, "query"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { topicId, subjectId } = req.query as any;

    const filter: FilterQuery<FlashcardDoc> = { userId };
    if (topicId && isValidObjectId(topicId)) {
      filter.topicId = topicId;
    }
    if (subjectId && isValidObjectId(subjectId)) {
      filter.subjectId = subjectId;
    }

    const flashcards = await Flashcard.find(filter).sort({ createdAt: -1 });
    return res.json({ flashcards: flashcards.map(formatFlashcard) });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/flashcards/{id}:
 *   get:
 *     tags: [StudyPlanner]
 *     summary: Get single flashcard
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Flashcard details
 *       404:
 *         description: Flashcard not found
 */
studyRouter.get("/study/flashcards/:id", validate(flashcardParamsSchema, "params"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const flashcard = await Flashcard.findOne({ _id: id, userId });
    if (!flashcard) {
      return res.status(404).json({ error: "NotFound", message: "Flashcard not found" });
    }

    return res.json({ flashcard: formatFlashcard(flashcard) });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/flashcards/{id}:
 *   patch:
 *     tags: [StudyPlanner]
 *     summary: Update a flashcard
 *     description: Modifies front/back content or reassigns topic/subject.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               front: { type: string }
 *               back: { type: string }
 *               topicId: { type: string, nullable: true }
 *               subjectId: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Flashcard updated
 *       404:
 *         description: Flashcard not found
 */
studyRouter.patch(
  "/study/flashcards/:id",
  validate(flashcardParamsSchema, "params"),
  validate(updateFlashcardSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const { front, back, topicId, subjectId } = req.body;

      const flashcard = await Flashcard.findOne({ _id: id, userId });
      if (!flashcard) {
        return res.status(404).json({ error: "NotFound", message: "Flashcard not found" });
      }

      if (front !== undefined) flashcard.front = front;
      if (back !== undefined) flashcard.back = back;
      if (topicId !== undefined) flashcard.topicId = topicId ? topicId : null;
      if (subjectId !== undefined) flashcard.subjectId = subjectId ? subjectId : null;

      await flashcard.save();

      return res.json({ flashcard: formatFlashcard(flashcard) });
    } catch (err: any) {
      return res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

/**
 * @openapi
 * /study/flashcards/{id}:
 *   delete:
 *     tags: [StudyPlanner]
 *     summary: Delete a flashcard
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Flashcard deleted
 *       404:
 *         description: Flashcard not found
 */
studyRouter.delete("/study/flashcards/:id", validate(flashcardParamsSchema, "params"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    const flashcard = await Flashcard.findOne({ _id: id, userId });
    if (!flashcard) {
      return res.status(404).json({ error: "NotFound", message: "Flashcard not found" });
    }

    await Flashcard.deleteOne({ _id: flashcard._id, userId });

    return res.json({ message: "Flashcard deleted successfully", deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message });
  }
});

/**
 * @openapi
 * /study/flashcards/{id}/review:
 *   post:
 *     tags: [StudyPlanner]
 *     summary: Review a flashcard (SM-2 Spaced Repetition)
 *     description: |
 *       Submits a user self-assessment score (0–5) for a flashcard, executes the standard SM-2 algorithm,
 *       updates `easeFactor`, `intervalDays`, `repetitions`, and schedules `nextReviewDate`.
 *       
 *       **SM-2 Quality Rating Scale (0 to 5):**
 *       * **0 (Complete Blackout):** Complete failure to recall. Resets repetitions to 0, interval to 1 day.
 *       * **1 (Incorrect / Familiar):** Wrong answer, but remembered correct response upon reveal. Resets to 1 day.
 *       * **2 (Incorrect / Seemed Easy):** Wrong answer; correct answer seemed easy. Resets to 1 day.
 *       * **3 (Correct with Difficulty):** Correct response recalled with serious difficulty. Advances repetitions, lowers ease factor.
 *       * **4 (Correct with Hesitation):** Correct response after minor hesitation. Standard SM-2 progression.
 *       * **5 (Perfect Response):** Immediate, confident recall. Increases ease factor, accelerates interval.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quality]
 *             properties:
 *               quality:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *                 example: 4
 *                 description: SuperMemo SM-2 self-assessment quality rating score (0 to 5)
 *     responses:
 *       200:
 *         description: Flashcard state updated with new SM-2 scheduling parameters
 *       400:
 *         description: Validation error
 *       404:
 *         description: Flashcard not found
 */
studyRouter.post(
  "/study/flashcards/:id/review",
  validate(flashcardParamsSchema, "params"),
  validate(reviewFlashcardSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { id } = req.params;
      const { quality } = req.body;

      const flashcard = await Flashcard.findOne({ _id: id, userId });
      if (!flashcard) {
        return res.status(404).json({ error: "NotFound", message: "Flashcard not found" });
      }

      // Compute next review using pure SM-2 algorithm
      const calculation = calculateNextReview(
        {
          easeFactor: flashcard.easeFactor,
          intervalDays: flashcard.intervalDays,
          repetitions: flashcard.repetitions,
          nextReviewDate: flashcard.nextReviewDate
        },
        quality,
        new Date()
      );

      flashcard.easeFactor = calculation.easeFactor;
      flashcard.intervalDays = calculation.intervalDays;
      flashcard.repetitions = calculation.repetitions;
      flashcard.nextReviewDate = calculation.nextReviewDate;

      await flashcard.save();

      return res.json({
        flashcard: formatFlashcard(flashcard),
        reviewResult: {
          quality,
          easeFactor: calculation.easeFactor,
          intervalDays: calculation.intervalDays,
          repetitions: calculation.repetitions,
          nextReviewDate: calculation.nextReviewDate.toISOString()
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);
