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
export interface SM2CardState {
    easeFactor?: number;
    intervalDays?: number;
    repetitions?: number;
    nextReviewDate?: Date | string | null;
}
export interface SM2CalculationResult {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewDate: Date;
}
export declare const SM2_MINIMUM_EASE_FACTOR = 1.3;
export declare const SM2_DEFAULT_EASE_FACTOR = 2.5;
/**
 * Calculates next review interval, repetitions count, ease factor, and review date
 * using the standard SuperMemo SM-2 algorithm.
 *
 * @param card Current card review state
 * @param quality User self-assessment quality rating (integer from 0 to 5)
 * @param baseDate Reference date to calculate nextReviewDate from (defaults to now)
 */
export declare function calculateNextReview(card: SM2CardState, quality: number, baseDate?: Date): SM2CalculationResult;
