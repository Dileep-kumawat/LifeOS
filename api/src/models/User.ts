import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const modulePreferenceSchema = new Schema(
  {
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  { _id: false }
);

const dailySummaryPreferenceSchema = new Schema(
  {
    deliveryTime: { type: String, default: "07:00" },
    channels: { type: [String], default: ["push", "in_app"] },
    timezone: { type: String, default: "UTC" }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true
    },
    emailVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "soft_deleted"],
      default: "active",
      required: true,
      index: true
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
      required: true
    },
    deletedAt: { type: Date, default: null },

    // Password reset fields
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },

    // Phase 10 stubs to avoid future migrations
    googleId: { type: String, default: null, sparse: true },
    phoneNumber: { type: String, default: null },
    mfaEnabled: { type: Boolean, default: false },

    // Per-module notification toggles (Phase 2). Everything defaults to
    // enabled; the delivery code treats a missing module/toggle as enabled
    // so legacy documents without this field still receive notifications.
    notificationPreferences: {
      calendarReminders: {
        type: modulePreferenceSchema,
        default: () => ({ push: true, inApp: true })
      },
      habitReminders: {
        type: modulePreferenceSchema,
        default: () => ({ push: true, inApp: true })
      },
      system: { type: modulePreferenceSchema, default: () => ({ push: true, inApp: true }) },
      financeBudgetAlerts: {
        type: modulePreferenceSchema,
        default: () => ({ push: true, inApp: true })
      },
      focusSessionAlerts: {
        type: modulePreferenceSchema,
        default: () => ({ push: true, inApp: true })
      },
      dailySummary: {
        type: dailySummaryPreferenceSchema,
        default: () => ({ deliveryTime: "07:00", channels: ["push", "in_app"], timezone: "UTC" })
      },
      dndDuringFocus: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & Document;

export const User = model<UserDoc>("User", userSchema);
