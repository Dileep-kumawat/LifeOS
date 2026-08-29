import { Event } from "../../models/Event.js";
import { Topic } from "../../models/Topic.js";
import { callAI } from "../ai/callAI.js";
import {
  dateKeyInZone,
  expandRange,
  isValidTimezone,
  type CalendarEventLike
} from "../recurrence.js";
import { logger } from "../../logger.js";

export interface FreeTimeBlock {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface PrioritizedTopic {
  topicId: string;
  subjectId: string;
  title: string;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "completed";
  estimatedMinutes: number;
}

export interface StudyPlanSession {
  topicId: string;
  topicTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reasoning?: string;
}

export interface StudyPlanAllocationResult {
  status: "success" | "no_free_time" | "no_topics" | "error";
  targetDate: string;
  timezone: string;
  freeBlocks: FreeTimeBlock[];
  topics: PrioritizedTopic[];
  plan: StudyPlanSession[];
  totalStudyMinutes: number;
  message: string;
}

/**
 * Resolves a date string or natural language date token ("tomorrow", "today") into YYYY-MM-DD.
 */
export function resolveTargetDateStr(targetDateInput?: string, timezone: string = "UTC"): string {
  const now = new Date();
  const validTz = isValidTimezone(timezone) ? timezone : "UTC";

  if (!targetDateInput || targetDateInput.toLowerCase().includes("tomorrow")) {
    const tomorrow = new Date(now.getTime() + 86_400_000);
    return dateKeyInZone(tomorrow, validTz);
  }
  if (targetDateInput.toLowerCase().includes("today")) {
    return dateKeyInZone(now, validTz);
  }

  const match = targetDateInput.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const parsed = new Date(targetDateInput);
  if (!isNaN(parsed.getTime())) {
    return dateKeyInZone(parsed, validTz);
  }

  const tomorrow = new Date(now.getTime() + 86_400_000);
  return dateKeyInZone(tomorrow, validTz);
}

/**
 * Computes window boundaries for standard working hours (8:00 AM – 10:00 PM) on a given date.
 */
export function getWorkingHoursWindow(dateStr: string, timezone: string = "UTC"): { windowStart: Date; windowEnd: Date } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const validTz = isValidTimezone(timezone) ? timezone : "UTC";

  if (validTz === "UTC") {
    const windowStart = new Date(Date.UTC(year, month - 1, day, 8, 0, 0, 0));
    const windowEnd = new Date(Date.UTC(year, month - 1, day, 22, 0, 0, 0));
    return { windowStart, windowEnd };
  }

  // Handle local offset in specified IANA timezone
  const startIsoCandidate = `${dateStr}T08:00:00`;
  const endIsoCandidate = `${dateStr}T22:00:00`;

  // Create formatted dates matching wall clock in target timezone
  const getUtcInstant = (iso: string) => {
    const localDate = new Date(`${iso}Z`);
    // Format to parts in the target timezone to find offset
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: validTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(localDate);
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const hour = Number(p.hour) === 24 ? 0 : Number(p.hour);
    const wallClockInTz = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
    const offsetMs = wallClockInTz - localDate.getTime();
    return new Date(localDate.getTime() - offsetMs);
  };

  try {
    return {
      windowStart: getUtcInstant(startIsoCandidate),
      windowEnd: getUtcInstant(endIsoCandidate)
    };
  } catch {
    return {
      windowStart: new Date(Date.UTC(year, month - 1, day, 8, 0, 0, 0)),
      windowEnd: new Date(Date.UTC(year, month - 1, day, 22, 0, 0, 0))
    };
  }
}

/**
 * Collects exception overrides for recurring series expansion.
 */
async function collectOverrides(events: any[]): Promise<Map<string, CalendarEventLike>> {
  const ids = new Set<string>();
  for (const event of events) {
    for (const exception of event.exceptions || []) {
      if (exception.overrideEventId) ids.add(exception.overrideEventId.toString());
    }
  }
  if (ids.size === 0) return new Map();
  const docs = await Event.find({ _id: { $in: [...ids] } }).lean();
  return new Map(docs.map((d: any) => [d._id.toString(), d as unknown as CalendarEventLike]));
}

/**
 * Queries the user's existing calendar occurrences for the target date and detects available free time blocks.
 */
export async function findFreeTimeBlocks(
  userId: string,
  targetDateStr: string,
  timezone: string = "UTC"
): Promise<FreeTimeBlock[]> {
  const { windowStart, windowEnd } = getWorkingHoursWindow(targetDateStr, timezone);

  const candidateEvents = await Event.find({
    userId,
    isOverride: { $ne: true },
    $or: [
      { recurrenceRule: null, startTime: { $lt: windowEnd }, endTime: { $gt: windowStart } },
      {
        recurrenceRule: { $ne: null },
        startTime: { $lte: windowEnd },
        $or: [{ recurrenceEndDate: null }, { recurrenceEndDate: { $gte: windowStart } }]
      }
    ]
  }).lean();

  const overridesMap = await collectOverrides(candidateEvents);
  const occurrences = expandRange(
    candidateEvents as unknown as CalendarEventLike[],
    windowStart,
    windowEnd,
    overridesMap
  );

  const busyIntervals: Array<{ start: number; end: number }> = [];
  for (const occ of occurrences) {
    const occStart = Math.max(new Date(occ.startTime).getTime(), windowStart.getTime());
    const occEnd = Math.min(new Date(occ.endTime).getTime(), windowEnd.getTime());
    if (occEnd > occStart) {
      busyIntervals.push({ start: occStart, end: occEnd });
    }
  }

  // Sort busy intervals by start time
  busyIntervals.sort((a, b) => a.start - b.start);

  // Merge overlapping / contiguous busy intervals
  const mergedBusy: Array<{ start: number; end: number }> = [];
  for (const interval of busyIntervals) {
    if (mergedBusy.length === 0) {
      mergedBusy.push({ ...interval });
    } else {
      const prev = mergedBusy[mergedBusy.length - 1];
      if (interval.start <= prev.end) {
        prev.end = Math.max(prev.end, interval.end);
      } else {
        mergedBusy.push({ ...interval });
      }
    }
  }

  // Invert busy intervals to find free gaps (minimum 15 minutes)
  const freeBlocks: FreeTimeBlock[] = [];
  let currentPointer = windowStart.getTime();

  for (const busy of mergedBusy) {
    if (busy.start > currentPointer) {
      const durationMinutes = Math.floor((busy.start - currentPointer) / 60000);
      if (durationMinutes >= 15) {
        freeBlocks.push({
          startTime: new Date(currentPointer).toISOString(),
          endTime: new Date(busy.start).toISOString(),
          durationMinutes
        });
      }
    }
    currentPointer = Math.max(currentPointer, busy.end);
  }

  if (windowEnd.getTime() > currentPointer) {
    const durationMinutes = Math.floor((windowEnd.getTime() - currentPointer) / 60000);
    if (durationMinutes >= 15) {
      freeBlocks.push({
        startTime: new Date(currentPointer).toISOString(),
        endTime: new Date(windowEnd.getTime()).toISOString(),
        durationMinutes
      });
    }
  }

  return freeBlocks;
}

/**
 * Retrieves the user's active topics sorted deterministically by deadline proximity and priority.
 */
export async function getPrioritizedActiveTopics(userId: string): Promise<PrioritizedTopic[]> {
  const topics = await Topic.find({
    userId,
    status: { $in: ["not_started", "in_progress"] }
  }).lean();

  const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };

  topics.sort((a, b) => {
    // 1. Deadline proximity: earliest deadline first; missing deadlines last
    if (a.deadline && b.deadline) {
      const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (diff !== 0) return diff;
    } else if (a.deadline && !b.deadline) {
      return -1;
    } else if (!a.deadline && b.deadline) {
      return 1;
    }

    // 2. Priority: high > medium > low
    const pA = priorityWeight[a.priority as string] || 2;
    const pB = priorityWeight[b.priority as string] || 2;
    if (pA !== pB) return pB - pA;

    // 3. Fallback creation time
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return topics.map((t) => ({
    topicId: t._id.toString(),
    subjectId: t.subjectId.toString(),
    title: t.title,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    priority: (t.priority as "low" | "medium" | "high") || "medium",
    status: (t.status as "not_started" | "in_progress" | "completed") || "not_started",
    estimatedMinutes: typeof t.estimatedMinutes === "number" && t.estimatedMinutes > 0 ? t.estimatedMinutes : 45
  }));
}

/**
 * Deterministic heuristic allocation fallback ensuring 100% reliability if LLM output fails or is unavailable.
 */
export function heuristicStudyAllocation(
  topics: PrioritizedTopic[],
  freeBlocks: FreeTimeBlock[]
): StudyPlanSession[] {
  const assignments: StudyPlanSession[] = [];
  let topicIdx = 0;

  for (const block of freeBlocks) {
    let blockStart = new Date(block.startTime).getTime();
    const blockEnd = new Date(block.endTime).getTime();

    while (topicIdx < topics.length && blockStart < blockEnd) {
      const topic = topics[topicIdx];
      const requestedMinutes = topic.estimatedMinutes || 45;
      const availableMs = blockEnd - blockStart;

      if (availableMs < 15 * 60000) {
        break; // remaining block space too small for a study session
      }

      const sessionMs = Math.min(requestedMinutes * 60000, availableMs);
      const sessionEnd = blockStart + sessionMs;

      assignments.push({
        topicId: topic.topicId,
        topicTitle: topic.title,
        startTime: new Date(blockStart).toISOString(),
        endTime: new Date(sessionEnd).toISOString(),
        durationMinutes: Math.round(sessionMs / 60000),
        reasoning: `Scheduled prioritized topic (${topic.priority} priority)`
      });

      // 10 minute buffer between study sessions within the same free block
      blockStart = sessionEnd + 10 * 60000;
      topicIdx++;
    }
  }

  return assignments;
}

/**
 * Core service to generate an optimized study plan by matching prioritized active topics into free calendar slots.
 */
export async function generateStudyPlanAllocation(
  userId: string,
  targetDateInput?: string,
  timezone: string = "UTC"
): Promise<StudyPlanAllocationResult> {
  const validTz = isValidTimezone(timezone) ? timezone : "UTC";
  const targetDateStr = resolveTargetDateStr(targetDateInput, validTz);

  // 1. Detect free time blocks
  const freeBlocks = await findFreeTimeBlocks(userId, targetDateStr, validTz);

  if (freeBlocks.length === 0) {
    return {
      status: "no_free_time",
      targetDate: targetDateStr,
      timezone: validTz,
      freeBlocks: [],
      topics: [],
      plan: [],
      totalStudyMinutes: 0,
      message: `I checked your calendar for ${targetDateStr}, but there are no free time slots between 8:00 AM and 10:00 PM.`
    };
  }

  // 2. Query prioritized active topics
  const topics = await getPrioritizedActiveTopics(userId);

  if (topics.length === 0) {
    return {
      status: "no_topics",
      targetDate: targetDateStr,
      timezone: validTz,
      freeBlocks,
      topics: [],
      plan: [],
      totalStudyMinutes: 0,
      message: "You don't have any active syllabus topics in your Study Planner right now."
    };
  }

  // 3. Compose prompt for callAI() to perform fuzzy allocation
  const systemPrompt = {
    role: "system" as const,
    content: `You are LifeOS AI, an intelligent productivity scheduling assistant.
Your task is to assign the user's top-priority study topics into available free calendar time blocks for date: ${targetDateStr}.

CONSTRAINTS & RULES:
1. ONLY schedule sessions strictly within the provided free time blocks. Do not create times outside the free blocks.
2. Maintain startTime and endTime as valid ISO 8601 strings (e.g. "2026-08-30T09:00:00.000Z") with endTime > startTime.
3. Prioritize urgent topics with near deadlines and High priority first.
4. Respect topic estimated minutes (e.g. 30-90 min), and allow brief 5-10 min transition buffers between back-to-back sessions.
5. Return strictly valid JSON with no markdown wrapping and no additional commentary in this format:
{
  "plan": [
    {
      "topicId": "string (id from input topics)",
      "topicTitle": "string",
      "startTime": "ISO 8601 string",
      "endTime": "ISO 8601 string",
      "durationMinutes": number,
      "reasoning": "brief explanation"
    }
  ]
}`
  };

  const userPrompt = {
    role: "user" as const,
    content: JSON.stringify({
      targetDate: targetDateStr,
      timezone: validTz,
      availableFreeBlocks: freeBlocks,
      prioritizedTopics: topics
    })
  };

  let plan: StudyPlanSession[] = [];

  try {
    const aiRes = await callAI([systemPrompt, userPrompt], {
      userId,
      requestType: "study_plan_generation",
      temperature: 0.2
    });

    if (aiRes.success && aiRes.content) {
      const rawContent = aiRes.content.trim();
      const jsonStr = rawContent.startsWith("```")
        ? rawContent
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "")
            .trim()
        : rawContent;

      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed.plan) && parsed.plan.length > 0) {
        const topicMap = new Map(topics.map((t) => [t.topicId, t]));

        for (const item of parsed.plan) {
          const matchedTopic = topicMap.get(item.topicId);
          const start = new Date(item.startTime).getTime();
          const end = new Date(item.endTime).getTime();

          if (matchedTopic && !isNaN(start) && !isNaN(end) && end > start) {
            plan.push({
              topicId: matchedTopic.topicId,
              topicTitle: matchedTopic.title,
              startTime: new Date(start).toISOString(),
              endTime: new Date(end).toISOString(),
              durationMinutes: Math.round((end - start) / 60000),
              reasoning: item.reasoning || `Scheduled ${matchedTopic.priority} priority topic`
            });
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err, userId, targetDateStr }, "Failed to generate AI study plan via LLM; falling back to heuristic");
  }

  // Fallback if AI produced no valid sessions
  if (plan.length === 0) {
    plan = heuristicStudyAllocation(topics, freeBlocks);
  }

  const totalStudyMinutes = plan.reduce((sum, s) => sum + s.durationMinutes, 0);

  return {
    status: "success",
    targetDate: targetDateStr,
    timezone: validTz,
    freeBlocks,
    topics,
    plan,
    totalStudyMinutes,
    message: `Generated study plan with ${plan.length} session(s) totaling ${totalStudyMinutes} minutes for ${targetDateStr}.`
  };
}
