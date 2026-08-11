import { z } from "zod";

export const habitFrequencySchema = z.object({
  type: z.enum(["daily", "weekly", "custom"]),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional().default([]),
  timesPerPeriod: z.number().int().min(1).optional().default(1)
});

export const habitSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  frequency: habitFrequencySchema,
  reminderTime: z.string().nullable().optional(),
  reminderEnabled: z.boolean().optional().default(false),
  currentStreak: z.number().min(0),
  longestStreak: z.number().min(0),
  completionRate: z.number().min(0).max(1),
  lastCheckInDate: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Habit = z.infer<typeof habitSchema>;

export const createHabitSchema = z.object({
  title: z.string().min(1, "Title is required").max(300).trim(),
  frequency: habitFrequencySchema,
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "reminderTime must be HH:mm format")
    .nullable()
    .optional()
    .default(null),
  reminderEnabled: z.boolean().optional().default(false)
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;

export const updateHabitSchema = z.object({
  title: z.string().min(1, "Title is required").max(300).trim().optional(),
  frequency: habitFrequencySchema.optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "reminderTime must be HH:mm format")
    .nullable()
    .optional(),
  reminderEnabled: z.boolean().optional()
});

export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
