import { Schema, model, type InferSchemaType } from "mongoose";

// Deliberately minimal for Phase 0. Password hash, refresh token rotation,
// OAuth fields, and role/RBAC fields are added in Phase 1 (Auth + Core CRUD)
// per the build plan — don't build them ahead of that phase.
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, trim: true }
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User = model("User", userSchema);
