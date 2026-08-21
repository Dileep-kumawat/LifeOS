/**
 * Build a raw RFC 5545 RRULE string from the structured descriptor the UI
 * produces. Pure string assembly — all recurrence MATH stays server-side in
 * rrule; the client uses this only so users never type rrule syntax.
 */
export function buildRruleString(descriptor) {
    if (!descriptor)
        return null;
    const freqMap = {
        daily: "DAILY",
        weekly: "WEEKLY",
        monthly: "MONTHLY",
        yearly: "YEARLY",
        custom: "WEEKLY"
    };
    const parts = [`FREQ=${freqMap[descriptor.frequency] ?? "WEEKLY"}`];
    if (descriptor.interval && descriptor.interval > 1) {
        parts.push(`INTERVAL=${descriptor.interval}`);
    }
    if (descriptor.frequency === "weekly" && descriptor.byDay && descriptor.byDay.length) {
        parts.push(`BYDAY=${descriptor.byDay.join(",")}`);
    }
    if (descriptor.endType === "onDate" && descriptor.until) {
        const until = new Date(descriptor.until);
        parts.push(`UNTIL=${until
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}/, "")}`);
    }
    else if (descriptor.endType === "after" && descriptor.count) {
        parts.push(`COUNT=${descriptor.count}`);
    }
    return parts.join(";");
}
