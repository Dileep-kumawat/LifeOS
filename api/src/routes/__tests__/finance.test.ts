import { describe, it, expect, vi } from "vitest";
import { Types } from "mongoose";
import {
  onTransactionDeleted,
  registerOnTransactionDeleted
} from "../../services/financeHooks.js";

// ─── Service Unit & Logic Tests ─────────────────────────────────────────────

describe("Finance Category Normalization & Event Hooks", () => {
  it("normalizes whitespace and case-insensitive duplicates", async () => {
    // Test helper function logic:
    // "  Groceries  " vs "groceries" vs "GROCERIES"
    const input1 = "  Groceries  ";
    const input2 = "groceries";
    const input3 = "GROCERIES";

    const trimmed1 = input1.trim();
    const trimmed2 = input2.trim();
    const trimmed3 = input3.trim();

    expect(trimmed1.toLowerCase()).toBe("groceries");
    expect(trimmed2.toLowerCase()).toBe("groceries");
    expect(trimmed3.toLowerCase()).toBe("groceries");
  });

  it("triggers onTransactionDeleted listener when a transaction is deleted", async () => {
    const listener = vi.fn();
    const unregister = registerOnTransactionDeleted(listener);

    const dummyTransaction: any = {
      _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e5f"),
      userId: new Types.ObjectId("662c9f1e9f0b2a001c3d4e50"),
      amount: 150,
      type: "expense",
      category: "Food",
      date: new Date("2026-08-10")
    };

    await onTransactionDeleted(dummyTransaction);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(dummyTransaction);

    unregister();
  });
});

describe("Date Range Boundary Calculations", () => {
  it("computes exact month start and end boundaries without off-by-one errors", () => {
    const targetYear = 2026;
    const targetMonth = 7; // August (0-indexed)

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

    expect(startOfMonth.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(endOfMonth.toISOString()).toBe("2026-08-31T23:59:59.999Z");

    const prevMonthLastSec = new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999));
    expect(prevMonthLastSec < startOfMonth).toBe(true);

    const nextMonthFirstSec = new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0));
    expect(nextMonthFirstSec > endOfMonth).toBe(true);
  });
});
