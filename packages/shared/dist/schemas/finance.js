import { z } from "zod";
const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");
export const transactionTypeEnum = z.enum(["income", "expense"]);
export const DEFAULT_INCOME_CATEGORIES = ["Salary", "Freelance", "Investments", "Gifts", "Other"];
export const DEFAULT_EXPENSE_CATEGORIES = [
    "Food",
    "Transport",
    "Housing",
    "Entertainment",
    "Utilities",
    "Shopping",
    "Health",
    "Other"
];
// ─── Transaction Schemas ───────────────────────────────────────────────────
export const createTransactionSchema = z.object({
    amount: z.coerce.number().positive("Amount must be a positive number (> 0)"),
    type: transactionTypeEnum,
    category: z.string().trim().min(1, "Category is required").max(100),
    date: z.coerce.date().default(() => new Date()),
    note: z.string().trim().max(500).optional().default(""),
    receiptAttachment: z.string().nullable().optional().default(null)
});
export const updateTransactionSchema = z.object({
    amount: z.coerce.number().positive("Amount must be a positive number (> 0)").optional(),
    type: transactionTypeEnum.optional(),
    category: z.string().trim().min(1, "Category cannot be empty").max(100).optional(),
    date: z.coerce.date().optional(),
    note: z.string().trim().max(500).optional(),
    receiptAttachment: z.string().nullable().optional()
});
export const listTransactionsQuerySchema = z.object({
    category: z.string().trim().optional(),
    type: transactionTypeEnum.optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});
export const transactionParamsSchema = z.object({
    id: objectIdString
});
// ─── Category Schemas ──────────────────────────────────────────────────────
export const createCategorySchema = z.object({
    name: z.string().trim().min(1, "Category name is required").max(50),
    type: transactionTypeEnum
});
export const updateCategorySchema = z.object({
    name: z.string().trim().min(1, "Category name is required").max(50)
});
export const categoryParamsSchema = z.object({
    id: objectIdString
});
// ─── Summary Schemas ───────────────────────────────────────────────────────
export const financeSummaryQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/, "Invalid month format (YYYY-MM)")
        .optional(),
    months: z.coerce.number().int().min(1).max(24).optional().default(6)
});
// ─── Budget Schemas ────────────────────────────────────────────────────────
export const budgetPeriodEnum = z.enum(["monthly"]);
export const createBudgetSchema = z.object({
    category: z.string().trim().min(1, "Category is required").max(100),
    limit: z.coerce.number().positive("Limit must be a positive number (> 0)"),
    period: budgetPeriodEnum.default("monthly")
});
export const updateBudgetSchema = z.object({
    limit: z.coerce.number().positive("Limit must be a positive number (> 0)")
});
export const budgetParamsSchema = z.object({
    id: objectIdString
});
