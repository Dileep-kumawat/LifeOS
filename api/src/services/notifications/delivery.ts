import type { NotificationChannel, NotificationItem, NotificationPayload } from "@lifeos/shared";
import { isPreferenceEnabled, preferenceModuleForType } from "./preferences.js";

/**
 * Pure delivery dispatch. The worker calls this with a live Notification doc
 * plus a dependency bundle; every side effect (find subs, send push, write DB)
 * is injected so the logic — preference gating, 404/410 cleanup, "all subs
 * dead" handling — is unit-testable without a database or a push service.
 */

export interface PushSubscriptionLike {
  _id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface NotificationLike {
  _id: string;
  userId: string;
  type: string;
  channel: NotificationChannel;
  payload: NotificationPayload;
  deliveryStatus?: string;
}

export interface PushSendLike {
  status: "ok" | "unsubscribed" | "failed";
  subscriptionId: string;
}

export interface DeliveryDeps {
  getSubscriptions(userId: string): Promise<PushSubscriptionLike[]>;
  sendPush(sub: PushSubscriptionLike, payload: object): Promise<PushSendLike>;
  deleteSubscriptions(ids: string[]): Promise<void>;
  markDelivered(id: string, sentAt: Date): Promise<void>;
  sendEmail?(args: { toEmail: string; subject: string; text: string }): Promise<void>;
  prefsUserEmail?: string;
  hasActiveFocusSession?(userId: string): Promise<boolean>;
}

async function checkActiveFocusSessionDefault(userId: string): Promise<boolean> {
  try {
    const { FocusSession } = await import("../../models/FocusSession.js");
    const doc = await FocusSession.findOne({ userId, status: "active" }).select("_id");
    return !!doc;
  } catch {
    return false;
  }
}

export interface DispatchOutcome {
  outcome:
    | "delivered"
    | "already_delivered"
    | "skipped_preference"
    | "skipped_no_subscriptions"
    | "no_subscriptions_after_cleanup"
    | "pending_retry";
  reason?: string;
  cleanedSubscriptionIds?: string[];
}

/**
 * Build the Web Push payload for a (possibly batched) notification. When a
 * batch carries several items, `title` summarizes the count.
 */
export function buildPushPayload(notification: NotificationLike): object {
  const { title, body, data, items } = notification.payload;
  const count = (items ?? []).length;
  return {
    title: count > 1 && title ? `You have ${count} notifications` : (title ?? ""),
    body: body ?? "",
    data: data ?? {},
    items: items ?? []
  };
}

/**
 * Route one notification to its channel, respecting preferences and cleaning
 * up stale push subscriptions. Throws only on a transient send failure (the
 * worker lets BullMQ retry); never on a poisoned/no-op case.
 */
export async function dispatchNotification(
  notification: NotificationLike,
  preferences: any,
  deps: DeliveryDeps
): Promise<DispatchOutcome> {
  const module = preferenceModuleForType(notification.type);

  // Preference gate: a disabled preference makes this a no-op, NOT a send.
  if (!isPreferenceEnabled(preferences, module, notification.channel)) {
    return { outcome: "skipped_preference", reason: module };
  }

  // Focus DND gate (FR-8.4): opt-in suppression of non-critical notifications during active focus sessions
  if (
    preferences?.dndDuringFocus &&
    notification.type !== "focus_session_alert" &&
    notification.type !== "system"
  ) {
    const hasActiveSession = deps.hasActiveFocusSession
      ? await deps.hasActiveFocusSession(notification.userId)
      : await checkActiveFocusSessionDefault(notification.userId);

    if (hasActiveSession) {
      return { outcome: "skipped_preference", reason: "focus_session_dnd" };
    }
  }

  if (notification.deliveryStatus === "sent") {
    return { outcome: "already_delivered" };
  }

  const now = () => new Date();

  switch (notification.channel) {
    case "in_app": {
      // The Notification row IS the in-app message; "sending" = making it
      // visible by flipping deliveryStatus. readStatus stays unread.
      await deps.markDelivered(notification._id, now());
      return { outcome: "delivered" };
    }

    case "push": {
      const subs = await deps.getSubscriptions(notification.userId);
      if (subs.length === 0) {
        return { outcome: "skipped_no_subscriptions" };
      }

      const payload = buildPushPayload(notification);
      const toCleanup: string[] = [];
      let anyOk = false;

      for (const sub of subs) {
        try {
          const result = await deps.sendPush(sub, payload);
          if (result.status === "ok") {
            anyOk = true;
          } else if (result.status === "unsubscribed") {
            // 404/410 Gone — cleanup now, don't wait for the client.
            toCleanup.push(sub._id);
          }
        } catch {
          // A throw here is treated as a failed attempt for this sub; if no
          // sub succeeds the whole job is thrown below to trigger a retry.
        }
      }

      if (toCleanup.length > 0) {
        await deps.deleteSubscriptions(toCleanup);
      }

      if (anyOk) {
        await deps.markDelivered(notification._id, now());
        return { outcome: "delivered", cleanedSubscriptionIds: toCleanup };
      }

      if (toCleanup.length > 0) {
        // Every subscription was 410 — nothing left to deliver. Mark it done
        // (the reminder is moot once its endpoints are all dead) rather than
        // retrying forever.
        await deps.markDelivered(notification._id, now());
        return { outcome: "no_subscriptions_after_cleanup", cleanedSubscriptionIds: toCleanup };
      }

      // Real transient failures with no cleanup → let the queue retry.
      return { outcome: "pending_retry" };
    }

    case "email": {
      if (!deps.sendEmail || !deps.prefsUserEmail) {
        throw new Error("email channel configured but no email sender available");
      }
      await deps.sendEmail({
        toEmail: deps.prefsUserEmail,
        subject:
          notification.payload.title ||
          `${notification.payload.items?.length ?? 1} LifeOS update(s)`,
        text:
          notification.payload.body ||
          notification.payload.items?.map((i: NotificationItem) => `• ${i.title}`).join("\n") ||
          ""
      });
      await deps.markDelivered(notification._id, now());
      return { outcome: "delivered" };
    }
  }
}
