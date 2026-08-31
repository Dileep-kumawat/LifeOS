import { z } from "zod";
/**
 * Validates ISO / YYYY-MM-DD date strings and enforces range boundaries (<= 366 days).
 */
export const analyticsDateRangeSchema = z
    .object({
    startDate: z
        .string({ required_error: "startDate is required" })
        .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/, "startDate must be YYYY-MM-DD or ISO date string"),
    endDate: z
        .string({ required_error: "endDate is required" })
        .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/, "endDate must be YYYY-MM-DD or ISO date string")
})
    .refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start.getTime() <= end.getTime();
}, {
    message: "startDate must be before or equal to endDate and must be valid dates",
    path: ["startDate"]
})
    .refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 366;
}, {
    message: "Date range cannot exceed 366 days (1 year)",
    path: ["endDate"]
});
export const analyticsExportQuerySchema = z
    .object({
    type: z.enum(["productivity", "finance"], {
        required_error: "type is required (productivity | finance)"
    }),
    format: z.enum(["csv", "pdf"], {
        required_error: "format is required (csv | pdf)"
    }),
    startDate: z
        .string({ required_error: "startDate is required" })
        .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/, "startDate must be YYYY-MM-DD or ISO date string"),
    endDate: z
        .string({ required_error: "endDate is required" })
        .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/, "endDate must be YYYY-MM-DD or ISO date string")
})
    .refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start.getTime() <= end.getTime();
}, {
    message: "startDate must be before or equal to endDate and must be valid dates",
    path: ["startDate"]
})
    .refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 366;
}, {
    message: "Date range cannot exceed 366 days (1 year)",
    path: ["endDate"]
});
