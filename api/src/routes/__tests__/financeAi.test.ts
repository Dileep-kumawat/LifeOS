import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

// Mock BullMQ queue & embedding job
vi.mock("../../services/queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, jobId: "mock-job-id" })
}));

vi.mock("../../services/ai/embeddings.js", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    generateEmbedding: vi
      .fn()
      .mockImplementation((text: string) => actual.generateMockEmbedding(text))
  };
});

vi.mock("../../services/ai/callAI.js", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    callAI: vi.fn().mockImplementation(async (messages: any[]) => {
      // Find system prompt content to verify grounded numbers in test assertions
      const sysMsg =
        messages.find((m) => m.role === "system" || m.type === "system")?.content || "";
      return {
        success: true,
        content: `Based on your logged data in the system, here are recommendations. Context provided: ${sysMsg.slice(0, 300)}...`,
        providerServed: "mistral",
        fallbackOccurred: false
      };
    })
  };
});

import { Transaction } from "../../models/Transaction.js";
import { Budget } from "../../models/Budget.js";
import { Embedding } from "../../models/Embedding.js";
import { executeQuerySpending, executeToolCall } from "../../services/ai/tools.js";
import { retrieveContext } from "../../services/ai/retriever.js";
import {
  formatTransactionForEmbedding,
  formatBudgetForEmbedding
} from "../../services/ai/ragText.js";
import { deleteEmbedding } from "../../services/ai/embeddingJob.js";
import { generateMockEmbedding } from "../../services/ai/embeddings.js";

describe("Phase 4 Prompt 3: Finance AI Integration & Insights Tests", () => {
  const userA_id = "662c9f1e9f0b2a001c3d4e0a";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Financial Analysis Tool & Per-User Scoping ──────────────────────────
  describe("Structured Spending Analysis Tool (query_spending / financial_analysis)", () => {
    it("aggregates monthly totals, category breakdown, and budget status for user", async () => {
      const userObjId = new Types.ObjectId(userA_id);

      const mockCategoryAgg = [
        { _id: { category: "Dining Out", type: "expense" }, totalAmount: 280, count: 5 },
        { _id: { category: "Groceries", type: "expense" }, totalAmount: 450, count: 10 }
      ];

      const mockBudgets = [
        {
          userId: userObjId,
          category: "Dining Out",
          limit: 250,
          currentSpend: 280,
          period: "monthly"
        },
        {
          userId: userObjId,
          category: "Groceries",
          limit: 500,
          currentSpend: 450,
          period: "monthly"
        }
      ];

      vi.spyOn(Transaction, "aggregate").mockResolvedValue(mockCategoryAgg as any);
      vi.spyOn(Budget, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockBudgets)
      } as any);

      const result = await executeQuerySpending(userA_id, { month: "2026-08" });

      expect(result.month).toBe("2026-08");
      expect(result.monthlyTotals.expense).toBe(730);
      expect(result.categoryBreakdown).toHaveLength(2);
      expect(result.budgetStatuses).toHaveLength(2);

      const diningBudget = result.budgetStatuses.find((b) => b.category === "Dining Out");
      expect(diningBudget?.status).toBe("over_budget");
      expect(diningBudget?.percentUsed).toBe(112);

      const groceriesBudget = result.budgetStatuses.find((b) => b.category === "Groceries");
      expect(groceriesBudget?.status).toBe("approaching_limit");
      expect(groceriesBudget?.percentUsed).toBe(90);
    });

    it("HARD PER-USER SCOPING: query_spending strictly scopes aggregations by userId", async () => {
      const userObjIdA = new Types.ObjectId(userA_id);
      const aggSpy = vi.spyOn(Transaction, "aggregate").mockResolvedValue([]);
      vi.spyOn(Budget, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);

      await executeToolCall(userA_id, "query_spending", {});

      expect(aggSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({ userId: userObjIdA })
          })
        ])
      );
    });
  });

  // ─── 2. Embedding Lifecycle for Transaction & Budget ─────────────────────
  describe("RAG Embedding Pipeline Extension (Transaction & Budget)", () => {
    it("creates properly formatted embedded text for Transaction and Budget", () => {
      const mockTx: any = {
        amount: 45.5,
        type: "expense",
        category: "Groceries",
        date: new Date("2026-03-03T10:00:00Z"),
        note: "weekly shop"
      };
      const formattedTx = formatTransactionForEmbedding(mockTx);
      expect(formattedTx.title).toBe("Expense: $45.5 on Groceries");
      expect(formattedTx.embeddedText).toContain("Expense: $45.5 on Groceries");
      expect(formattedTx.embeddedText).toContain("weekly shop");

      const mockBudget: any = {
        category: "Groceries",
        limit: 500,
        currentSpend: 450,
        period: "monthly"
      };
      const formattedB = formatBudgetForEmbedding(mockBudget);
      expect(formattedB.title).toBe("Budget: $500 for Groceries");
      expect(formattedB.embeddedText).toContain("Current Spend: $450");
      expect(formattedB.embeddedText).toContain("90% used");
    });

    it("removes embedding document on Transaction/Budget deletion", async () => {
      const deleteOneSpy = vi.spyOn(Embedding, "deleteOne").mockResolvedValue({} as any);

      await deleteEmbedding("transaction", "tx-123");
      expect(deleteOneSpy).toHaveBeenCalledWith({ sourceType: "transaction", sourceId: "tx-123" });

      await deleteEmbedding("budget", "budget-456");
      expect(deleteOneSpy).toHaveBeenCalledWith({ sourceType: "budget", sourceId: "budget-456" });
    });
  });

  // ─── 3. General Chat Integration for 'Help me get financially better' ─────
  describe("General Chat Integration (FR-2.3 Example Query 4)", () => {
    it("retrieves seeded transaction/budget embeddings for 'Help me get financially better'", async () => {
      const targetQuery = "Help me get financially better";
      const targetVector = generateMockEmbedding(targetQuery);

      const mockEmbeddings = [
        {
          _id: new Types.ObjectId(),
          userId: userA_id,
          sourceType: "budget",
          sourceId: new Types.ObjectId(),
          title: "Budget: $250 for Dining Out",
          embeddedText: "Budget: $250 for Dining Out, Current Spend: $280 (OVER BUDGET)",
          vector: targetVector
        },
        {
          _id: new Types.ObjectId(),
          userId: userA_id,
          sourceType: "transaction",
          sourceId: new Types.ObjectId(),
          title: "Expense: $280 on Dining Out",
          embeddedText: "Expense: $280 on Dining Out, Date: 2026-08-10, note: restaurant bill",
          vector: targetVector
        }
      ];

      vi.spyOn(Embedding, "aggregate").mockResolvedValue([]);
      vi.spyOn(Embedding, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockEmbeddings)
      } as any);

      const ragResult = await retrieveContext(userA_id, "Help me get financially better", {
        topK: 5
      });

      expect(ragResult.query).toBe("Help me get financially better");
      expect(ragResult.results.length).toBeGreaterThan(0);
      expect(ragResult.results[0].embeddedText).toContain("Dining Out");
    });
  });
});
