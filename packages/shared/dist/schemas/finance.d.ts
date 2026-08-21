import { z } from "zod";
export declare const transactionTypeEnum: z.ZodEnum<["income", "expense"]>;
export type TransactionType = z.infer<typeof transactionTypeEnum>;
export declare const DEFAULT_INCOME_CATEGORIES: string[];
export declare const DEFAULT_EXPENSE_CATEGORIES: string[];
export declare const createTransactionSchema: z.ZodObject<{
    amount: z.ZodNumber;
    type: z.ZodEnum<["income", "expense"]>;
    category: z.ZodString;
    date: z.ZodDefault<z.ZodDate>;
    note: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    receiptAttachment: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    type: "income" | "expense";
    date: Date;
    category: string;
    amount: number;
    note: string;
    receiptAttachment: string | null;
}, {
    type: "income" | "expense";
    category: string;
    amount: number;
    date?: Date | undefined;
    note?: string | undefined;
    receiptAttachment?: string | null | undefined;
}>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export declare const updateTransactionSchema: z.ZodObject<{
    amount: z.ZodOptional<z.ZodNumber>;
    type: z.ZodOptional<z.ZodEnum<["income", "expense"]>>;
    category: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodDate>;
    note: z.ZodOptional<z.ZodString>;
    receiptAttachment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type?: "income" | "expense" | undefined;
    date?: Date | undefined;
    category?: string | undefined;
    amount?: number | undefined;
    note?: string | undefined;
    receiptAttachment?: string | null | undefined;
}, {
    type?: "income" | "expense" | undefined;
    date?: Date | undefined;
    category?: string | undefined;
    amount?: number | undefined;
    note?: string | undefined;
    receiptAttachment?: string | null | undefined;
}>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export declare const listTransactionsQuerySchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["income", "expense"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    type?: "income" | "expense" | undefined;
    search?: string | undefined;
    category?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    type?: "income" | "expense" | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    category?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export declare const transactionParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type TransactionParams = z.infer<typeof transactionParamsSchema>;
export declare const createCategorySchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["income", "expense"]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "income" | "expense";
}, {
    name: string;
    type: "income" | "expense";
}>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export declare const updateCategorySchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export declare const categoryParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type CategoryParams = z.infer<typeof categoryParamsSchema>;
export declare const financeSummaryQuerySchema: z.ZodObject<{
    month: z.ZodOptional<z.ZodString>;
    months: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    months: number;
    month?: string | undefined;
}, {
    month?: string | undefined;
    months?: number | undefined;
}>;
export type FinanceSummaryQuery = z.infer<typeof financeSummaryQuerySchema>;
export declare const budgetPeriodEnum: z.ZodEnum<["monthly"]>;
export type BudgetPeriod = z.infer<typeof budgetPeriodEnum>;
export declare const createBudgetSchema: z.ZodObject<{
    category: z.ZodString;
    limit: z.ZodNumber;
    period: z.ZodDefault<z.ZodEnum<["monthly"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    category: string;
    period: "monthly";
}, {
    limit: number;
    category: string;
    period?: "monthly" | undefined;
}>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export declare const updateBudgetSchema: z.ZodObject<{
    limit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    limit: number;
}, {
    limit: number;
}>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export declare const budgetParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type BudgetParams = z.infer<typeof budgetParamsSchema>;
