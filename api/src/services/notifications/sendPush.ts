import webpush from "web-push";
import type admin from "firebase-admin";
import { env } from "../../config/env.js";
import { logger } from "../../logger.js";
import { getFirebaseMessaging } from "./firebase.js";

export interface PushSendResult {
  subscriptionId: string;
  /**
   * `ok` delivered; `unsubscribed` the push service replied 404/410 Gone or UNREGISTERED
   * (subscription stale → caller should delete it); `failed` any other error
   * (caller should NOT delete — a transient failure worth retrying).
   */
  status: "ok" | "unsubscribed" | "failed";
  detail?: string;
}

/**
 * Configure web-push once. Loaded from env (VAPID keys are validated fail-fast
 * at boot). Setting VAPID details is idempotent and cheap; callers can call it
 * on every send without harm.
 */
export function ensureVapidConfigured(): void {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

/**
 * Send a single web push or FCM push to one subscription. Returns a structured result;
 * never throws (the worker relies on result.status to decide whether to delete
 * the subscription or let BullMQ retry the job). Requires the subscription's
 * `id` so the caller knows exactly which one to remove on 404/410 / UNREGISTERED.
 */
export async function sendPushNotification(
  subscription: {
    id: string;
    endpoint: string;
    keys?: { p256dh?: string | null; auth?: string | null } | null;
  },
  payload: object
): Promise<PushSendResult> {
  const isFcm = subscription.endpoint.startsWith("fcm:") || !subscription.keys?.p256dh;

  // ==========================================
  // 1. Native FCM Push Delivery (Android APK)
  // ==========================================
  if (isFcm) {
    const fcmToken = subscription.endpoint.replace(/^fcm:/, "");
    const messaging = getFirebaseMessaging();

    if (!messaging) {
      logger.warn(
        { subscriptionId: subscription.id },
        "FCM push skipped: Firebase Admin SDK not configured (FIREBASE_SERVICE_ACCOUNT_JSON missing)"
      );
      return {
        status: "failed",
        subscriptionId: subscription.id,
        detail: "FCM not configured"
      };
    }

    try {
      const p = payload as Record<string, any>;
      const title = p.title || "LifeOS";
      const body = p.body || "";

      // Format string data dictionary for Android FCM
      const dataPayload: Record<string, string> = {};
      if (p.data && typeof p.data === "object") {
        for (const [k, v] of Object.entries(p.data)) {
          dataPayload[k] = typeof v === "string" ? v : JSON.stringify(v);
        }
      }
      if (p.type) dataPayload.type = String(p.type);
      if (p.title) dataPayload.title = String(p.title);
      if (p.body) dataPayload.body = String(p.body);

      // Must include both `notification` (for system display when app is killed)
      // and `data` (for deep link payload on click)
      const fcmMessage: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body
        },
        data: dataPayload,
        android: {
          priority: "high",
          notification: {
            channelId: "lifeos_alerts",
            sound: "default",
            defaultVibrateTimings: true,
            defaultSound: true
          }
        }
      };

      await messaging.send(fcmMessage);
      logger.info(
        { subscriptionId: subscription.id, tokenPrefix: fcmToken.slice(0, 10) + "..." },
        "FCM mobile push delivered successfully"
      );
      return { status: "ok", subscriptionId: subscription.id };
    } catch (err: any) {
      const code = err?.code || "";
      // FCM Token Pruning: if token is dead or unregistered, prune it immediately
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/mismatched-credential"
      ) {
        logger.info(
          { subscriptionId: subscription.id, code },
          "Dead FCM token detected; marking for subscription pruning"
        );
        return {
          status: "unsubscribed",
          subscriptionId: subscription.id,
          detail: code
        };
      }

      logger.warn(
        { err: err?.message, code, subscriptionId: subscription.id },
        "FCM push delivery failed"
      );
      return {
        status: "failed",
        subscriptionId: subscription.id,
        detail: err instanceof Error ? err.message : String(err)
      };
    }
  }

  // ==========================================
  // 2. Web Push Delivery (VAPID / Browser SW)
  // ==========================================
  ensureVapidConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys?.p256dh || "",
          auth: subscription.keys?.auth || ""
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
