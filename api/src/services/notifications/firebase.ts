import admin from "firebase-admin";
import { env } from "../../config/env.js";
import { logger } from "../../logger.js";

let messagingInstance: admin.messaging.Messaging | null = null;
let initialized = false;

/**
 * Initializes the Firebase Admin SDK singleton from the environment.
 * If FIREBASE_SERVICE_ACCOUNT_JSON is not set or invalid, logs a warning
 * and degrades gracefully without throwing, so the API boots and runs normally.
 */
export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  if (initialized) {
    return messagingInstance;
  }

  initialized = true;

  const rawJson = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!rawJson) {
    logger.warn(
      "Firebase Admin SDK not initialized: FIREBASE_SERVICE_ACCOUNT_JSON is not set. Native FCM push delivery is disabled."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(rawJson);
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      logger.error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields (project_id, client_email, or private_key). FCM push disabled."
      );
      return null;
    }

    const app =
      admin.apps.length > 0
        ? admin.app()
        : admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });

    messagingInstance = admin.messaging(app);
    logger.info(
      { projectId: serviceAccount.project_id },
      "Firebase Admin SDK initialized successfully for FCM push"
    );
    return messagingInstance;
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Failed to parse or initialize FIREBASE_SERVICE_ACCOUNT_JSON. FCM push disabled."
    );
    return null;
  }
}

/**
 * Check whether Firebase Admin is configured and ready to deliver pushes.
 */
export function isFirebaseConfigured(): boolean {
  return getFirebaseMessaging() !== null;
}
