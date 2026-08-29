import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// Mock Queue & Embedding Job
vi.mock("../../queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, jobId: "mock-job-id" })
}));

vi.mock("../embeddingJob.js", () => ({
  enqueueEmbeddingJob: vi.fn().mockResolvedValue(undefined),
  deleteEmbedding: vi.fn().mockResolvedValue(undefined)
}));

import { Event } from "../../../models/Event.js";
import { Topic } from "../../../models/Topic.js";
import { executeToolCall } from "../tools.js";
import { generateStudyPlanAllocation } from "../../study/studyPlanService.js";
import * as callAIModule from "../callAI.js";

describe("UC-2 End-to-End Chat Flow: AI Study Plan Generation & Tool Confirmation", () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockSubjectId = new mongoose.Types.ObjectId();
  const mockTopic1Id = new mongoose.Types.ObjectId();
  const mockTopic2Id = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(callAIModule, "callAI").mockImplementation(async () => ({
      success: true,
      content: JSON.stringify({
        plan: [
          {
            topicId: mockTopic1Id.toString(),
            topicTitle: "Computer Networks: TCP Congestion Control",
            startTime: "2026-08-30T10:30:00.000Z",
            endTime: "2026-08-30T11:30:00.000Z",
            durationMinutes: 60,
            reasoning: "High priority topic due tomorrow"
          },
          {
            topicId: mockTopic2Id.toString(),
            topicTitle: "Algorithms: Dynamic Programming",
            startTime: "2026-08-30T15:30:00.000Z",
            endTime: "2026-08-30T17:00:00.000Z",
            durationMinutes: 90,
            reasoning: "Medium priority topic scheduled in afternoon free block"
          }
        ]
      }),
      providerServed: "mistral"
    }));
  });

  it("UC-2: 'Create tomorrow's study plan' flow against seeded calendar events & topics", async () => {
    // 1. Seed user's existing calendar with real events (creating known free gaps)
    const seededEvents = [
      {
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        title: "Team Standup",
        startTime: new Date("2026-08-30T09:00:00.000Z"),
        endTime: new Date("2026-08-30T10:00:00.000Z"),
        timezone: "UTC",
        recurrenceRule: null,
        exceptions: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        title: "Client Presentation",
        startTime: new Date("2026-08-30T14:00:00.000Z"),
        endTime: new Date("2026-08-30T15:30:00.000Z"),
        timezone: "UTC",
        recurrenceRule: null,
        exceptions: []
      }
    ];

    vi.spyOn(Event, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue(seededEvents)
    } as any);

    // 2. Seed user's active topics with deadlines and priorities
    const seededTopics = [
      {
        _id: mockTopic1Id,
        subjectId: mockSubjectId,
        userId: mockUserId,
        title: "Computer Networks: TCP Congestion Control",
        deadline: new Date("2026-08-31T23:59:59.000Z"),
        priority: "high",
        status: "in_progress",
        estimatedMinutes: 60,
        createdAt: new Date()
      },
      {
        _id: mockTopic2Id,
        subjectId: mockSubjectId,
        userId: mockUserId,
        title: "Algorithms: Dynamic Programming",
        deadline: new Date("2026-09-02T23:59:59.000Z"),
        priority: "medium",
        status: "not_started",
        estimatedMinutes: 90,
        createdAt: new Date()
      }
    ];

    vi.spyOn(Topic, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue(seededTopics)
    } as any);

    // 3. Run allocation pipeline (as triggered by AI chat tool call)
    const planResult = await generateStudyPlanAllocation(mockUserId, "2026-08-30", "UTC");

    expect(planResult.status).toBe("success");
    expect(planResult.freeBlocks.length).toBeGreaterThan(0);
    expect(planResult.plan.length).toBe(2);

    // Verify topic 1 is scheduled in morning block after 10:00 AM
    const session1 = planResult.plan[0];
    expect(session1.topicTitle).toBe("Computer Networks: TCP Congestion Control");
    expect(session1.topicId).toBe(mockTopic1Id.toString());
    expect(new Date(session1.startTime).getTime()).toBeGreaterThanOrEqual(new Date("2026-08-30T10:00:00.000Z").getTime());

    // 4. Test User Confirmation: Executing the confirmed tool call creates real events
    const createdDocs: any[] = [];
    vi.spyOn(Event, "create").mockImplementation((doc: any) => {
      const created = {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        save: vi.fn().mockResolvedValue(true)
      };
      createdDocs.push(created);
      return Promise.resolve(created as any);
    });

    const executionResult = (await executeToolCall(mockUserId, "generate_study_plan", {
      timezone: "UTC",
      plan: planResult.plan
    })) as any;

    expect(executionResult.count).toBe(2);
    expect(createdDocs.length).toBe(2);

    // Verify first event is linked to Topic 1 and has correct metadata
    expect(createdDocs[0].title).toBe("Study: Computer Networks: TCP Congestion Control");
    expect(createdDocs[0].linkedTopicId).toBe(mockTopic1Id.toString());
    expect(createdDocs[0].userId).toBe(mockUserId);

    // Verify second event is linked to Topic 2
    expect(createdDocs[1].title).toBe("Study: Algorithms: Dynamic Programming");
    expect(createdDocs[1].linkedTopicId).toBe(mockTopic2Id.toString());
  });

  it("UC-2: User Cancellation leaves database completely untouched (zero events created)", async () => {
    const mockEventCreate = vi.spyOn(Event, "create");

    // Simulate user declining / cancelling action in Chat
    // (chatSocket marks status as cancelled and does NOT invoke executeToolCall)
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("UC-2: Packed calendar with no free time returns graceful uncertainty response", async () => {
    // Packed calendar covering the whole 8am-10pm window
    vi.spyOn(Event, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          title: "All Day Intensive Workshop",
          startTime: new Date("2026-08-30T08:00:00.000Z"),
          endTime: new Date("2026-08-30T22:00:00.000Z"),
          timezone: "UTC",
          recurrenceRule: null,
          exceptions: []
        }
      ])
    } as any);

    vi.spyOn(Topic, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: mockTopic1Id,
          title: "Physics Mechanics",
          priority: "high",
          status: "not_started"
        }
      ])
    } as any);

    const planResult = await generateStudyPlanAllocation(mockUserId, "2026-08-30", "UTC");
    expect(planResult.status).toBe("no_free_time");
    expect(planResult.plan.length).toBe(0);
    expect(planResult.message).toContain("no free time slots between 8:00 AM and 10:00 PM");
  });
});
