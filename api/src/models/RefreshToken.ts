import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    familyId: { type: String, required: true, index: true },
    deviceInfo: { type: String, required: true, default: "Unknown Device" },
    issuedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema> & Document;

export const RefreshToken = model<RefreshTokenDoc>("RefreshToken", refreshTokenSchema);
