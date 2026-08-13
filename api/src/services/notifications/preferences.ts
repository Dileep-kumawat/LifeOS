import type { NotificationChannel, NotificationPreferences } from "@lifeos/shared";

/**
 * Modules a user can toggle per channel. This is the ONLY place the mapping
 * from notification `type` -> preference module lives. Adding a new module
 * later = add a key here and to the User model; nothing else changes.
 */
export type PreferenceModule =
  | "calendarReminders"
  | "habitReminders"
  | "system"
  | "financeBudgetAlerts"
  | "dailySummary";

export const NOTIFICATION_PREFERENCE_MODULES: PreferenceModule[] = [
  "calendarReminders",
  "habitReminders",
  "system",
  "financeBudgetAlerts",
  "dailySummary"
];

/** Defaults — everything enabled. New users get this shape. */
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  calendarReminders: { push: true, inApp: true },
  habitReminders: { push: true, inApp: true },
  system: { push: true, inApp: true },
  financeBudgetAlerts: { push: true, inApp: true },
  dailySummary: { deliveryTime: "07:00", channels: ["push", "in_app"] }
};

/**
 * Map a notification `type` to its preference module. Unknown/future types
 * fall back to `system` so they are never silently blocked or force-enabled.
 */
export function preferenceModuleForType(type: string): PreferenceModule {
  switch (type) {
    case "calendar_reminder":
      return "calendarReminders";
    case "habit_reminder":
      return "habitReminders";
    case "budget_alert":
      return "financeBudgetAlerts";
    case "daily_summary":
      return "dailySummary";
    default:
      return "system";
  }
}

/**
 * Is this notification allowed through given the user's preferences? A
 * missing module or missing toggle is treated as ENABLED (opt-out model) so
 * legacy documents without preferences still deliver.
 */
export function isPreferenceEnabled(
  prefs: any,
  module: PreferenceModule,
  channel: NotificationChannel
): boolean {
  if (!prefs) return true;

  if (module === "dailySummary") {
    const ds = prefs.dailySummary;
    if (!ds) return true;
    if (Array.isArray(ds.channels)) {
      return ds.channels.includes(channel);
    }
    if (channel === "push") return ds.push !== false;
    if (channel === "in_app") return ds.inApp !== false;
    return true;
  }

  if (channel === "email") return true;
  const modulePrefs = prefs?.[module];
  if (!modulePrefs) return true;
  if (channel === "push") return modulePrefs.push !== false;
  if (channel === "in_app") return modulePrefs.inApp !== false;
  return true;
}

/**
 * Merge a partial PATCH body onto the current preferences. Returns a complete
 * NotificationPreferences object (unset fields keep their current value).
 */
export function applyPreferenceUpdates(
  current: NotificationPreferences,
  updates: Partial<NotificationPreferences>
): NotificationPreferences {
  const next: NotificationPreferences = {
    calendarReminders: { ...current.calendarReminders },
    habitReminders: { ...current.habitReminders },
    system: { ...current.system },
    financeBudgetAlerts: { ...current.financeBudgetAlerts },
    dailySummary: { ...current.dailySummary }
  };

  for (const module of NOTIFICATION_PREFERENCE_MODULES) {
    const patch = updates[module];
    if (!patch) continue;

    if (module === "dailySummary") {
      const dsPatch = patch as Partial<NotificationPreferences["dailySummary"]>;
      next.dailySummary = {
        deliveryTime: dsPatch.deliveryTime ?? next.dailySummary.deliveryTime,
        channels: dsPatch.channels ?? next.dailySummary.channels,
        timezone: dsPatch.timezone ?? next.dailySummary.timezone
      };
    } else {
      const stdPatch = patch as Partial<{ push: boolean; inApp: boolean }>;
      next[module] = {
        push: stdPatch.push ?? (next[module] as any).push,
        inApp: stdPatch.inApp ?? (next[module] as any).inApp
      };
    }
  }
  return next;
}
