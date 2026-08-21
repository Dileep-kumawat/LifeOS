import type { RecurrenceDescriptor } from "../schemas/calendar.js";
/**
 * Build a raw RFC 5545 RRULE string from the structured descriptor the UI
 * produces. Pure string assembly — all recurrence MATH stays server-side in
 * rrule; the client uses this only so users never type rrule syntax.
 */
export declare function buildRruleString(descriptor: RecurrenceDescriptor | null): string | null;
