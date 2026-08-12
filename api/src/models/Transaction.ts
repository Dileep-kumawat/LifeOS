import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: {
      type: Number,
      required: true,
      min: [0.0001, "Amount must be positive (> 0)"]
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500
    },
    receiptAttachment: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Compound index for efficient date range & category queries per user
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema> & Document;

export const Transaction = model<TransactionDoc>("Transaction", transactionSchema);
