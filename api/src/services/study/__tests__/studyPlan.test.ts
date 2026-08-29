import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// Mock Queue & Embedding Job
vi.mock("../../queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, jobId: "mock-job-id" })
}));

vi.mock("../../ai/embeddingJob.js", () => ({
  enqueueEmbeddingJob: vi.fn().mockResolvedValue(undefined),
  deleteEmbedding: vi.fn().mockResolvedValue(undefined)
}));

import { Event } from "../../../models/Event.js";
import { Topic } from "../../../models/Topic.js";
import {
  findFreeTimeBlocks,
  getPrioritizedActiveTopics,
  generateStudyPlanAllocation,
  heuristicStudyAllocation,
  resolveTargetDateStr,
  getWorkingHoursWindow
} from "../studyPlanService.js";
import { executeGenerateStudyPlan } from "../../ai/tools.js";
import * as callAIModule from "../../ai/callAI.js";

describe("Study Plan Service & Free-Time Allocation (FR-7.2)", () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const targetDateStr = "2026-08-30";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Target Date Resolution & Working Hours Window", () => {
    it("resolves natural language 'tomorrow' to next calendar day", () => {
      const resolved = resolveTargetDateStr("tomorrow", "UTC");
      expect(resolved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("resolves specific YYYY-MM-DD input date string", () => {
      const resolved = resolveTargetDateStr("2026-09-15", "UTC");
      expect(resolved).toBe("2026-09-15");
    });

    it("establishes 8:00 AM to 10:00 PM working hours window", () => {
      const { windowStart, windowEnd } = getWorkingHoursWindow("2026-08-30", "UTC");
      expect(windowStart.toISOString()).toBe("2026-08-30T08:00:00.000Z");
      expect(windowEnd.toISOString()).toBe("2026-08-30T22:00:00.000Z");
      expect((windowEnd.getTime() - windowStart.getTime()) / 3600000).toBe(14); // 14 hours
    });
  });

  describe("2. Free-Time Block Detection via Calendar Expansion", () => {
    it("returns entire working window as free block when no events exist", async () => {
      vi.spyOn(Event, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as any);

      const freeBlocks = await findFreeTimeBlocks(mockUserId, targetDateStr, "UTC");
      expect(freeBlocks.length).toBe(1);
      expect(freeBlocks[0].startTime).toBe("2026-08-30T08:00:00.000Z");
      expect(freeBlocks[0].endTime).toBe("2026-08-30T22:00:00.000Z");
      expect(freeBlocks[0].durationMinutes).toBe(840); // 14h * 60m
    });

    it("identifies discrete free gaps between existing scheduled events", async () => {
      const mockEvents = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          title: "Morning Meeting",
          startTime: new Date("2026-08-30T09:00:00.000Z"),
          endTime: new Date("2026-08-30T10:30:00.000Z"),
          timezone: "UTC",
          recurrenceRule: null,
          exceptions: []
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          title: "Team Sync",
          startTime: new Date("2026-08-30T13:00:00.000Z"),
          endTime: new Date("2026-08-30T14:00:00.000Z"),
          timezone: "UTC",
          recurrenceRule: null,
          exceptions: []
        }
      ];

      vi.spyOn(Event, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockEvents)
      } as any);

      const freeBlocks = await findFreeTimeBlocks(mockUserId, targetDateStr, "UTC");

      // Expected gaps:
      // 1. 08:00 - 09:00 (60 mins)
      // 2. 10:30 - 13:00 (150 mins)
      // 3. 14:00 - 22:00 (480 mins)
      expect(freeBlocks.length).toBe(3);
      expect(freeBlocks[0].startTime).toBe("2026-08-30T08:00:00.000Z");
      expect(freeBlocks[0].endTime).toBe("2026-08-30T09:00:00.000Z");
      expect(freeBlocks[0].durationMinutes).toBe(60);

      expect(freeBlocks[1].startTime).toBe("2026-08-30T10:30:00.000Z");
      expect(freeBlocks[1].endTime).toBe("2026-08-30T13:00:00.000Z");
      expect(freeBlocks[1].durationMinutes).toBe(150);

      expect(freeBlocks[2].startTime).toBe("2026-08-30T14:00:00.000Z");
      expect(freeBlocks[2].endTime).toBe("2026-08-30T22:00:00.000Z");
      expect(freeBlocks[2].durationMinutes).toBe(480);
    });

    it("returns empty free blocks when calendar is fully booked all day", async () => {
      const fullDayEvent = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          title: "All Day Conference",
          startTime: new Date("2026-08-30T07:00:00.000Z"),
          endTime: new Date("2026-08-30T23:00:00.000Z"),
          timezone: "UTC",
          recurrenceRule: null,
          exceptions: []
        }
      ];

      vi.spyOn(Event, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue(fullDayEvent)
      } as any);

      const freeBlocks = await findFreeTimeBlocks(mockUserId, targetDateStr, "UTC");
      expect(freeBlocks.length).toBe(0);
    });
  });

  describe("3. Active Topic Prioritization & Ranking", () => {
    it("sorts active topics by deadline proximity and priority (high > medium > low)", async () => {
      const subjectId = new mongoose.Types.ObjectId();
      const mockTopics = [
        {
          _id: new mongoose.Types.ObjectId(),
          subjectId,
          title: "Topic C: No Deadline, Medium Priority",
          deadline: null,
          priority: "medium",
          status: "in_progress",
          estimatedMinutes: 45,
          createdAt: new Date("2026-08-01")
        },
        {
          _id: new mongoose.Types.ObjectId(),
          subjectId,
          title: "Topic A: Near Deadline, Medium Priority",
          deadline: new Date("2026-08-31T12:00:00.000Z"),
          priority: "medium",
          status: "not_started",
          estimatedMinutes: 60,
          createdAt: new Date("2026-08-02")
        },
        {
          _id: new mongoose.Types.ObjectId(),
          subjectId,
          title: "Topic B: Same Near Deadline, High Priority",
          deadline: new Date("2026-08-31T12:00:00.000Z"),
          priority: "high",
          status: "not_started",
          estimatedMinutes: 45,
          createdAt: new Date("2026-08-03")
        },
        {
          _id: new mongoose.Types.ObjectId(),
          subjectId,
          title: "Topic D: Distant Deadline",
          deadline: new Date("2026-09-30T12:00:00.000Z"),
          priority: "high",
          status: "in_progress",
          estimatedMinutes: 30,
          createdAt: new Date("2026-08-04")
        }
      ];

      vi.spyOn(Topic, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTopics)
      } as any);

      const prioritized = await getPrioritizedActiveTopics(mockUserId);
      expect(prioritized.length).toBe(4);

      // Topic B should be first (Earliest deadline + High priority)
      expect(prioritized[0].title).toBe("Topic B: Same Near Deadline, High Priority");
      // Topic A should be second (Same earliest deadline + Medium priority)
      expect(prioritized[1].title).toBe("Topic A: Near Deadline, Medium Priority");
      // Topic D should be third (Distant deadline)
      expect(prioritized[2].title).toBe("Topic D: Distant Deadline");
      // Topic C should be last (No deadline)
      expect(prioritized[3].title).toBe("Topic C: No Deadline, Medium Priority");
    });
  });

  describe("4. End-to-End Study Plan Allocation & Fallbacks", () => {
    it("generates structured allocation plan via callAI()", async () => {
      const subjectId = new mongoose.Types.ObjectId();
      const topic1Id = new mongoose.Types.ObjectId();
      const topic2Id = new mongoose.Types.ObjectId();

      vi.spyOn(Event, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as any);

      vi.spyOn(Topic, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: topic1Id,
            subjectId,
            title: "Operating Systems: Concurrency",
            deadline: new Date("2026-08-31"),
            priority: "high",
            status: "not_started",
            estimatedMinutes: 60,
            createdAt: new Date()
          },
          {
            _id: topic2Id,
            subjectId,
            title: "Database Indexing",
            deadline: new Date("2026-09-02"),
            priority: "medium",
            status: "not_started",
            estimatedMinutes: 45,
            createdAt: new Date()
          }
        ])
      } as any);

      const mockAiPlan = {
        plan: [
          {
            topicId: topic1Id.toString(),
            topicTitle: "Operating Systems: Concurrency",
            startTime: "2026-08-30T09:00:00.000Z",
            endTime: "2026-08-30T10:00:00.000Z",
            durationMinutes: 60,
            reasoning: "High priority topic due tomorrow scheduled in morning block"
          },
          {
            topicId: topic2Id.toString(),
            topicTitle: "Database Indexing",
            startTime: "2026-08-30T10:15:00.000Z",
            endTime: "2026-08-30T11:00:00.000Z",
            durationMinutes: 45,
            reasoning: "Medium priority topic scheduled after short break"
          }
        ]
      };

      vi.spyOn(callAIModule, "callAI").mockResolvedValue({
        success: true,
        content: JSON.stringify(mockAiPlan),
        providerServed: "groq"
      });

      const result = await generateStudyPlanAllocation(mockUserId, targetDateStr, "UTC");

      expect(result.status).toBe("success");
      expect(result.plan.length).toBe(2);
      expect(result.plan[0].topicTitle).toBe("Operating Systems: Concurrency");
      expect(result.plan[0].startTime).toBe("2026-08-30T09:00:00.000Z");
      expect(result.plan[1].topicTitle).toBe("Database Indexing");
      expect(result.totalStudyMinutes).toBe(105);
    });

    it("returns status: 'no_free_time' when calendar is fully booked", async () => {
      vi.spyOn(Event, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            userId: mockUserId,
            title: "Busy All Day",
            startTime: new Date("2026-08-30T08:00:00.000Z"),
            endTime: new Date("2026-08-30T22:00:00.000Z"),
            timezone: "UTC",
            recurrenceRule: null,
            exceptions: []
          }
        ])
      } as any);

      const result = await generateStudyPlanAllocation(mockUserId, targetDateStr, "UTC");
      expect(result.status).toBe("no_free_time");
      expect(result.message).toContain("no free time slots");
      expect(result.plan.length).toBe(0);
    });

    it("returns status: 'no_topics' when user has no active topics in syllabus", async () => {
      vi.spyOn(Event, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as any);

      vi.spyOn(Topic, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as any);

      const result = await generateStudyPlanAllocation(mockUserId, targetDateStr, "UTC");
      expect(result.status).toBe("no_topics");
      expect(result.message).toContain("active syllabus topics");
      expect(result.plan.length).toBe(0);
    });

    it("uses deterministic heuristic fallback when LLM output fails or is invalid", () => {
      const mockTopics = [
        {
          topicId: "t-1",
          subjectId: "s-1",
          title: "Algorithms",
          deadline: "2026-08-31T00:00:00.000Z",
          priority: "high" as const,
          status: "not_started" as const,
          estimatedMinutes: 60
        }
      ];
      const mockFreeBlocks = [
        {
          startTime: "2026-08-30T09:00:00.000Z",
          endTime: "2026-08-30T11:00:00.000Z",
          durationMinutes: 120
        }
      ];

      const fallbackPlan = heuristicStudyAllocation(mockTopics, mockFreeBlocks);
      expect(fallbackPlan.length).toBe(1);
      expect(fallbackPlan[0].topicTitle).toBe("Algorithms");
      expect(fallbackPlan[0].durationMinutes).toBe(60);
    });
  });

  describe("5. Tool Execution Writes & Reverse Linking (FR-2.14, FR-7.2)", () => {
    it("creates real Event documents linked to source topics upon confirmation", async () => {
      const topicId = new mongoose.Types.ObjectId().toString();
      const planArgs = {
        timezone: "America/New_York",
        plan: [
          {
            topicId,
            topicTitle: "Calculus III",
            startTime: "2026-08-30T14:00:00.000Z",
            endTime: "2026-08-30T15:00:00.000Z"
          }
        ]
      };

      const mockEventDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        title: "Study: Calculus III",
        startTime: new Date(planArgs.plan[0].startTime),
        endTime: new Date(planArgs.plan[0].endTime),
        timezone: planArgs.timezone,
        linkedTopicId: topicId,
        reminderLeadMinutes: 15,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Event, "create").mockResolvedValue(mockEventDoc as any);

      const result = await executeGenerateStudyPlan(mockUserId, planArgs);
      expect(result.count).toBe(1);
      expect(result.events[0].title).toBe("Study: Calculus III");
      expect(result.events[0].linkedTopicId).toBe(topicId);
      expect(Event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          title: "Study: Calculus III",
          linkedTopicId: topicId,
          timezone: "America/New_York"
        })
      );
    });

    it("rejects execution when session times are invalid or empty", async () => {
      await expect(
        executeGenerateStudyPlan(mockUserId, { plan: [] })
      ).rejects.toThrow("No study plan sessions provided to execute.");

      await expect(
        executeGenerateStudyPlan(mockUserId, {
          timezone: "UTC",
          plan: [
            {
              topicTitle: "Invalid Times",
              startTime: "2026-08-30T15:00:00.000Z",
              endTime: "2026-08-30T14:00:00.000Z"
            }
          ]
        })
      ).rejects.toThrow("Study session end time must be after start time.");
    });
  });
});
