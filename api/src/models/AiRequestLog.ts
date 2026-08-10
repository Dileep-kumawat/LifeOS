import { Schema, model, type Document, type InferSchemaType } from "mongoose";

export interface FallbackAttempt {
  provider: string;
  success: boolean;
  durationMs: number;
  errorType?: "timeout" | "rate_limit" | "auth_error" | "api_error" | "unknown";
  errorMessage?: string;
}

const fallbackAttemptSchema = new Schema(
  {
    provider: { type: String, required: true },
    success: { type: Boolean, required: true },
    durationMs: { type: Number, required: true },
    errorType: {
      type: String,
      enum: ["timeout", "rate_limit", "auth_error", "api_error", "unknown"]
    },
    errorMessage: { type: String }
  },
  { _id: false }
);

const aiRequestLogSchema = new Schema(
  {
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    requestType: { type: String, required: true, default: "general", index: true },
    providerServed: { type: String, default: null },
    fallbackOccurred: { type: Boolean, default: false },
    fallbackChain: { type: [fallbackAttemptSchema], default: [] },
    latencyMs: { type: Number, required: true },
    tokensIn: { type: Number, default: 0 },
    tokensOut: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["success", "fallback_success", "total_failure", "rate_limited"],
      required: true,
      index: true
    },
    failureReason: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

// Compound index for aggregation / querying provider usage over time
aiRequestLogSchema.index({ providerServed: 1, timestamp: -1 });
aiRequestLogSchema.index({ userId: 1, timestamp: -1 });

export type AiRequestLogDoc = InferSchemaType<typeof aiRequestLogSchema> & Document;

export const AiRequestLog = model<AiRequestLogDoc>("AiRequestLog", aiRequestLogSchema);
