import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const budgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    limit: {
      type: Number,
      required: true,
      min: [0.01, "Limit must be positive (> 0)"]
    },
    period: {
      type: String,
      enum: ["monthly"],
      default: "monthly",
      required: true,
      index: true
    },
    currentSpend: {
      type: Number,
      default: 0,
      min: 0
    },
    notifiedOverspend: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Compound index to guarantee one active budget per user + category + period
budgetSchema.index({ userId: 1, category: 1, period: 1 }, { unique: true });

export type BudgetDoc = InferSchemaType<typeof budgetSchema> & Document;

export const Budget = model<BudgetDoc>("Budget", budgetSchema);
