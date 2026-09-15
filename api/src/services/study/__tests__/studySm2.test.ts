import { describe, it, expect, vi } from "vitest";
import {
  calculateNextReview,
  SM2_DEFAULT_EASE_FACTOR,
  SM2_MINIMUM_EASE_FACTOR
} from "@lifeos/shared";

describe("SM-2 Spaced Repetition Algorithm (SuperMemo 2)", () => {
  const baseDate = new Date("2026-08-29T12:00:00.000Z");

  describe("Initial Review (repetitions = 0)", () => {
    it("sets interval to 1 day and repetitions to 1 on initial good recall (quality 4)", () => {
      const initialCard = {
        easeFactor: SM2_DEFAULT_EASE_FACTOR,
        intervalDays: 0,
        repetitions: 0
      };

      const result = calculateNextReview(initialCard, 4, baseDate);

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBe(2.5); // 2.5 + (0.1 - 1 * (0.08 + 0.02)) = 2.5
      expect(result.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");
    });

    it("increases ease factor on perfect recall (quality 5)", () => {
      const initialCard = {
        easeFactor: SM2_DEFAULT_EASE_FACTOR,
        intervalDays: 0,
        repetitions: 0
      };

      const result = calculateNextReview(initialCard, 5, baseDate);

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      // EF' = 2.5 + (0.1 - 0) = 2.6
      expect(result.easeFactor).toBe(2.6);
      expect(result.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");
    });

    it("decreases ease factor on difficult correct recall (quality 3)", () => {
      const initialCard = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0
      };

      const result = calculateNextReview(initialCard, 3, baseDate);

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      // deltaEF = 0.1 - 2 * (0.08 + 2 * 0.02) = 0.1 - 2 * 0.12 = 0.1 - 0.24 = -0.14
      // EF' = 2.5 - 0.14 = 2.36
      expect(result.easeFactor).toBe(2.36);
    });

    it("keeps repetitions at 0 and interval at 1 day on initial failure (quality 0-2)", () => {
      const initialCard = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0
      };

      const result = calculateNextReview(initialCard, 1, baseDate);

      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(1);
      // deltaEF = 0.1 - 4 * (0.08 + 4 * 0.02) = 0.1 - 4 * 0.16 = 0.1 - 0.64 = -0.54
      // EF' = 2.5 - 0.54 = 1.96
      expect(result.easeFactor).toBe(1.96);
      expect(result.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");
    });
  });

  describe("Consecutive Review Sequence (Standard Progression)", () => {
    it("progresses correctly across a 4-step sequence of successful reviews (quality 4)", () => {
      let card = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0
      };

      // Review 1: reps 0 -> reps 1, interval 1
      const rev1 = calculateNextReview(card, 4, baseDate);
      expect(rev1.repetitions).toBe(1);
      expect(rev1.intervalDays).toBe(1);
      expect(rev1.easeFactor).toBe(2.5);
      expect(rev1.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");

      // Review 2: reps 1 -> reps 2, interval 6
      const rev2 = calculateNextReview(rev1, 4, rev1.nextReviewDate);
      expect(rev2.repetitions).toBe(2);
      expect(rev2.intervalDays).toBe(6);
      expect(rev2.easeFactor).toBe(2.5);
      expect(rev2.nextReviewDate.toISOString()).toBe("2026-09-05T12:00:00.000Z");

      // Review 3: reps 2 -> reps 3, interval = round(6 * 2.5) = 15
      const rev3 = calculateNextReview(rev2, 4, rev2.nextReviewDate);
      expect(rev3.repetitions).toBe(3);
      expect(rev3.intervalDays).toBe(15);
      expect(rev3.easeFactor).toBe(2.5);
      expect(rev3.nextReviewDate.toISOString()).toBe("2026-09-20T12:00:00.000Z");

      // Review 4: reps 3 -> reps 4, interval = round(15 * 2.5) = 38
      const rev4 = calculateNextReview(rev3, 4, rev3.nextReviewDate);
      expect(rev4.repetitions).toBe(4);
      expect(rev4.intervalDays).toBe(38);
      expect(rev4.easeFactor).toBe(2.5);
      expect(rev4.nextReviewDate.toISOString()).toBe("2026-10-28T12:00:00.000Z");
    });

    it("accelerates intervals when quality is consistently 5 (perfect recall)", () => {
      let card = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0
      };

      // Rev 1 (q=5): EF becomes 2.6, interval = 1
      const rev1 = calculateNextReview(card, 5, baseDate);
      expect(rev1.easeFactor).toBe(2.6);
      expect(rev1.intervalDays).toBe(1);
      expect(rev1.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");

      // Rev 2 (q=5): EF becomes 2.7, interval = 6
      const rev2 = calculateNextReview(rev1, 5, rev1.nextReviewDate);
      expect(rev2.easeFactor).toBe(2.7);
      expect(rev2.intervalDays).toBe(6);
      expect(rev2.nextReviewDate.toISOString()).toBe("2026-09-05T12:00:00.000Z");

      // Rev 3 (q=5): EF becomes 2.8, interval = round(6 * 2.7) = 16
      const rev3 = calculateNextReview(rev2, 5, rev2.nextReviewDate);
      expect(rev3.easeFactor).toBe(2.8);
      expect(rev3.intervalDays).toBe(16);
      expect(rev3.nextReviewDate.toISOString()).toBe("2026-09-21T12:00:00.000Z");
    });
  });

  describe("Lapse & Reset Behavior on Failure", () => {
    it("resets repetitions to 0 and interval to 1 day on failed recall (quality < 3) after high streak", () => {
      const advancedCard = {
        easeFactor: 2.5,
        intervalDays: 45,
        repetitions: 5
      };

      const result = calculateNextReview(advancedCard, 1, baseDate);

      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(1);
      expect(result.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it("resets repetitions on complete blackout (quality 0) and resets interval to 1 day", () => {
      const advancedCard = {
        easeFactor: 2.4,
        intervalDays: 20,
        repetitions: 3
      };

      const result = calculateNextReview(advancedCard, 0, baseDate);

      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(1);
      // deltaEF = 0.1 - 5 * (0.08 + 5 * 0.02) = 0.1 - 5 * 0.18 = 0.1 - 0.9 = -0.8
      // EF' = 2.4 - 0.8 = 1.6
      expect(result.easeFactor).toBe(1.6);
      expect(result.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");
    });

    it("handles recovery after a quality-0 blackout reset", () => {
      const resetCard = {
        easeFactor: 1.6,
        intervalDays: 1,
        repetitions: 0
      };

      // Quality 4 after reset: reps becomes 1, interval 1, EF unchanged
      const recovered = calculateNextReview(resetCard, 4, baseDate);
      expect(recovered.repetitions).toBe(1);
      expect(recovered.intervalDays).toBe(1);
      expect(recovered.easeFactor).toBe(1.6);
      expect(recovered.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");

      // Next review quality 4: reps becomes 2, interval 6
      const nextStep = calculateNextReview(recovered, 4, recovered.nextReviewDate);
      expect(nextStep.repetitions).toBe(2);
      expect(nextStep.intervalDays).toBe(6);
      expect(nextStep.easeFactor).toBe(1.6);
      expect(nextStep.nextReviewDate.toISOString()).toBe("2026-09-05T12:00:00.000Z");
    });
  });

  describe("Ease Factor Floor Clamping", () => {
    it("never allows easeFactor to drop below 1.3 regardless of how many failed reviews occur", () => {
      let card = {
        easeFactor: 1.4,
        intervalDays: 1,
        repetitions: 0
      };

      // Quality 0 with starting EF 1.4 would normally subtract 0.8 to 0.6, but must clamp at 1.3
      const result = calculateNextReview(card, 0, baseDate);
      expect(result.easeFactor).toBe(SM2_MINIMUM_EASE_FACTOR);
      expect(result.easeFactor).toBe(1.3);

      // Subsequent failure also stays at 1.3
      const result2 = calculateNextReview(result, 0, baseDate);
      expect(result2.easeFactor).toBe(SM2_MINIMUM_EASE_FACTOR);
      expect(result2.easeFactor).toBe(1.3);

      // Third failure in a row also stays at 1.3
      const result3 = calculateNextReview(result2, 0, baseDate);
      expect(result3.easeFactor).toBe(SM2_MINIMUM_EASE_FACTOR);
    });

    it("clamps initial easeFactor to 1.3 if input card has an invalid easeFactor below minimum", () => {
      const subFloorCard = {
        easeFactor: 1.1,
        intervalDays: 3,
        repetitions: 1
      };

      // Starting with EF 1.1: gets clamped to 1.3 first, then q=4 preserves 1.3
      const result = calculateNextReview(subFloorCard, 4, baseDate);
      expect(result.easeFactor).toBe(1.3);
      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });
  });

  describe("Input Clamping, Defaults & Date Determinism", () => {
    it("clamps quality below 0 to 0 and above 5 to 5", () => {
      const card = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

      const belowMin = calculateNextReview(card, -5, baseDate);
      expect(belowMin.repetitions).toBe(0);
      expect(belowMin.intervalDays).toBe(1);

      const aboveMax = calculateNextReview(card, 10, baseDate);
      expect(aboveMax.repetitions).toBe(1);
      expect(aboveMax.intervalDays).toBe(1);
      expect(aboveMax.easeFactor).toBe(2.6);
    });

    it("provides sane defaults when optional card fields are omitted", () => {
      const card = {};
      const result = calculateNextReview(card, 4, baseDate);

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBe(SM2_DEFAULT_EASE_FACTOR);
      expect(result.nextReviewDate.toISOString()).toBe("2026-08-30T12:00:00.000Z");
    });

    it("uses mocked current time deterministically when baseDate is omitted", () => {
      const fakeNow = new Date("2026-11-15T08:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow);

      try {
        const card = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };
        const result = calculateNextReview(card, 4);

        expect(result.repetitions).toBe(1);
        expect(result.intervalDays).toBe(1);
        expect(result.nextReviewDate.toISOString()).toBe("2026-11-16T08:00:00.000Z");
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
