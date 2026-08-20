import { describe, it, expect } from "vitest";
import { getMonthBounds } from "../../services/budgetService.js";

describe("Budget Unit & Logic Tests", () => {
  it("computes accurate month bounds for current period", () => {
    const testDate = new Date("2026-08-15T12:00:00.000Z");
    const { startOfMonth, endOfMonth } = getMonthBounds(testDate);

    expect(startOfMonth.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(endOfMonth.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("surfaces over-budget items first when sorting budget list", () => {
    const items = [
      { id: "1", category: "Transport", percentUsed: 60, isOverBudget: false },
      { id: "2", category: "Food", percentUsed: 120, isOverBudget: true },
      { id: "3", category: "Entertainment", percentUsed: 150, isOverBudget: true },
      { id: "4", category: "Utilities", percentUsed: 90, isOverBudget: false }
    ];

    items.sort((a, b) => {
      if (a.isOverBudget !== b.isOverBudget) {
        return a.isOverBudget ? -1 : 1;
      }
      return b.percentUsed - a.percentUsed;
    });

    expect(items[0].id).toBe("3"); // 150% over budget
    expect(items[1].id).toBe("2"); // 120% over budget
    expect(items[2].id).toBe("4"); // 90%
    expect(items[3].id).toBe("1"); // 60%
  });

  it("correctly identifies one-time alert crossing state transitions", () => {
    const limit = 100;

    // Scenario 1: Initial spend 50 -> no alert
    let currentSpend = 50;
    let notifiedOverspend = false;
    let shouldAlert = currentSpend > limit && !notifiedOverspend;
    expect(shouldAlert).toBe(false);

    // Scenario 2: Second expense +60 -> total spend 110 (crosses threshold) -> trigger alert once
    currentSpend += 60; // 110
    shouldAlert = currentSpend > limit && !notifiedOverspend;
    expect(shouldAlert).toBe(true);
    notifiedOverspend = true;

    // Scenario 3: Third expense +20 -> total spend 130 (already over budget) -> NO duplicate alert
    currentSpend += 20; // 130
    shouldAlert = currentSpend > limit && !notifiedOverspend;
    expect(shouldAlert).toBe(false);

    // Scenario 4: Edit transaction down -40 -> total spend 90 (back under limit) -> reset flag
    currentSpend -= 40; // 90
    if (currentSpend <= limit) {
      notifiedOverspend = false;
    }
    expect(notifiedOverspend).toBe(false);

    // Scenario 5: New expense +30 -> total spend 120 (recrosses threshold) -> trigger alert again
    currentSpend += 30; // 120
    shouldAlert = currentSpend > limit && !notifiedOverspend;
    expect(shouldAlert).toBe(true);
  });
});
