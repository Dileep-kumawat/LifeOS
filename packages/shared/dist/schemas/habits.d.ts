import { z } from "zod";
export declare const habitFrequencySchema: z.ZodObject<{
    type: z.ZodEnum<["daily", "weekly", "custom"]>;
    daysOfWeek: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>>;
    timesPerPeriod: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    type: "custom" | "daily" | "weekly";
    daysOfWeek: number[];
    timesPerPeriod: number;
}, {
    type: "custom" | "daily" | "weekly";
    daysOfWeek?: number[] | undefined;
    timesPerPeriod?: number | undefined;
}>;
export declare const habitSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    title: z.ZodString;
    frequency: z.ZodObject<{
        type: z.ZodEnum<["daily", "weekly", "custom"]>;
        daysOfWeek: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>>;
        timesPerPeriod: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        type: "custom" | "daily" | "weekly";
        daysOfWeek: number[];
        timesPerPeriod: number;
    }, {
        type: "custom" | "daily" | "weekly";
        daysOfWeek?: number[] | undefined;
        timesPerPeriod?: number | undefined;
    }>;
    reminderTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reminderEnabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    currentStreak: z.ZodNumber;
    longestStreak: z.ZodNumber;
    completionRate: z.ZodNumber;
    lastCheckInDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    frequency: {
        type: "custom" | "daily" | "weekly";
        daysOfWeek: number[];
        timesPerPeriod: number;
    };
    title: string;
    userId: string;
    reminderEnabled: boolean;
    currentStreak: number;
    longestStreak: number;
    completionRate: number;
    updatedAt: string;
    reminderTime?: string | null | undefined;
    lastCheckInDate?: string | null | undefined;
}, {
    id: string;
    createdAt: string;
    frequency: {
        type: "custom" | "daily" | "weekly";
        daysOfWeek?: number[] | undefined;
        timesPerPeriod?: number | undefined;
    };
    title: string;
    userId: string;
    currentStreak: number;
    longestStreak: number;
    completionRate: number;
    updatedAt: string;
    reminderTime?: string | null | undefined;
    reminderEnabled?: boolean | undefined;
    lastCheckInDate?: string | null | undefined;
}>;
export type Habit = z.infer<typeof habitSchema>;
export declare const createHabitSchema: z.ZodObject<{
    title: z.ZodString;
    frequency: z.ZodObject<{
        type: z.ZodEnum<["daily", "weekly", "custom"]>;
        daysOfWeek: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>>;
        timesPerPeriod: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        type: "custom" | "daily" | "weekly";
        daysOfWeek: number[];
        timesPerPeriod: number;
    }, {
        type: "custom" | "daily" | "weekly";
        daysOfWeek?: number[] | undefined;
        timesPerPeriod?: number | undefined;
    }>;
    reminderTime: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    reminderEnabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    frequency: {
        type: "custom" | "daily" | "weekly";
        daysOfWeek: number[];
        timesPerPeriod: number;
    };
    title: string;
    reminderTime: string | null;
    reminderEnabled: boolean;
}, {
    frequency: {
        type: "custom" | "daily" | "weekly";
        daysOfWeek?: number[] | undefined;
        timesPerPeriod?: number | undefined;
    };
    title: string;
    reminderTime?: string | null | undefined;
    reminderEnabled?: boolean | undefined;
}>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export declare const updateHabitSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    frequency: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["daily", "weekly", "custom"]>;
        daysOfWeek: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>>;
        timesPerPeriod: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        type: "custom" | "daily" | "weekly";
        daysOfWeek: number[];
        timesPerPeriod: number;
    }, {
        type: "custom" | "daily" | "weekly";
        daysOfWeek?: number[] | undefined;
        timesPerPeriod?: number | undefined;
    }>>;
    reminderTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reminderEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    frequency?: {
        type: "custom" | "daily" | "weekly";
        daysOfWeek: number[];
        timesPerPeriod: number;
    } | undefined;
    title?: string | undefined;
    reminderTime?: string | null | undefined;
    reminderEnabled?: boolean | undefined;
}, {
    frequency?: {
        type: "custom" | "daily" | "weekly";
        daysOfWeek?: number[] | undefined;
        timesPerPeriod?: number | undefined;
    } | undefined;
    title?: string | undefined;
    reminderTime?: string | null | undefined;
    reminderEnabled?: boolean | undefined;
}>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
