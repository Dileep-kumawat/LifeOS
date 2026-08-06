import type {
  NotificationChannel,
  NotificationPreferences
} from "@lifeos/shared";

/**
 * Modules a user can toggle per channel. This is the ONLY place the mapping
 * from notification `type` -> preference module lives. Adding a new module
 * later = add a key here and to the User model; nothing else changes.
 */
export type PreferenceModule = "calendarReminders" | "habitReminders" | "system";

export const NOTIFICATION_PREFERENCE_MODULES: PreferenceModule[] = [
  "calendarReminders",
  "habitReminders",
  "system"
];

/** Defaults — everything enabled. New users get this shape. */
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  calendarReminders: { push: true, inApp: true },
  habitReminders: { push: true, inApp: true },
  system: { push: true, inApp: true }
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
    default:
      return "system";
  }
}

/**
 * Is this notification allowed through given the user's preferences? A
 * missing module or missing toggle is treated as ENABLED (opt-out model) so
 * legacy documents without preferences still deliver. Email has no per-module
 * toggle in this phase, so it always passes the preference check.
 */
export function isPreferenceEnabled(
  prefs: Partial<Record<string, { push?: boolean; inApp?: boolean }>> | undefined,
  module: PreferenceModule,
  channel: NotificationChannel
): boolean {
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
  const next: NotificationPreferences = { ...current };
  for (const module of NOTIFICATION_PREFERENCE_MODULES) {
    const patch = updates[module];
    if (!patch) continue;
    next[module] = {
      push: patch.push ?? next[module].push,
      inApp: patch.inApp ?? next[module].inApp
    };
  }
  return next;
}
