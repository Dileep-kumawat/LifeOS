import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const recommendationItemSchema = new Schema(
  {
    id: { type: String },
    domain: {
      type: String,
      enum: ["productivity", "finance", "habits", "general"],
      default: "general"
    },
    title: { type: String, required: true },
    category: { type: String, default: "general" },
    message: { type: String, required: true },
    actionableStep: { type: String, required: true },
    metricGrounded: { type: String, default: "" },
    impact: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium"
    }
  },
  { _id: false }
);

const recommendationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    period: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
      index: true
    },
    periodStart: { type: String, required: true, index: true }, // Normalized "YYYY-MM-DD"
    periodEnd: { type: String, required: true },                 // Normalized "YYYY-MM-DD"
    recommendations: { type: [recommendationItemSchema], default: [] },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

recommendationSchema.index({ userId: 1, period: 1, periodStart: 1 }, { unique: true });
recommendationSchema.index({ userId: 1, period: 1, generatedAt: -1 });

export type RecommendationDoc = InferSchemaType<typeof recommendationSchema> & Document;

export const Recommendation = model<RecommendationDoc>("Recommendation", recommendationSchema);
