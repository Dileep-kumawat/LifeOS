import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import {
  createPushSubscriptionSchema,
  deletePushSubscriptionSchema,
  listNotificationsQuerySchema,
  markAllReadSchema,
  notificationIdParamsSchema,
  updateNotificationPreferencesSchema,
  registerFcmTokenSchema,
  type NotificationPreferences
} from "@lifeos/shared";

import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { Notification } from "../models/Notification.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { serializeNotification } from "../services/notifications/serializers.js";
import {
  countUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notifications/notificationsRepo.js";
import {
  applyPreferenceUpdates,
  DEFAULT_PREFERENCES
} from "../services/notifications/preferences.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

function serializePreferences(prefs: any): NotificationPreferences {
  return applyPreferenceUpdates(
    DEFAULT_PREFERENCES,
    (prefs ?? {}) as Partial<NotificationPreferences>
  );
}

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the caller's notifications
 *     description: Paginated, newest first. Optionally filtered by readStatus,
 *       channel or type. readStatus (read/unread) is the primary filter — it
 *       is backed by a compound (userId, readStatus) index.
 *     parameters:
 *       - in: query
 *         name: readStatus
 *         required: false
 *         schema: { type: string, enum: [read, unread] }
 *       - in: query
 *         name: channel
 *         required: false
 *         schema: { type: string, enum: [push, in_app, email] }
 *       - in: query
 *         name: type
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: number, default: 20, maximum: 50 }
 *     responses:
 *       200:
 *         description: Paginated notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Notification"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: number }
 *                     limit: { type: number }
 *                     total: { type: number }
 *                     pages: { type: number }
 *             examples:
 *               list:
 *                 value:
 *                   notifications:
 *                     - id: 662c9f1e9f0b2a001c3d4e80
 *                       userId: 662c9f1e9f0b2a001c3d4e5a
 *                       type: habit_reminder
 *                       channel: push
 *                       payload:
 *                         title: You have 3 notifications
 *                         body: ""
 *                         data: {}
 *                         items:
 *                           - { title: Morning run }
 *                           - { title: Read 20 pages }
 *                           - { title: Drink water }
 *                       deliveryStatus: pending
 *                       readStatus: unread
 *                       scheduledFor: "2026-08-06T08:00:00.000Z"
 *                       sentAt: null
 *                       readAt: null
 *                       createdAt: "2026-08-06T07:59:00.000Z"
 *                   pagination: { page: 1, limit: 20, total: 1, pages: 1 }
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 */
notificationsRouter.get(
  "/notifications",
  validate(listNotificationsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { readStatus, channel, type, page, limit } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { userId };
    if (readStatus) filter.readStatus = readStatus;
    if (channel) filter.channel = channel;
    if (type) filter.type = type;

    const total = await Notification.countDocuments(filter);
    const docs = await Notification.find(filter)
      .sort({ scheduledFor: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.json({
      notifications: docs.map(serializeNotification),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  }
);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Count unread in-app notifications
 *     description: Cheap, frequently-polled endpoint for the notification bell.
 *       Backed solely by the (userId, readStatus) compound index — no joins,
 *       no aggregation pipeline.
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unread: { type: number }
 *             examples:
 *               count:
 *                 value: { unread: 3 }
 *       401:
 *         description: Authentication required
 */
notificationsRouter.get("/notifications/unread-count", async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const unread = await countUnreadNotifications(Notification, userId);
  return res.json({ unread });
});

/**
 * @openapi
 * /notifications/mark-all-read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all of the caller's notifications as read
 *     description: Bulk update. Optionally scoped by readStatus (usually
 *       `unread`). Returns the number of documents modified.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               readStatus:
 *                 type: string
 *                 enum: [read, unread]
 *     responses:
 *       200:
 *         description: Updated count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedCount: { type: number }
 *             examples:
 *               done:
 *                 value: { updatedCount: 3 }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
notificationsRouter.patch(
  "/notifications/mark-all-read",
  validate(markAllReadSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const { readStatus } = req.body as { readStatus?: string };

    const { updatedCount } = await markAllNotificationsRead(Notification, userId, readStatus);

    return res.json({ updatedCount });
  }
);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     description: Ownership is enforced server-side — only the notification's
 *       owner can mark it read. Marking is idempotent.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The updated notification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Notification"
 *       400:
 *         description: Invalid notification ID format
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Notification not found (or not owned by the caller)
 */
notificationsRouter.patch(
  "/notifications/:id/read",
  validate(notificationIdParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "NotFound", message: "Notification not found." });
    }

    const notification = await markNotificationRead(Notification, userId, id);
    if (!notification) {
      return res.status(404).json({ error: "NotFound", message: "Notification not found." });
    }

    return res.json(serializeNotification(notification));
  }
);

/**
 * @openapi
 * /notifications/preferences:
 *   get:
 *     tags: [Notifications, AI]
 *     summary: Get the caller's notification preferences
 *     description: Returns the full per-module, per-channel toggle map, including Daily AI Summary delivery preferences. Every module defaults to enabled.
 *     responses:
 *       200:
 *         description: Preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferences:
 *                   $ref: "#/components/schemas/NotificationPreferences"
 *             examples:
 *               prefs:
 *                 value:
 *                   preferences:
 *                     calendarReminders: { push: true, inApp: true }
 *                     habitReminders: { push: false, inApp: true }
 *                     system: { push: true, inApp: true }
 *                     dailySummary: { deliveryTime: "07:00", channels: ["push", "in_app"], timezone: "America/New_York" }
 *       401:
 *         description: Authentication required
 */
notificationsRouter.get("/notifications/preferences", async (req: Request, res: Response) => {
  const prefs = serializePreferences(req.user!.notificationPreferences);
  return res.json({ preferences: prefs });
});

/**
 * @openapi
 * /notifications/preferences:
 *   patch:
 *     tags: [Notifications, AI]
 *     summary: Update notification preferences
 *     description: Partial update — any module, toggle, or daily summary delivery setting not present is left unchanged.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               calendarReminders:
 *                 type: object
 *                 properties:
 *                   push: { type: boolean }
 *                   inApp: { type: boolean }
 *               habitReminders:
 *                 type: object
 *                 properties:
 *                   push: { type: boolean }
 *                   inApp: { type: boolean }
 *               system:
 *                 type: object
 *                 properties:
 *                   push: { type: boolean }
 *                   inApp: { type: boolean }
 *               dailySummary:
 *                 type: object
 *                 properties:
 *                   deliveryTime: { type: string, example: "07:00" }
 *                   channels:
 *                     type: array
 *                     items: { type: string, enum: [push, in_app, email] }
 *                   timezone: { type: string, example: "America/New_York" }
 *             examples:
 *               update:
 *                 value:
 *                   dailySummary: { deliveryTime: "08:00", channels: ["push", "in_app"] }
 *     responses:
 *       200:
 *         description: Updated preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferences:
 *                   $ref: "#/components/schemas/NotificationPreferences"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
notificationsRouter.patch(
  "/notifications/preferences",
  validate(updateNotificationPreferencesSchema),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const current = serializePreferences(user.notificationPreferences);
    const updated = applyPreferenceUpdates(current, req.body as Partial<NotificationPreferences>);

    user.notificationPreferences = updated as any;
    await user.save();

    return res.json({ preferences: updated });
  }
);

/**
 * @openapi
 * /notifications/push-subscription:
 *   post:
 *     tags: [Notifications]
 *     summary: Register a browser push subscription
 *     description: Called by the frontend after the Push API grants permission.
 *       The browser's subscription object is stored so the worker can push to
 *       this device. Re-registering the same endpoint updates it (upsert).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint, keys]
 *             properties:
 *               endpoint:
 *                 type: string
 *                 format: uri
 *               keys:
 *                 type: object
 *                 required: [p256dh, auth]
 *                 properties:
 *                   p256dh: { type: string }
 *                   auth: { type: string }
 *               userAgent:
 *                 type: string
 *           examples:
 *             subscription:
 *               value:
 *                 endpoint: "https://fcm.googleapis.com/fcm/send/f5a9b7c8-0123-4567-89ab-cdef01234567"
 *                 keys:
 *                   p256dh: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9"
 *                   auth: "tHUN86N_xIkv69yViEuiBI"
 *                 userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
 *     responses:
 *       201:
 *         description: Subscription stored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     endpoint: { type: string }
 *             examples:
 *               created:
 *                 value:
 *                   subscription:
 *                     id: 662c9f1e9f0b2a001c3d4e90
 *                     endpoint: https://fcm.googleapis.com/.../abc123
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
notificationsRouter.post(
  "/notifications/push-subscription",
  validate(createPushSubscriptionSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { endpoint, keys, userAgent } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    };

    const subscription = await PushSubscription.findOneAndUpdate(
      { userId, endpoint },
      {
        $set: {
          endpoint,
          keys,
          userAgent: userAgent ?? req.headers["user-agent"] ?? ""
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      subscription: {
        id: subscription._id.toString(),
        endpoint: subscription.endpoint
      }
    });
  }
);

/**
 * @openapi
 * /notifications/push-subscription:
 *   delete:
 *     tags: [Notifications]
 *     summary: Unregister a push subscription
 *     description: |
 *       Called when permission is revoked or a subscription is known to be
 *       stale. Endpoints that return 404/410 Gone during a send are ALSO
 *       cleaned up automatically by the worker — the client never has to
 *       report them. Deleting an endpoint the caller does not own is a no-op
 *       (the response reports a deleted count of 0).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint]
 *             properties:
 *               endpoint:
 *                 type: string
 *                 format: uri
 *           examples:
 *             subscription:
 *               value:
 *                 endpoint: "https://fcm.googleapis.com/fcm/send/f5a9b7c8-0123-4567-89ab-cdef01234567"
 *     responses:
 *       200:
 *         description: Subscription removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted: { type: number }
 *             examples:
 *               removed:
 *                 value: { deleted: 1 }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
notificationsRouter.delete(
  "/notifications/push-subscription",
  validate(deletePushSubscriptionSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { endpoint } = req.body as { endpoint: string };

    const result = await PushSubscription.deleteOne({ userId, endpoint });
    return res.json({ deleted: result.deletedCount ?? 0 });
  }
);

/**
 * @openapi
 * /notifications/fcm-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Register an FCM device token for mobile push notifications
 *     description: |
 *       Registers or updates an FCM token for an Android or iOS device.
 *       Re-registering the same token upserts the device registration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *               deviceType: { type: string, enum: [android, ios, web], default: android }
 *               deviceName: { type: string }
 *     responses:
 *       201:
 *         description: FCM device token registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     endpoint: { type: string }
 *                     deviceType: { type: string }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
notificationsRouter.post(
  "/notifications/fcm-token",
  validate(registerFcmTokenSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { token, deviceType, deviceName } = req.body as {
      token: string;
      deviceType?: "android" | "ios" | "web";
      deviceName?: string;
    };

    const endpoint = `fcm:${token}`;
    const subscription = await PushSubscription.findOneAndUpdate(
      { userId, endpoint },
      {
        $set: {
          type: "fcm",
          endpoint,
          fcmToken: token,
          deviceType: deviceType || "android",
          userAgent: deviceName || req.headers["user-agent"] || ""
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      subscription: {
        id: subscription._id.toString(),
        endpoint: subscription.endpoint,
        deviceType: subscription.deviceType
      }
    });
  }
);

/**
 * @openapi
 * /notifications/fcm-token:
 *   delete:
 *     tags: [Notifications]
 *     summary: Unregister an FCM device token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Token removed
 *       401:
 *         description: Authentication required
 */
notificationsRouter.delete("/notifications/fcm-token", async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { token } = req.body as { token: string };
  if (!token) {
    return res.status(400).json({ error: "ValidationError", message: "Token is required" });
  }

  const endpoint = `fcm:${token}`;
  const result = await PushSubscription.deleteOne({ userId, endpoint });
  return res.json({ deleted: result.deletedCount ?? 0 });
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       description: A single delivered (or scheduled) notification. `deliveryStatus`
 *         tracks the send lifecycle; `readStatus` is the in-app read state and is
 *         only meaningful for the in_app channel. Batched reminders put their
 *         items in `payload.items`.
 *       required: [id, userId, type, channel, payload, deliveryStatus, readStatus, scheduledFor, createdAt]
 *       properties:
 *         id: { type: string }
 *         userId: { type: string }
 *         type: { type: string, description: "Open enum. Known: calendar_reminder, habit_reminder, system, budget_alert, daily_summary." }
 *         channel: { type: string, enum: [push, in_app, email] }
 *         payload:
 *           type: object
 *           properties:
 *             title: { type: string }
 *             body: { type: string }
 *             data: { type: object, description: Deep-linking info (source eventId/habitId, etc). }
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title: { type: string }
 *                   body: { type: string }
 *                   data: { type: object }
 *         deliveryStatus: { type: string, enum: [pending, sent, failed] }
 *         readStatus: { type: string, enum: [read, unread] }
 *         scheduledFor: { type: string, format: date-time }
 *         sentAt: { type: string, format: date-time, nullable: true }
 *         readAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *     NotificationPreferences:
 *       type: object
 *       description: Per-module, per-channel notification toggles & AI Daily Summary delivery preferences.
 *       properties:
 *         calendarReminders:
 *           type: object
 *           properties:
 *             push: { type: boolean, default: true }
 *             inApp: { type: boolean, default: true }
 *         habitReminders:
 *           type: object
 *           properties:
 *             push: { type: boolean, default: true }
 *             inApp: { type: boolean, default: true }
 *         system:
 *           type: object
 *           properties:
 *             push: { type: boolean, default: true }
 *             inApp: { type: boolean, default: true }
 *         dailySummary:
 *           type: object
 *           properties:
 *             deliveryTime: { type: string, example: "07:00", default: "07:00" }
 *             channels:
 *               type: array
 *               items: { type: string, enum: [push, in_app, email] }
 *               default: ["push", "in_app"]
 *             timezone: { type: string, example: "America/New_York" }
 */
