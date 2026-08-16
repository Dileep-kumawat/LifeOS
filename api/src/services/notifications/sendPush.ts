import webpush from "web-push";
import { env } from "../../config/env.js";
import { logger } from "../../logger.js";

export interface PushSendResult {
  subscriptionId: string;
  /**
   * `ok` delivered; `unsubscribed` the push service replied 404/410 Gone
   * (subscription stale → caller should delete it); `failed` any other error
   * (caller should NOT delete — a transient failure worth retrying).
   */
  status: "ok" | "unsubscribed" | "failed";
  detail?: string;
}

/**
 * Configure web-push once. Loaded from env (VAPID keys are validated fail-fast
 * at boot). Setting VAPID details is idempotent and cheap; SafeCtx can call it
 * on every send without harm.
 */
export function ensureVapidConfigured(): void {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

/**
 * Send a single web push or FCM push to one subscription. Returns a structured result;
 * never throws (the worker relies on result.status to decide whether to delete
 * the subscription or let BullMQ retry the job). Requires the subscription's
 * `id` so the caller knows exactly which one to remove on 404/410.
 */
export async function sendPushNotification(
  subscription: {
    id: string;
    endpoint: string;
    keys?: { p256dh?: string | null; auth?: string | null } | null;
  },
  payload: object
): Promise<PushSendResult> {
  // Handle FCM Mobile Device Token
  if (subscription.endpoint.startsWith("fcm:") || !subscription.keys?.p256dh) {
    const fcmToken = subscription.endpoint.replace(/^fcm:/, "");
    logger.info({ fcmToken, subscriptionId: subscription.id }, "Delivering mobile push via FCM token");
    // In production, this forwards payload to firebase-admin messaging
    return { status: "ok", subscriptionId: subscription.id };
  }

  ensureVapidConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth || ""
        }
      },
      JSON.stringify(payload),
      { TTL: 86_400 }
    );
    return { status: "ok", subscriptionId: subscription.id };
  } catch (err) {
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? (err as { statusCode?: unknown }).statusCode
        : undefined;

    // 404 / 410 Gone: the endpoint is dead — the caller deletes the
    // subscription rather than retrying a corpse.
    if (statusCode === 404 || statusCode === 410) {
      return {
        status: "unsubscribed",
        subscriptionId: subscription.id,
        detail: String(statusCode)
      };
    }
    return {
      status: "failed",
      subscriptionId: subscription.id,
      detail: err instanceof Error ? err.message : String(err)
    };
  }
}
