import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock React Native and Expo runtime modules
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  AppState: {
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() })
  }
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: null }
}));

vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: 1,
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined)
}));

import { syncEngine } from "../syncEngine";
import { subjectRepo } from "../../db/repositories/subjectRepo";
import { topicRepo } from "../../db/repositories/topicRepo";
import { flashcardRepo } from "../../db/repositories/flashcardRepo";
import { focusRepo } from "../../db/repositories/focusRepo";
import { getDatabase, resetDatabaseForTests } from "../../db/database";
import { notificationService } from "../notificationService";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../apiClient";

vi.mock("../apiClient", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn()
  },
  refreshAccessToken: vi.fn(),
  tokenStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined)
  }
}));

import { useSyncStore } from "../../store/syncStore";

describe("Sync Engine & Mobile Offline Port: Study Planner & Pomodoro Focus", () => {
  const userId = "study_focus_user_test";

  beforeEach(async () => {
    await resetDatabaseForTests();
    vi.clearAllMocks();
    notificationService.setDndDuringFocus(false);
    notificationService.setFocusSessionActive(false);
    useAuthStore.getState().setAuth(
      {
        id: userId,
        email: "test@example.com",
        name: "Tester",
        role: "user",
        status: "active",
        emailVerified: true,
        createdAt: new Date().toISOString()
      },
      "mock-test-jwt-token"
    );
    useSyncStore.getState().reset();
    useSyncStore.getState().setIsOnline(true);
  });

  it("1. Offline flashcard review queue: reviews offline and queues sync items", async () => {
    // Create subject, topic, and flashcards locally
    const subject = await subjectRepo.createSubject({
      userId,
      name: "Organic Chemistry",
      color: "#1aae39",
      examDate: null
    });

    const topic = await topicRepo.createTopic({
      userId,
      subjectId: subject.id,
      title: "Aldehydes & Ketones",
      deadline: null,
      priority: "high",
      status: "in_progress",
      estimatedMinutes: 45
    });

    const card = await flashcardRepo.createFlashcard({
      userId,
      subjectId: subject.id,
      topicId: topic.id,
      front: "What is the nucleophile in Grignard reaction?",
      back: "Carbanion (R-)",
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewDate: new Date(Date.now() - 10000).toISOString()
    });

    // 1. Check due flashcards query
    const dueCards = await flashcardRepo.getDueFlashcards(userId, new Date());
    expect(dueCards.length).toBe(1);
    expect(dueCards[0].id).toBe(card.id);

    // 2. Perform offline review (Again / 0 quality)
    const review0 = await flashcardRepo.reviewFlashcard(card.id, 0);
    expect(review0).not.toBeNull();
    expect(review0!.repetitions).toBe(0);
    expect(review0!.intervalDays).toBe(1);
    expect(review0!.syncStatus).toBe("pending");

    // 3. Perform next day review (Good / 4 quality)
    const review4 = await flashcardRepo.reviewFlashcard(card.id, 4, new Date(Date.now() + 86400000));
    expect(review4!.repetitions).toBe(1);
    expect(review4!.intervalDays).toBe(1);
    expect(review4!.syncStatus).toBe("pending");

    // 4. Perform subsequent review (Easy / 5 quality)
    const review5 = await flashcardRepo.reviewFlashcard(card.id, 5, new Date(Date.now() + 86400000 * 2));
    expect(review5!.repetitions).toBe(2);
    expect(review5!.intervalDays).toBe(6);
  });

  it("2. Offline Pomodoro accumulation: pauses, resumes, and computes totalFocusMinutes", async () => {
    const session = await focusRepo.startSession({
      userId,
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4,
      linkedType: "none"
    });

    expect(session.status).toBe("active");
    expect(session.syncStatus).toBe("pending");

    // Simulate 20 minutes active work
    const db = await getDatabase();
    const pastResumedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    await db.runAsync(
      "UPDATE focus_sessions SET lastResumedAt = ? WHERE id = ?;",
      pastResumedAt,
      session.id
    );

    // Pause session
    const paused = await focusRepo.pauseSession(session.id);
    expect(paused?.status).toBe("paused");
    expect(paused?.accumulatedWorkSeconds).toBeGreaterThanOrEqual(1200);
    expect(paused?.totalFocusMinutes).toBeGreaterThanOrEqual(20);
    expect(paused?.syncStatus).toBe("pending");

    // Resume session
    const resumed = await focusRepo.resumeSession(session.id);
    expect(resumed?.status).toBe("active");
    expect(resumed?.pausedAt).toBeNull();

    // Complete interval
    const breakPhase = await focusRepo.intervalComplete(session.id, "work");
    expect(breakPhase?.currentPhase).toBe("break");

    // Complete session
    const completed = await focusRepo.completeSession(session.id);
    expect(completed?.status).toBe("completed");
    expect(completed?.totalFocusMinutes).toBeGreaterThanOrEqual(20);
  });

  it("3. Cascade deletion: deleting Subject cascade-deletes its topics and flashcards", async () => {
    const subject = await subjectRepo.createSubject({
      userId,
      name: "Calculus",
      color: "#0075de",
      examDate: null
    });

    const topic1 = await topicRepo.createTopic({
      userId,
      subjectId: subject.id,
      title: "Integration by Parts",
      deadline: null,
      priority: "medium",
      status: "not_started",
      estimatedMinutes: 30
    });

    const topic2 = await topicRepo.createTopic({
      userId,
      subjectId: subject.id,
      title: "Taylor Series",
      deadline: null,
      priority: "high",
      status: "not_started",
      estimatedMinutes: 45
    });

    await flashcardRepo.createFlashcard({
      userId,
      subjectId: subject.id,
      topicId: topic1.id,
      front: "Integral of ln(x) dx",
      back: "x ln(x) - x + C",
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString()
    });

    await flashcardRepo.createFlashcard({
      userId,
      subjectId: subject.id,
      topicId: topic2.id,
      front: "Taylor series formula",
      back: "sum (f^(n)(a)/n!) (x-a)^n",
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString()
    });

    const topicsBefore = await topicRepo.listTopics(userId, { subjectId: subject.id });
    const cardsBefore = await flashcardRepo.listFlashcards(userId, { subjectId: subject.id });
    expect(topicsBefore.length).toBe(2);
    expect(cardsBefore.length).toBe(2);

    // Delete Subject -> cascade deletes child topics and flashcards
    await subjectRepo.deleteSubject(subject.id);

    const topicsAfter = await topicRepo.listTopics(userId, { subjectId: subject.id });
    const cardsAfter = await flashcardRepo.listFlashcards(userId, { subjectId: subject.id });
    expect(topicsAfter.length).toBe(0);
    expect(cardsAfter.length).toBe(0);
  });

  it("4. FR-8.4 Do Not Disturb suppression: suppresses non-critical notifications during active focus", () => {
    // 1. When DND is disabled -> all notifications deliver
    notificationService.setDndDuringFocus(false);
    notificationService.setFocusSessionActive(false);

    expect(
      notificationService.shouldDeliverNotification("cal_notif_1", Date.now(), {
        type: "calendar_reminder"
      })
    ).toBe(true);

    // 2. When DND is enabled AND focus session is active:
    notificationService.setDndDuringFocus(true);
    notificationService.setFocusSessionActive(true);

    // Calendar notification is suppressed
    expect(
      notificationService.shouldDeliverNotification("cal_notif_2", Date.now(), {
        type: "calendar_reminder"
      })
    ).toBe(false);

    // Habit notification is suppressed
    expect(
      notificationService.shouldDeliverNotification("habit_notif_1", Date.now(), {
        type: "habit_reminder"
      })
    ).toBe(false);

    // General notification is suppressed
    expect(
      notificationService.shouldDeliverNotification("gen_notif_1", Date.now(), {
        type: "general"
      })
    ).toBe(false);

    // Focus interval completion alert is PRESERVED and delivered!
    expect(
      notificationService.shouldDeliverNotification("interval_notif_1", Date.now(), {
        type: "focus_interval"
      })
    ).toBe(true);

    // Critical notification is PRESERVED and delivered!
    expect(
      notificationService.shouldDeliverNotification("crit_notif_1", Date.now(), {
        type: "system",
        isCritical: true
      })
    ).toBe(true);

    // 3. When session ends (isFocusSessionActive = false) -> notifications deliver normally
    notificationService.setFocusSessionActive(false);
    expect(
      notificationService.shouldDeliverNotification("cal_notif_3", Date.now(), {
        type: "calendar_reminder"
      })
    ).toBe(true);
  });

  it("5. Sync push inclusion: includes pending subjects, topics, flashcards, focus_sessions in push payload", async () => {
    // Create local entities
    const sub = await subjectRepo.createSubject({
      userId,
      name: "Biology",
      color: "#2a9d99",
      examDate: null
    });

    const top = await topicRepo.createTopic({
      userId,
      subjectId: sub.id,
      title: "Cellular Respiration",
      deadline: null,
      priority: "medium",
      status: "in_progress",
      estimatedMinutes: 45
    });

    await flashcardRepo.createFlashcard({
      userId,
      subjectId: sub.id,
      topicId: top.id,
      front: "Where does glycolysis occur?",
      back: "Cytoplasm",
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString()
    });

    await focusRepo.startSession({
      userId,
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4,
      linkedType: "topic",
      linkedId: top.id
    });

    let capturedPushChanges: any[] = [];
    (apiClient.post as any).mockImplementation((url: string, body: any) => {
      if (url === "/sync/push") {
        capturedPushChanges = body.changes || [];
        return Promise.resolve({
          data: {
            results: (body.changes || []).map((i: any) => ({
              module: i.module,
              id: i.id,
              status: "applied"
            })),
            cursor: "new_cursor_push_1"
          }
        });
      }
      if (url === "/sync/pull") {
        return Promise.resolve({
          data: {
            cursor: "new_cursor_pull_1",
            changes: {}
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    // Execute sync
    const syncSuccess = await syncEngine.syncNow();
    expect(syncSuccess).toBe(true);

    const pushModules = capturedPushChanges.map((i) => i.module);
    expect(pushModules).toContain("subjects");
    expect(pushModules).toContain("topics");
    expect(pushModules).toContain("flashcards");
    expect(pushModules).toContain("focus_sessions");

    const pushedSubject = capturedPushChanges.find((i) => i.module === "subjects");
    expect(pushedSubject.data.name).toBe("Biology");

    const pushedTopic = capturedPushChanges.find((i) => i.module === "topics");
    expect(pushedTopic.data.title).toBe("Cellular Respiration");

    const pushedCard = capturedPushChanges.find((i) => i.module === "flashcards");
    expect(pushedCard.data.front).toBe("Where does glycolysis occur?");

    const pushedSession = capturedPushChanges.find((i) => i.module === "focus_sessions");
    expect(pushedSession.data.linkedType).toBe("topic");
  });
});
