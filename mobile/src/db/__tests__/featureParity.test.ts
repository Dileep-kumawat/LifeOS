import { describe, it, expect, beforeEach } from "vitest";
import { eventRepo } from "../repositories/eventRepo";
import { habitRepo, computeHabitStreaks } from "../repositories/habitRepo";
import { goalRepo } from "../repositories/goalRepo";
import { noteRepo } from "../repositories/noteRepo";
import { financeRepo } from "../repositories/financeRepo";
import { getDatabase } from "../database";

describe("Phase 1–4 Feature Parity Test Suite: SQLite Local Repositories", () => {
  const userId = "parity_user_1";

  beforeEach(async () => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM events WHERE userId = ?;", userId);
    await db.runAsync("DELETE FROM habits WHERE userId = ?;", userId);
    await db.runAsync("DELETE FROM habit_check_ins WHERE userId = ?;", userId);
    await db.runAsync("DELETE FROM goals WHERE userId = ?;", userId);
    await db.runAsync("DELETE FROM notes WHERE userId = ?;", userId);
    await db.runAsync("DELETE FROM note_folders WHERE userId = ?;", userId);
    await db.runAsync("DELETE FROM transactions WHERE userId = ?;", userId);
    await db.runAsync("DELETE FROM budgets WHERE userId = ?;", userId);
  });

  it("1. Calendar: creates recurring event and retrieves with range filtering", async () => {
    const ev = await eventRepo.createEvent({
      userId,
      title: "Weekly Sync",
      description: "Team meeting",
      location: "Room 1",
      startTime: "2026-08-17T10:00:00.000Z",
      endTime: "2026-08-17T11:00:00.000Z",
      timezone: "UTC",
      isAllDay: 0,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
      recurrenceEndDate: null,
      exceptions: "[]",
      reminderLeadMinutes: 15,
      reminderJobId: null,
      isOverride: 0,
      parentEventId: null
    });

    expect(ev.syncStatus).toBe("pending");
    expect(ev.title).toBe("Weekly Sync");

    const eventsInRange = await eventRepo.listEventsForRange(
      userId,
      "2026-08-17T00:00:00.000Z",
      "2026-08-24T23:59:59.000Z"
    );
    expect(eventsInRange.length).toBe(1);
  });

  it("2. Habits: creates habit, toggles check-in and computes streaks", async () => {
    const habit = await habitRepo.createHabit({
      userId,
      title: "Daily Meditation",
      frequency: JSON.stringify({ type: "daily" }),
      reminderTime: "07:00",
      reminderEnabled: 1,
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      lastCheckInDate: null
    });

    expect(habit.syncStatus).toBe("pending");

    const checkInRes = await habitRepo.toggleCheckIn(habit.id, userId, "2026-08-17");
    expect(checkInRes.isCheckedIn).toBe(true);
    expect(checkInRes.habit?.currentStreak).toBe(1);

    const dates = ["2026-08-17", "2026-08-16", "2026-08-15", "2026-08-14"];
    const stats = computeHabitStreaks(dates, "2026-08-17");

    expect(stats.currentStreak).toBe(4);
    expect(stats.longestStreak).toBe(4);
    expect(stats.completionRate).toBeGreaterThan(0);
  });

  it("3. Goals: manages milestones and automatically recalculates progress percent", async () => {
    const goal = await goalRepo.createGoal({
      userId,
      title: "Launch Mobile App",
      description: "Deliver Phase 5",
      targetDate: "2026-09-01T00:00:00.000Z",
      status: "active",
      progressPercent: 0,
      milestones: JSON.stringify([
        { id: "m1", title: "Scaffold", completed: false },
        { id: "m2", title: "Sync Engine", completed: false }
      ]),
      linkedEventIds: "[]",
      linkedNoteIds: "[]"
    });

    expect(goal.progressPercent).toBe(0);

    // Toggle first milestone
    const { goal: updatedGoal } = await goalRepo.toggleMilestone(goal.id, "m1");
    expect(updatedGoal?.progressPercent).toBe(50);
    expect(updatedGoal?.status).toBe("active");

    // Toggle second milestone
    const { goal: completedGoal } = await goalRepo.toggleMilestone(goal.id, "m2");
    expect(completedGoal?.progressPercent).toBe(100);
    expect(completedGoal?.status).toBe("completed");
  });

  it("4. Notes: tracks version snapshots on update and supports rollback", async () => {
    const note = await noteRepo.createNote({
      userId,
      title: "Draft 1",
      content: '{"type":"doc","content":[]}',
      contentText: "Original Text",
      folderId: null,
      tags: "[]"
    });

    expect(note.title).toBe("Draft 1");

    // Update note
    await noteRepo.updateNote(note.id, {
      title: "Draft 2",
      contentText: "Updated Text"
    });

    const versions = await noteRepo.listNoteVersions(note.id);
    expect(versions.length).toBe(2);

    // Rollback to version 1
    const restored = await noteRepo.restoreNoteVersion(note.id, 1);
    expect(restored?.title).toBe("Draft 1");
    expect(restored?.contentText).toBe("Original Text");
  });

  it("5. Finance: logs transactions, calculates category breakdown, and alerts on overspend", async () => {
    // Set budget: Food limit $200
    await financeRepo.createOrUpdateBudget({
      userId,
      category: "Food",
      limit: 200,
      period: "monthly",
      currentSpend: 0,
      notifiedOverspend: 0
    });

    // Log $150 Food expense
    await financeRepo.createTransaction({
      userId,
      amount: 150,
      type: "expense",
      category: "Food",
      date: "2026-08-10T12:00:00.000Z",
      note: "Groceries",
      receiptAttachment: null
    });

    // Log $100 Food expense (total $250 > $200 limit)
    await financeRepo.createTransaction({
      userId,
      amount: 100,
      type: "expense",
      category: "Food",
      date: "2026-08-15T12:00:00.000Z",
      note: "Dinner",
      receiptAttachment: null
    });

    // Log $1000 Salary income
    await financeRepo.createTransaction({
      userId,
      amount: 1000,
      type: "income",
      category: "Salary",
      date: "2026-08-01T12:00:00.000Z",
      note: "Paycheck",
      receiptAttachment: null
    });

    const summary = await financeRepo.getFinanceSummary(userId, "2026-08");
    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpense).toBe(250);
    expect(summary.netSavings).toBe(750);
    expect(summary.categoryBreakdown[0].category).toBe("Food");
    expect(summary.categoryBreakdown[0].amount).toBe(250);

    const budgets = await financeRepo.listBudgets(userId);
    const foodBudget = budgets.find((b) => b.category === "Food");
    expect(foodBudget?.currentSpend).toBe(250);
    expect(foodBudget?.notifiedOverspend).toBe(1); // Overspend detected!
  });

  it("6. Study Planner: creates Subject, Topic, Flashcard and reviews with SM-2 algorithm", async () => {
    const { subjectRepo } = await import("../repositories/subjectRepo");
    const { topicRepo } = await import("../repositories/topicRepo");
    const { flashcardRepo } = await import("../repositories/flashcardRepo");

    const subject = await subjectRepo.createSubject({
      userId,
      name: "Computer Science",
      color: "#0075de",
      examDate: "2026-10-15T09:00:00.000Z"
    });
    expect(subject.id).toBeDefined();
    expect(subject.name).toBe("Computer Science");
    expect(subject.syncStatus).toBe("pending");

    const topic = await topicRepo.createTopic({
      userId,
      subjectId: subject.id,
      title: "Binary Search Trees",
      deadline: "2026-09-01T00:00:00.000Z",
      priority: "high",
      status: "in_progress",
      estimatedMinutes: 60
    });
    expect(topic.id).toBeDefined();
    expect(topic.subjectId).toBe(subject.id);
    expect(topic.priority).toBe("high");

    const flashcard = await flashcardRepo.createFlashcard({
      userId,
      subjectId: subject.id,
      topicId: topic.id,
      front: "What is the average lookup time in a balanced BST?",
      back: "O(log N)",
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewDate: "2026-08-30T00:00:00.000Z"
    });
    expect(flashcard.id).toBeDefined();
    expect(flashcard.easeFactor).toBe(2.5);

    // Query due flashcards
    const due = await flashcardRepo.getDueFlashcards(userId, new Date("2026-08-30T12:00:00.000Z"));
    expect(due.length).toBe(1);
    expect(due[0].id).toBe(flashcard.id);

    // Process SM-2 review with quality 4 (Good)
    const reviewed = await flashcardRepo.reviewFlashcard(flashcard.id, 4, new Date("2026-08-30T12:00:00.000Z"));
    expect(reviewed).not.toBeNull();
    expect(reviewed!.repetitions).toBe(1);
    expect(reviewed!.intervalDays).toBe(1);
    expect(reviewed!.syncStatus).toBe("pending");

    // Second review with quality 5 (Easy)
    const reviewed2 = await flashcardRepo.reviewFlashcard(flashcard.id, 5, new Date("2026-08-31T12:00:00.000Z"));
    expect(reviewed2!.repetitions).toBe(2);
    expect(reviewed2!.intervalDays).toBe(6);
  });

  it("7. Pomodoro Focus: tracks active session, pause, resume, interval transition, and completion", async () => {
    const { focusRepo } = await import("../repositories/focusRepo");

    const session = await focusRepo.startSession({
      userId,
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4,
      linkedType: "topic",
      linkedId: "topic-123"
    });

    expect(session.id).toBeDefined();
    expect(session.status).toBe("active");
    expect(session.currentPhase).toBe("work");
    expect(session.currentCycle).toBe(1);
    expect(session.syncStatus).toBe("pending");

    // Pause session
    const paused = await focusRepo.pauseSession(session.id);
    expect(paused?.status).toBe("paused");
    expect(paused?.pausedAt).toBeDefined();

    // Resume session
    const resumed = await focusRepo.resumeSession(session.id);
    expect(resumed?.status).toBe("active");
    expect(resumed?.lastResumedAt).toBeDefined();

    // Complete interval (work -> break)
    const breakPhase = await focusRepo.intervalComplete(session.id, "work");
    expect(breakPhase?.currentPhase).toBe("break");
    expect(breakPhase?.currentCycle).toBe(1);

    // Complete interval (break -> work, cycle becomes 2)
    const nextWorkPhase = await focusRepo.intervalComplete(session.id, "break");
    expect(nextWorkPhase?.currentPhase).toBe("work");
    expect(nextWorkPhase?.currentCycle).toBe(2);

    // Complete session
    const completed = await focusRepo.completeSession(session.id);
    expect(completed?.status).toBe("completed");
    expect(completed?.completedAt).toBeDefined();
  });
});
