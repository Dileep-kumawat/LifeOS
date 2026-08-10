import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { Habit } from "../models/Habit.js";
import { HabitCheckIn } from "../models/HabitCheckIn.js";
import { calculateHabitStats, formatDateString } from "../services/streak.js";
import mongoose from "mongoose";

export const habitsRouter = Router();

habitsRouter.use(requireAuth);

/**
 * Helper to recalculate and save habit stats upon check-in updates.
 */
async function updateHabitStats(habit: any, userId: any, refDateStr?: string) {
  const allCheckIns = await HabitCheckIn.find({ habitId: habit._id, userId }).select("date completed");
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
  return stats;
}

/**
 * @openapi
 * /habits:
 *   post:
 *     tags:
 *       - Habits
 *     summary: Create a new habit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               frequency:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [daily, weekly, custom]
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: number
 *                   timesPerPeriod:
 *                     type: number
 *               reminderTime:
 *                 type: string
 *                 nullable: true
 *                 example: "08:00"
 *               reminderEnabled:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Habit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Habit"
 *             examples:
 *               habit:
 *                 value:
 *                   _id: 662c9f1e9f0b2a001c3d4e5f
 *                   userId: 662c9f1e9f0b2a001c3d4e5a
 *                   title: Morning run
 *                   frequency:
 *                     type: weekly
 *                     daysOfWeek: [2, 4, 6]
 *                     timesPerPeriod: 3
 *                   currentStreak: 4
 *                   longestStreak: 12
 *                   completionRate: 0.72
 *                   lastCheckInDate: "2026-08-05"
 *                   createdAt: 2026-01-10T08:00:00.000Z
 *                   updatedAt: 2026-08-05T06:30:00.000Z
 *                   __v: 0
 *       400:
 *         description: Validation error (title required)
 *       401:
 *         description: Authentication required
 */
habitsRouter.post("/habits", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { title, frequency, reminderTime, reminderEnabled } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Validation Error", message: "Title is required." });
    }

    const freqType = frequency?.type || "daily";
    const daysOfWeek = Array.isArray(frequency?.daysOfWeek) ? frequency.daysOfWeek : [];
    const timesPerPeriod = typeof frequency?.timesPerPeriod === "number" ? frequency.timesPerPeriod : 1;

    const habit = await Habit.create({
      userId,
      title: title.trim(),
      frequency: {
        type: freqType,
        daysOfWeek,
        timesPerPeriod
      },
      reminderTime: reminderTime ?? null,
      reminderEnabled: reminderEnabled !== undefined ? Boolean(reminderEnabled) : Boolean(reminderTime),
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      lastCheckInDate: null
    });

    return res.status(201).json(habit);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /habits:
 *   get:
 *     tags:
 *       - Habits
 *     summary: List user habits
 *     responses:
 *       200:
 *         description: List of habits with cached streak stats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Habit"
 *       401:
 *         description: Authentication required
 */
habitsRouter.get("/habits", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const habits = await Habit.find({ userId }).sort({ createdAt: -1 });
    return res.json(habits);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /habits/{id}:
 *   get:
 *     tags:
 *       - Habits
 *     summary: Get a habit by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Habit details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Habit"
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Habit not found (or not owned by this user)
 */
habitsRouter.get("/habits/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    const habit = await Habit.findOne({ _id: id, userId });
    if (!habit) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    return res.json(habit);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /habits/{id}:
 *   patch:
 *     tags:
 *       - Habits
 *     summary: Update a habit definition
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               frequency:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [daily, weekly, custom] }
 *                   daysOfWeek: { type: array, items: { type: number } }
 *                   timesPerPeriod: { type: number }
 *               reminderTime: { type: string, nullable: true, example: "08:00" }
 *               reminderEnabled: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Updated habit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Habit"
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Habit not found
 */
habitsRouter.patch("/habits/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    const habit = await Habit.findOne({ _id: id, userId });
    if (!habit) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    const { title, frequency, reminderTime, reminderEnabled } = req.body;
    if (title !== undefined) habit.title = title.trim();
    if (frequency !== undefined) {
      if (frequency.type) habit.frequency.type = frequency.type;
      if (Array.isArray(frequency.daysOfWeek)) habit.frequency.daysOfWeek = frequency.daysOfWeek;
      if (typeof frequency.timesPerPeriod === "number") habit.frequency.timesPerPeriod = frequency.timesPerPeriod;
    }
    if (reminderTime !== undefined) habit.reminderTime = reminderTime;
    if (reminderEnabled !== undefined) habit.reminderEnabled = Boolean(reminderEnabled);

    await habit.save();
    await updateHabitStats(habit, userId);

    return res.json(habit);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /habits/{id}:
 *   delete:
 *     tags:
 *       - Habits
 *     summary: Delete a habit and its check-in history
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Habit deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *             example:
 *               message: Habit and check-in history deleted successfully.
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Habit not found
 */
habitsRouter.delete("/habits/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    const habit = await Habit.findOneAndDelete({ _id: id, userId });
    if (!habit) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    await HabitCheckIn.deleteMany({ habitId: id, userId });
    return res.json({ message: "Habit and check-in history deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /habits/{id}/check-in:
 *   post:
 *     tags:
 *       - Habits
 *     summary: Log or update a habit check-in (Upsert)
 *     description: |
 *       Upserts a check-in for the given date (format YYYY-MM-DD). Checking in
 *       twice for the same date updates the existing record rather than
 *       creating a duplicate — the check-in is keyed by (habitId, date), so
 *       re-submitting `{ date, completed: false }` un-completes a day (e.g.
 *       undoing a mistaken check-in) and rewinds the streak. The habit's
 *       currentStreak / longestStreak / completionRate are recomputed from the
 *       full history and written back to the Habit document in the same
 *       request, so subsequent GETs are consistent.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - completed
 *             properties:
 *               date:
 *                 type: string
 *                 example: "2026-08-05"
 *               completed:
 *                 type: boolean
 *                 description: Pass false to remove/undo the check-in for this date.
 *     responses:
 *       200:
 *         description: Check-in upserted and habit stats updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkIn:
 *                   $ref: "#/components/schemas/HabitCheckIn"
 *                 habit:
 *                   $ref: "#/components/schemas/Habit"
 *             examples:
 *               result:
 *                 value:
 *                   checkIn:
 *                     _id: 662c9f1e9f0b2a001c3d4e5f
 *                     habitId: 662c9f1e9f0b2a001c3d4e5a
 *                     userId: 662c9f1e9f0b2a001c3d4e50
 *                     date: "2026-08-05"
 *                     completed: true
 *                     createdAt: 2026-08-05T06:30:00.000Z
 *                     updatedAt: 2026-08-05T06:30:00.000Z
 *                     __v: 0
 *                   habit:
 *                     _id: 662c9f1e9f0b2a001c3d4e5a
 *                     userId: 662c9f1e9f0b2a001c3d4e50
 *                     title: Morning run
 *                     frequency: { type: daily, daysOfWeek: [], timesPerPeriod: 1 }
 *                     currentStreak: 5
 *                     longestStreak: 5
 *                     completionRate: 0.83
 *                     lastCheckInDate: "2026-08-05"
 *                     createdAt: 2026-07-01T08:00:00.000Z
 *                     updatedAt: 2026-08-05T06:30:00.000Z
 *                     __v: 0
 *       400:
 *         description: Invalid date or parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Habit not found
 */
habitsRouter.post("/habits/:id/check-in", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const { date, completed } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    const habit = await Habit.findOne({ _id: id, userId });
    if (!habit) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Valid date in YYYY-MM-DD format is required."
      });
    }

    const isCompleted = typeof completed === "boolean" ? completed : true;

    // Upsert check-in record
    const checkIn = await HabitCheckIn.findOneAndUpdate(
      { habitId: id, date },
      { userId, habitId: id, date, completed: isCompleted },
      { upsert: true, new: true, runValidators: true }
    );

    // Recalculate streak and write stats back to Habit document in the same operation
    await updateHabitStats(habit, userId, date);

    return res.json({
      checkIn,
      habit
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /habits/{id}/check-ins:
 *   get:
 *     tags:
 *       - Habits
 *     summary: Get check-in history for a date range (heatmap)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Check-in records array
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/HabitCheckIn"
 *             examples:
 *               checkIns:
 *                 value:
 *                   - _id: 662c9f1e9f0b2a001c3d4e5f
 *                     habitId: 662c9f1e9f0b2a001c3d4e5a
 *                     userId: 662c9f1e9f0b2a001c3d4e50
 *                     date: "2026-08-03"
 *                     completed: true
 *                     createdAt: 2026-08-03T06:30:00.000Z
 *                     updatedAt: 2026-08-03T06:30:00.000Z
 *                     __v: 0
 *                   - _id: 662c9f1e9f0b2a001c3d4e60
 *                     habitId: 662c9f1e9f0b2a001c3d4e5a
 *                     userId: 662c9f1e9f0b2a001c3d4e50
 *                     date: "2026-08-04"
 *                     completed: true
 *                     createdAt: 2026-08-04T06:30:00.000Z
 *                     updatedAt: 2026-08-04T06:30:00.000Z
 *                     __v: 0
 *       400:
 *         description: Missing or invalid date range params
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Habit not found
 */
habitsRouter.get("/habits/:id/check-ins", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    const habit = await Habit.findOne({ _id: id, userId });
    if (!habit) {
      return res.status(404).json({ error: "Not Found", message: "Habit not found." });
    }

    const query: Record<string, any> = { habitId: id, userId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate as string;
      if (endDate) query.date.$lte = endDate as string;
    }

    const checkIns = await HabitCheckIn.find(query).sort({ date: 1 });
    return res.json(checkIns);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Habit:
 *       type: object
 *       description: A habit with cached streak statistics. Streak stats are recomputed on every check-in.
 *       properties:
 *         _id: { type: string }
 *         userId: { type: string }
 *         title: { type: string }
 *         frequency:
 *           type: object
 *           properties:
 *             type: { type: string, enum: [daily, weekly, custom] }
 *             daysOfWeek:
 *               type: array
 *               items: { type: number, minimum: 0, maximum: 6 }
 *             timesPerPeriod: { type: number, minimum: 1 }
 *         currentStreak: { type: number }
 *         longestStreak: { type: number }
 *         completionRate: { type: number, minimum: 0, maximum: 1 }
 *         lastCheckInDate: { type: string, nullable: true }
 *         reminderTime: { type: string, nullable: true, example: "08:00" }
 *         reminderEnabled: { type: boolean, example: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     HabitCheckIn:
 *       type: object
 *       description: A single day's check-in for a habit, keyed by (habitId, date).
 *       properties:
 *         _id: { type: string }
 *         habitId: { type: string }
 *         userId: { type: string }
 *         date: { type: string, format: date, description: YYYY-MM-DD }
 *         completed: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */
