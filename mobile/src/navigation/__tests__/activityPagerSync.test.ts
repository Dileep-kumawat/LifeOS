import { describe, it, expect, vi } from "vitest";

export const ITEM_WIDTH = 54;

/**
 * Pure helper functions mirroring the exact math and arbitration logic in ActivityPager.tsx & FloatingDock.tsx
 */
export function computeContentTranslateX(scrollX: number, screenWidth: number): number {
  return -(scrollX / ITEM_WIDTH) * screenWidth;
}

export function computeDockDeltaFromContentSwipe(deltaX: number, screenWidth: number): number {
  // Swiping left (deltaX < 0) advances the dock to the right (positive delta)
  return -(deltaX / screenWidth) * ITEM_WIDTH;
}

export function applyRubberBandResistance(rawScrollX: number, maxScrollX: number): number {
  const RESISTANCE = 0.25;
  if (rawScrollX < 0) {
    return rawScrollX * RESISTANCE;
  }
  if (rawScrollX > maxScrollX) {
    const over = rawScrollX - maxScrollX;
    return maxScrollX + over * RESISTANCE;
  }
  return rawScrollX;
}

export function resolveTargetPageIndex({
  baseIndex,
  translationX,
  velocityX,
  maxIndex,
  distanceThreshold = 50,
  velocityThreshold = 500
}: {
  baseIndex: number;
  translationX: number;
  velocityX: number;
  maxIndex: number;
  distanceThreshold?: number;
  velocityThreshold?: number;
}): number {
  let targetIndex = baseIndex;

  if (translationX < -distanceThreshold || velocityX < -velocityThreshold) {
    targetIndex = baseIndex + 1;
  } else if (translationX > distanceThreshold || velocityX > velocityThreshold) {
    targetIndex = baseIndex - 1;
  }

  return Math.max(0, Math.min(maxIndex, targetIndex));
}

export function shouldDirectJumpWithoutFlythrough(
  currentScrollX: number,
  targetScrollX: number,
  thresholdMultiplier = 1.5
): boolean {
  return Math.abs(currentScrollX - targetScrollX) > ITEM_WIDTH * thresholdMultiplier;
}

describe("ActivityPager & FloatingDock Synchronization Logic", () => {
  const SCREEN_WIDTH = 390;
  const TOTAL_ROUTES = 10;
  const MAX_INDEX = TOTAL_ROUTES - 1;
  const MAX_SCROLL_X = MAX_INDEX * ITEM_WIDTH; // 9 * 54 = 486

  describe("1. Coordinate Systems & Real-time Two-way Mapping", () => {
    it("should map dock offset to content translateX in exact lock-step", () => {
      // Tab 0: offset 0 -> translateX 0
      expect(computeContentTranslateX(0, SCREEN_WIDTH)).toBe(-0);

      // Tab 1: offset 54 -> translateX -390
      expect(computeContentTranslateX(ITEM_WIDTH, SCREEN_WIDTH)).toBe(-390);

      // Halfway between Tab 0 and Tab 1 (scrollX = 27): translateX -195
      expect(computeContentTranslateX(27, SCREEN_WIDTH)).toBe(-195);

      // Tab 5: offset 5 * 54 = 270 -> translateX -1950
      expect(computeContentTranslateX(5 * ITEM_WIDTH, SCREEN_WIDTH)).toBe(-5 * 390);
    });

    it("should map content swipe delta to dock scroll delta correctly", () => {
      // Swiping left by 390px (one full screen width) advances dock by exactly 1 ITEM_WIDTH (54px)
      const dockDeltaLeft = computeDockDeltaFromContentSwipe(-SCREEN_WIDTH, SCREEN_WIDTH);
      expect(dockDeltaLeft).toBe(ITEM_WIDTH);

      // Swiping right by 390px moves dock back by 1 ITEM_WIDTH (-54px)
      const dockDeltaRight = computeDockDeltaFromContentSwipe(SCREEN_WIDTH, SCREEN_WIDTH);
      expect(dockDeltaRight).toBe(-ITEM_WIDTH);

      // Half screen swipe (-195px) advances dock by 27px (half ITEM_WIDTH)
      const halfDelta = computeDockDeltaFromContentSwipe(-195, SCREEN_WIDTH);
      expect(halfDelta).toBe(27);
    });
  });

  describe("2. Boundary Resistance & Rubber-banding", () => {
    it("should dampen swipes past the first tab (scrollX < 0) with 0.25 resistance", () => {
      const rawOvershoot = -100;
      const damped = applyRubberBandResistance(rawOvershoot, MAX_SCROLL_X);
      expect(damped).toBe(-25); // -100 * 0.25
    });

    it("should dampen swipes past the last tab (scrollX > MAX_SCROLL_X) with 0.25 resistance", () => {
      const rawOvershoot = MAX_SCROLL_X + 80;
      const damped = applyRubberBandResistance(rawOvershoot, MAX_SCROLL_X);
      expect(damped).toBe(MAX_SCROLL_X + 20); // MAX + 80 * 0.25
    });

    it("should leave in-bound scroll offsets untouched", () => {
      expect(applyRubberBandResistance(108, MAX_SCROLL_X)).toBe(108);
      expect(applyRubberBandResistance(0, MAX_SCROLL_X)).toBe(0);
      expect(applyRubberBandResistance(MAX_SCROLL_X, MAX_SCROLL_X)).toBe(MAX_SCROLL_X);
    });
  });

  describe("3. Snap Settle & Threshold Decision Logic", () => {
    it("should snap back to current tab on partial swipe under distance and velocity thresholds", () => {
      const target = resolveTargetPageIndex({
        baseIndex: 2,
        translationX: -30, // less than 50px threshold
        velocityX: -100, // less than 500px/s threshold
        maxIndex: MAX_INDEX
      });
      expect(target).toBe(2); // no page change
    });

    it("should advance to next tab when distance threshold is exceeded (> 50px left)", () => {
      const target = resolveTargetPageIndex({
        baseIndex: 2,
        translationX: -55,
        velocityX: -50,
        maxIndex: MAX_INDEX
      });
      expect(target).toBe(3);
    });

    it("should advance to previous tab when distance threshold is exceeded (> 50px right)", () => {
      const target = resolveTargetPageIndex({
        baseIndex: 2,
        translationX: 60,
        velocityX: 100,
        maxIndex: MAX_INDEX
      });
      expect(target).toBe(1);
    });

    it("should advance on quick flick even with low distance (< 50px but velocity > 500px/s)", () => {
      const target = resolveTargetPageIndex({
        baseIndex: 3,
        translationX: -20,
        velocityX: -650,
        maxIndex: MAX_INDEX
      });
      expect(target).toBe(4);
    });

    it("should clamp at boundaries (no swiping before tab 0 or after tab N-1)", () => {
      const targetAtStart = resolveTargetPageIndex({
        baseIndex: 0,
        translationX: 100, // swiping right at tab 0
        velocityX: 800,
        maxIndex: MAX_INDEX
      });
      expect(targetAtStart).toBe(0);

      const targetAtEnd = resolveTargetPageIndex({
        baseIndex: MAX_INDEX,
        translationX: -100, // swiping left at last tab
        velocityX: -800,
        maxIndex: MAX_INDEX
      });
      expect(targetAtEnd).toBe(MAX_INDEX);
    });
  });

  describe("4. Intermediate Screen Flicker Prevention on Multi-tab Jumps", () => {
    it("should flag multi-tab hops (> 1.5 item width) for direct positioning to bypass fly-through", () => {
      const fromTab0 = 0;
      const toTab5 = 5 * ITEM_WIDTH;
      expect(shouldDirectJumpWithoutFlythrough(fromTab0, toTab5)).toBe(true);

      const toTab2 = 2 * ITEM_WIDTH;
      expect(shouldDirectJumpWithoutFlythrough(fromTab0, toTab2)).toBe(true);
    });

    it("should allow smooth spring animation for adjacent tab transitions", () => {
      const fromTab0 = 0;
      const toTab1 = 1 * ITEM_WIDTH; // 54px difference <= 1.5 * 54 (81px)
      expect(shouldDirectJumpWithoutFlythrough(fromTab0, toTab1)).toBe(false);
    });
  });

  describe("5. Single-Fire Settle Event & Haptic Deduplication", () => {
    it("should only trigger haptic and navigation when settled index actually changes", () => {
      const hapticMock = vi.fn();
      const navigateMock = vi.fn();
      let lastSettledIndex = 0;

      function onSettle(targetIndex: number) {
        if (targetIndex !== lastSettledIndex) {
          lastSettledIndex = targetIndex;
          hapticMock();
          navigateMock(targetIndex);
        }
      }

      // First swipe commits to index 1: fires once
      onSettle(1);
      expect(hapticMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith(1);

      // Snap-back on partial swipe returns to index 1: does NOT fire again
      onSettle(1);
      expect(hapticMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledTimes(1);

      // Next swipe commits to index 2: fires once more
      onSettle(2);
      expect(hapticMock).toHaveBeenCalledTimes(2);
      expect(navigateMock).toHaveBeenCalledWith(2);
    });
  });
});
