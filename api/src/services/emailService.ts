import { env } from "../config/env.js";
import { logger } from "../logger.js";

export interface SendPasswordResetEmailParams {
  toEmail: string;
  resetToken: string;
}

export interface SendEmailParams {
  toEmail: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Generic transactional email used by the notification engine's `email`
 * channel. Tries Resend then Postmark (mirrors the password-reset flow),
 * falling back to a console log so local/dev runs never hard-fail. Returns
 * void — failures are logged, not thrown, so the notification worker can mark
 * the job delivered rather than retrying a non-transient provider error.
 */
export async function sendEmail({ toEmail, subject, text, html }: SendEmailParams): Promise<void> {
  const bodyHtml = html ?? `<p>${text.replace(/\n/g, "<br/>")}</p>`;

  if (env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "LifeOS <noreply@lifeos.app>",
          to: [toEmail],
          subject,
          html: bodyHtml
        })
      });
      if (response.ok) {
        logger.info({ toEmail, subject }, "Notification email sent via Resend");
        return;
      }
      logger.error({ status: response.status, subject }, "Failed to send email via Resend");
    } catch (err) {
      logger.error({ err, subject }, "Error sending email via Resend");
    }
  }

  if (env.POSTMARK_API_KEY) {
    try {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": env.POSTMARK_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          From: "noreply@lifeos.app",
          To: toEmail,
          Subject: subject,
          HtmlBody: bodyHtml
        })
      });
      if (response.ok) {
        logger.info({ toEmail, subject }, "Notification email sent via Postmark");
        return;
      }
      logger.error({ status: response.status, subject }, "Failed to send email via Postmark");
    } catch (err) {
      logger.error({ err, subject }, "Error sending email via Postmark");
    }
  }

  logger.info({ toEmail, subject }, `[DEV/FALLBACK EMAIL] ${text}`);
}

export async function sendPasswordResetEmail({
  toEmail,
  resetToken
}: SendPasswordResetEmailParams): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password/${resetToken}`;

  if (env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "LifeOS Auth <noreply@lifeos.app>",
          to: [toEmail],
          subject: "Reset your LifeOS password",
          html: `<p>You requested a password reset for LifeOS.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour.</p>`
        })
      });
      if (!response.ok) {
        logger.error({ status: response.status }, "Failed to send email via Resend");
      } else {
        logger.info({ toEmail }, "Password reset email sent via Resend");
        return;
      }
    } catch (err) {
      logger.error({ err }, "Error sending email via Resend");
    }
  }

  if (env.POSTMARK_API_KEY) {
    try {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": env.POSTMARK_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          From: "noreply@lifeos.app",
          To: toEmail,
          Subject: "Reset your LifeOS password",
          HtmlBody: `<p>You requested a password reset for LifeOS.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour.</p>`
        })
      });
      if (!response.ok) {
        logger.error({ status: response.status }, "Failed to send email via Postmark");
      } else {
        logger.info({ toEmail }, "Password reset email sent via Postmark");
        return;
      }
    } catch (err) {
      logger.error({ err }, "Error sending email via Postmark");
    }
  }

  // Fallback if neither Resend nor Postmark key is configured or API calls failed
  logger.info(
    `[DEV/FALLBACK EMAIL SERVICE] Password reset token for ${toEmail}: ${resetToken}`
  );
  logger.info(`[DEV/FALLBACK EMAIL SERVICE] Reset URL: ${resetUrl}`);
}
