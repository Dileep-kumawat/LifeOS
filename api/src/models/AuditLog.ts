import { Schema, model, type Document, type InferSchemaType } from "mongoose";

export type AuditActorRole = "admin" | "user" | "anonymous" | "system";
export type AuditOutcome = "SUCCESS" | "DENIED" | "ERROR";

const auditLogSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now, required: true, index: true },
    actorUserId: { type: Schema.Types.Mixed, default: null, index: true },
    actorRole: {
      type: String,
      enum: ["admin", "user", "anonymous", "system"],
      default: "anonymous",
      required: true,
      index: true
    },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, default: null },
    targetUserId: { type: Schema.Types.Mixed, default: null, index: true },
    outcome: {
      type: String,
      enum: ["SUCCESS", "DENIED", "ERROR"],
      required: true,
      index: true
    },
    correlationId: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    reason: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
    expiresAt: { type: Date, required: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

// Tamper-Resistance Hooks: Prevent updates and direct application deletions of audit logs
const preventMutation = function () {
  throw new Error("TamperResistance: AuditLog records are immutable and cannot be updated.");
};

const preventDeletion = function () {
  throw new Error(
    "TamperResistance: AuditLog records cannot be deleted via application mutation APIs."
  );
};

auditLogSchema.pre("updateOne", preventMutation);
auditLogSchema.pre("updateMany", preventMutation);
auditLogSchema.pre("findOneAndUpdate", preventMutation);
auditLogSchema.pre("replaceOne", preventMutation);

auditLogSchema.pre("deleteOne", preventDeletion);
auditLogSchema.pre("deleteMany", preventDeletion);
auditLogSchema.pre("findOneAndDelete", preventDeletion);
auditLogSchema.pre("findOneAndRemove" as any, preventDeletion);

// Performance & Query Indexes
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actorUserId: 1, timestamp: -1 });
auditLogSchema.index({ targetUserId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ outcome: 1, timestamp: -1 });
auditLogSchema.index({ correlationId: 1 });

// MongoDB TTL index for automatic retention expiration
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema> & Document;

export const AuditLog = model<AuditLogDoc>("AuditLog", auditLogSchema);
