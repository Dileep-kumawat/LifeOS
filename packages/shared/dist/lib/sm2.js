/**
 * SuperMemo SM-2 Spaced Repetition Algorithm Implementation.
 * Pure function with deterministic output and 0-5 quality score scale.
 *
 * Quality Rating Scale (SM-2 standard):
 * 0 - Complete blackout (forgot completely)
 * 1 - Incorrect response; the correct one remembered upon reveal
 * 2 - Incorrect response; where the correct one seemed easy to recall
 * 3 - Correct response recalled with serious difficulty
 * 4 - Correct response after a hesitation
 * 5 - Perfect response, instant recall
 */
export const SM2_MINIMUM_EASE_FACTOR = 1.3;
export const SM2_DEFAULT_EASE_FACTOR = 2.5;
/**
 * Calculates next review interval, repetitions count, ease factor, and review date
 * using the standard SuperMemo SM-2 algorithm.
 *
 * @param card Current card review state
 * @param quality User self-assessment quality rating (integer from 0 to 5)
 * @param baseDate Reference date to calculate nextReviewDate from (defaults to now)
 */
export function calculateNextReview(card, quality, baseDate = new Date()) {
    // Validate and clamp quality to [0, 5]
    const clampedQuality = Math.max(0, Math.min(5, Math.round(quality)));
    let easeFactor = card.easeFactor ?? SM2_DEFAULT_EASE_FACTOR;
    let intervalDays = card.intervalDays ?? 0;
    let repetitions = card.repetitions ?? 0;
    // Ensure initial ease factor respects minimum bound
    if (easeFactor < SM2_MINIMUM_EASE_FACTOR) {
        easeFactor = SM2_MINIMUM_EASE_FACTOR;
    }
    // Determine interval and repetitions based on recall success
    if (clampedQuality >= 3) {
        // Successful recall
        if (repetitions === 0) {
            intervalDays = 1;
        }
        else if (repetitions === 1) {
            intervalDays = 6;
        }
        else {
            intervalDays = Math.round(intervalDays * easeFactor);
            if (intervalDays < 1)
                intervalDays = 1;
        }
        repetitions += 1;
    }
    else {
        // Failed recall: reset repetitions count and restart interval at 1 day
        repetitions = 0;
        intervalDays = 1;
    }
    // Update Ease Factor using SM-2 polynomial:
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const qDiff = 5 - clampedQuality;
    const deltaEF = 0.1 - qDiff * (0.08 + qDiff * 0.02);
    let newEaseFactor = easeFactor + deltaEF;
    // Ease factor cannot fall below 1.3
    if (newEaseFactor < SM2_MINIMUM_EASE_FACTOR) {
        newEaseFactor = SM2_MINIMUM_EASE_FACTOR;
    }
    // Round EF to 4 decimal places to prevent floating point drift
    newEaseFactor = Math.round(newEaseFactor * 10000) / 10000;
    // Calculate nextReviewDate by adding interval in milliseconds
    const nextReviewDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    return {
        easeFactor: newEaseFactor,
        intervalDays,
        repetitions,
        nextReviewDate
    };
}
