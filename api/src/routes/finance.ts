import { Router, type Request, type Response } from "express";
import { isValidObjectId, Types } from "mongoose";
import { Transaction, type TransactionDoc } from "../models/Transaction.js";
import { Category, type CategoryDoc } from "../models/Category.js";
import {
  createCategorySchema,
  createTransactionSchema,
  financeSummaryQuerySchema,
  listTransactionsQuerySchema,
  transactionParamsSchema,
  updateCategorySchema,
  updateTransactionSchema
} from "@lifeos/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  normalizeAndFindOrCreateCategory,
  reassignCategoryTransactions,
  seedDefaultCategories
} from "../services/financeCategory.js";
import {
  onTransactionCreated,
  onTransactionDeleted,
  onTransactionUpdated
} from "../services/financeHooks.js";

export const financeRouter = Router();

financeRouter.use(requireAuth);

function formatTransaction(doc: TransactionDoc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    amount: doc.amount,
    type: doc.type,
    category: doc.category,
    date: doc.date.toISOString(),
    note: doc.note || "",
    receiptAttachment: doc.receiptAttachment || null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}

function formatCategory(doc: CategoryDoc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    type: doc.type,
    createdAt: doc.createdAt.toISOString()
  };
}

/**
 * @openapi
 * /finance/transactions:
 *   post:
 *     tags: [Finance]
 *     summary: Create a new transaction
 *     description: |
 *       Creates an income or expense transaction. The `amount` must be a positive number.
 *       Category handling: Category names are normalized (whitespace trimmed and matched case-insensitively against user categories).
 *       If an existing category matches case-insensitively, its canonical casing is preserved; otherwise a new custom category is created inline.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category]
 *             properties:
 *               amount: { type: number, example: 45.50 }
 *               type: { type: string, enum: [income, expense], example: expense }
 *               category: { type: string, example: Groceries }
 *               date: { type: string, format: date-time, example: "2026-08-12T10:00:00Z" }
 *               note: { type: string, example: "Weekly grocery run" }
 *               receiptAttachment: { type: string, nullable: true, example: null }
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Validation error
 */
financeRouter.post(
  "/finance/transactions",
  validate(createTransactionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { amount, type, category, date, note, receiptAttachment } = req.body;

      const normalizedCategory = await normalizeAndFindOrCreateCategory(userId, category, type);

      const transaction = await Transaction.create({
        userId,
        amount,
        type,
        category: normalizedCategory,
        date: date ? new Date(date) : new Date(),
        note: note || "",
        receiptAttachment: receiptAttachment || null
      });

      await onTransactionCreated(transaction);

      return res.status(201).json(formatTransaction(transaction));
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to create transaction"
      });
    }
  }
);

/**
 * @openapi
 * /finance/transactions:
 *   get:
 *     tags: [Finance]
 *     summary: List transactions with filtering and pagination
 *     description: |
 *       Returns a paginated list of transactions sorted by date descending.
 *       Supported filters: category, type (income/expense), date range (startDate, endDate), and free-text search.
 *       Includes running totals summary for the matching filter view.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of transactions with pagination and summary
 */
financeRouter.get(
  "/finance/transactions",
  validate(listTransactionsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { category, type, startDate, endDate, search, page = 1, limit = 20 } = req.query as any;

      const filter: any = { userId };

      if (category) {
        filter.category = category;
      }
      if (type) {
        filter.type = type;
      }

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          filter.date.$gte = new Date(startDate);
        }
        if (endDate) {
          // Set to end of day if only YYYY-MM-DD passed
          const end = new Date(endDate);
          if (endDate.length <= 10) {
            end.setUTCHours(23, 59, 59, 999);
          }
          filter.date.$lte = end;
        }
      }

      if (search) {
        const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
        filter.$or = [{ note: searchRegex }, { category: searchRegex }];
      }

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      const [transactions, total, summaryResult] = await Promise.all([
        Transaction.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limitNum),
        Transaction.countDocuments(filter),
        Transaction.aggregate([
          { $match: filter },
          {
            $group: {
              _id: "$type",
              totalAmount: { $sum: "$amount" }
            }
          }
        ])
      ]);

      let totalIncome = 0;
      let totalExpense = 0;

      for (const item of summaryResult) {
        if (item._id === "income") totalIncome = item.totalAmount;
        if (item._id === "expense") totalExpense = item.totalAmount;
      }

      const totalPages = Math.ceil(total / limitNum) || 1;

      return res.status(200).json({
        data: transactions.map(formatTransaction),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasMore: pageNum < totalPages
        },
        summary: {
          totalIncome,
          totalExpense,
          netBalance: totalIncome - totalExpense
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to list transactions"
      });
    }
  }
);

/**
 * @openapi
 * /finance/transactions/{id}:
 *   get:
 *     tags: [Finance]
 *     summary: Get transaction detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction detail
 *       404:
 *         description: Transaction not found
 */
financeRouter.get(
  "/finance/transactions/:id",
  validate(transactionParamsSchema, "params"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const transaction = await Transaction.findOne({ _id: id, userId });
      if (!transaction) {
        return res.status(404).json({ error: "NotFound", message: "Transaction not found" });
      }

      return res.status(200).json(formatTransaction(transaction));
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to fetch transaction"
      });
    }
  }
);

/**
 * @openapi
 * /finance/transactions/{id}:
 *   patch:
 *     tags: [Finance]
 *     summary: Update transaction
 *     description: Updates fields of a transaction. Normalizes category if updated.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date: { type: string, format: date-time }
 *               note: { type: string }
 *               receiptAttachment: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Updated transaction
 *       404:
 *         description: Transaction not found
 */
financeRouter.patch(
  "/finance/transactions/:id",
  validate(transactionParamsSchema, "params"),
  validate(updateTransactionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const transaction = await Transaction.findOne({ _id: id, userId });
      if (!transaction) {
        return res.status(404).json({ error: "NotFound", message: "Transaction not found" });
      }

      const { amount, type, category, date, note, receiptAttachment } = req.body;

      if (amount !== undefined) transaction.amount = amount;
      if (type !== undefined) transaction.type = type;
      if (date !== undefined) transaction.date = new Date(date);
      if (note !== undefined) transaction.note = note;
      if (receiptAttachment !== undefined) transaction.receiptAttachment = receiptAttachment;

      if (category !== undefined || type !== undefined) {
        const catName = category !== undefined ? category : transaction.category;
        const catType = type !== undefined ? type : transaction.type;
        transaction.category = await normalizeAndFindOrCreateCategory(userId, catName, catType);
      }

      await transaction.save();
      await onTransactionUpdated(transaction);

      return res.status(200).json(formatTransaction(transaction));
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to update transaction"
      });
    }
  }
);

/**
 * @openapi
 * /finance/transactions/{id}:
 *   delete:
 *     tags: [Finance]
 *     summary: Delete transaction
 *     description: Deletes a transaction and triggers internal budget recalculation and embedding removal hooks.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *       404:
 *         description: Transaction not found
 */
financeRouter.delete(
  "/finance/transactions/:id",
  validate(transactionParamsSchema, "params"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const transaction = await Transaction.findOneAndDelete({ _id: id, userId });
      if (!transaction) {
        return res.status(404).json({ error: "NotFound", message: "Transaction not found" });
      }

      await onTransactionDeleted(transaction);

      return res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to delete transaction"
      });
    }
  }
);

/**
 * @openapi
 * /finance/categories:
 *   get:
 *     tags: [Finance]
 *     summary: List user categories
 *     description: Returns default and custom categories for the authenticated user, seeded on demand.
 *     responses:
 *       200:
 *         description: Category list
 */
financeRouter.get("/finance/categories", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await seedDefaultCategories(userId);

    const categories = await Category.find({ userId }).sort({ type: 1, name: 1 });

    return res.status(200).json({
      categories: categories.map(formatCategory)
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "InternalServerError",
      message: err.message || "Failed to list categories"
    });
  }
});

/**
 * @openapi
 * /finance/categories:
 *   post:
 *     tags: [Finance]
 *     summary: Add custom category
 *     description: Adds a new custom category. Performs case-insensitive normalization against existing categories.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: string, example: Healthcare }
 *               type: { type: string, enum: [income, expense], example: expense }
 *     responses:
 *       201:
 *         description: Category added or retrieved
 */
financeRouter.post(
  "/finance/categories",
  validate(createCategorySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { name, type } = req.body;

      const normalizedName = await normalizeAndFindOrCreateCategory(userId, name, type);

      const categoryDoc = await Category.findOne({ userId, name: normalizedName, type });

      return res.status(201).json(categoryDoc ? formatCategory(categoryDoc) : { name: normalizedName, type });
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to create category"
      });
    }
  }
);

/**
 * @openapi
 * /finance/categories/{id}:
 *   patch:
 *     tags: [Finance]
 *     summary: Rename custom category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Category updated
 */
financeRouter.patch(
  "/finance/categories/:id",
  validate(updateCategorySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { name } = req.body;

      const category = await Category.findOne({ _id: id, userId });
      if (!category) {
        return res.status(404).json({ error: "NotFound", message: "Category not found" });
      }

      const oldName = category.name;
      const trimmedNew = name.trim();

      if (oldName !== trimmedNew) {
        // Update transactions referencing old category name
        await Transaction.updateMany(
          { userId, type: category.type, category: oldName },
          { $set: { category: trimmedNew } }
        );
        category.name = trimmedNew;
        await category.save();
      }

      return res.status(200).json(formatCategory(category));
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to update category"
      });
    }
  }
);

/**
 * @openapi
 * /finance/categories/{id}:
 *   delete:
 *     tags: [Finance]
 *     summary: Delete custom category
 *     description: Deletes a category and reassigns any existing transactions under this category to "Other".
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category deleted and transactions reassigned
 */
financeRouter.delete("/finance/categories/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "BadRequest", message: "Invalid category ID" });
    }

    const category = await Category.findOne({ _id: id, userId });
    if (!category) {
      return res.status(404).json({ error: "NotFound", message: "Category not found" });
    }

    // Reassign transactions to "Other" before deleting
    const reassignedCount = await reassignCategoryTransactions(userId, category.name, category.type as any);

    await Category.deleteOne({ _id: id });

    return res.status(200).json({
      message: `Category deleted successfully. ${reassignedCount} transaction(s) reassigned to 'Other'.`
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "InternalServerError",
      message: err.message || "Failed to delete category"
    });
  }
});

/**
 * @openapi
 * /finance/summary:
 *   get:
 *     tags: [Finance]
 *     summary: Monthly summary and multi-month trend breakdown
 *     description: |
 *       Uses MongoDB aggregation pipelines to calculate monthly category breakdown totals and multi-month income/expense trend data.
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-08" }
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6 }
 *     responses:
 *       200:
 *         description: Summary breakdown and historical trend
 */
financeRouter.get(
  "/finance/summary",
  validate(financeSummaryQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      const { month, months = 6 } = req.query as any;

      const now = new Date();
      let targetYear: number;
      let targetMonth: number; // 0-indexed for JS Date

      if (month) {
        const [y, m] = month.split("-").map(Number);
        targetYear = y;
        targetMonth = m - 1;
      } else {
        targetYear = now.getUTCFullYear();
        targetMonth = now.getUTCMonth();
      }

      const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

      const monthKeyStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;

      // 1. Aggregation for specified month's category breakdown
      const categoryAggregation = await Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: { category: "$category", type: "$type" },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);

      const categoryBreakdown = categoryAggregation.map((item) => ({
        category: item._id.category,
        type: item._id.type,
        totalAmount: item.totalAmount,
        count: item.count
      }));

      let monthlyIncome = 0;
      let monthlyExpense = 0;
      for (const item of categoryBreakdown) {
        if (item.type === "income") monthlyIncome += item.totalAmount;
        if (item.type === "expense") monthlyExpense += item.totalAmount;
      }

      // 2. Aggregation for multi-month trend
      const trendNumMonths = Number(months);
      const startOfTrend = new Date(Date.UTC(targetYear, targetMonth - (trendNumMonths - 1), 1, 0, 0, 0, 0));

      const trendAggregation = await Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: startOfTrend, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: {
              monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } },
              type: "$type"
            },
            totalAmount: { $sum: "$amount" }
          }
        }
      ]);

      // Map trend results into sequential monthly objects
      const trendMap = new Map<string, { income: number; expense: number }>();

      for (let i = 0; i < trendNumMonths; i++) {
        const d = new Date(Date.UTC(targetYear, targetMonth - (trendNumMonths - 1 - i), 1));
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        trendMap.set(key, { income: 0, expense: 0 });
      }

      for (const item of trendAggregation) {
        const key = item._id.monthKey;
        const entry = trendMap.get(key) || { income: 0, expense: 0 };
        if (item._id.type === "income") entry.income = item.totalAmount;
        if (item._id.type === "expense") entry.expense = item.totalAmount;
        trendMap.set(key, entry);
      }

      const trend = Array.from(trendMap.entries()).map(([mKey, vals]) => ({
        month: mKey,
        income: vals.income,
        expense: vals.expense,
        net: vals.income - vals.expense
      }));

      return res.status(200).json({
        month: monthKeyStr,
        monthlyTotals: {
          income: monthlyIncome,
          expense: monthlyExpense,
          net: monthlyIncome - monthlyExpense
        },
        categoryBreakdown,
        trend
      });
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to generate monthly summary"
      });
    }
  }
);
