import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const budgetHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    budgetId: { type: Schema.Types.ObjectId, ref: "Budget", required: true, index: true },
    category: { type: String, required: true, trim: true },
    period: { type: String, enum: ["monthly"], default: "monthly", required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    limit: { type: Number, required: true },
    finalSpend: { type: Number, required: true },
    wasOverBudget: { type: Boolean, required: true }
  },
  { timestamps: true }
);

budgetHistorySchema.index({ userId: 1, category: 1, periodStart: -1 });

export type BudgetHistoryDoc = InferSchemaType<typeof budgetHistorySchema> & Document;

export const BudgetHistory = model<BudgetHistoryDoc>("BudgetHistory", budgetHistorySchema);
