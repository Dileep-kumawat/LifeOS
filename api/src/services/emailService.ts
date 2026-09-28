import { env } from "../config/env.js";
import { logger } from "../logger.js";

export interface SendEmailOptions {
  to?: string;
  toEmail?: string;
  name?: string;
  recipientName?: string;
  subject: string;
  html?: string;
  text?: string;
  htmlContent?: string;
  textContent?: string;
}

export interface SendPasswordResetEmailParams {
  to?: string;
  toEmail?: string;
  name?: string;
  resetToken?: string;
  resetUrl?: string;
}

/**
 * Generic transactional email sender using Brevo SMTP/Email REST API.
 * Follows the project's fail-open rule: errors are logged and never throw into the request path.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ sent: boolean }> {
  const targetEmail = options.to || options.toEmail;
  const targetName = options.name || options.recipientName || "LifeOS User";
  const subject = options.subject;
  const htmlContent = options.html || options.htmlContent || `<p>${(options.text || options.textContent || "").replace(/\n/g, "<br/>")}</p>`;
  const textContent = options.text || options.textContent || "";

  if (!targetEmail) {
    logger.warn("sendEmail called without recipient email; skipping");
    return { sent: false };
  }

  // Fallback for local development when Brevo API key is not configured
  if (!env.BREVO_API_KEY) {
    logger.warn("BREVO_API_KEY is not configured; email dispatch skipped");
    return { sent: false };
  }

  const senderName = env.BREVO_SENDER_NAME || "LifeOS";
  const senderEmail = env.BREVO_SENDER_EMAIL || "noreply@lifeos.app";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [
          {
            email: targetEmail,
            name: targetName
          }
        ],
        subject,
        htmlContent,
        textContent
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      let errorMessage = "Unknown error";
      try {
        const errorData = (await response.json()) as { message?: string; code?: string };
        errorMessage = errorData.message || response.statusText;
      } catch {
        errorMessage = response.statusText;
      }
      logger.error(
        { status: response.status, errorMessage },
        "Failed to send email via Brevo"
      );
      return { sent: false };
    }

    logger.info({ to: targetEmail, subject }, "Email sent successfully via Brevo");
    return { sent: true };
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    logger.error(
      { isTimeout, errorMessage: err?.message || "Network error" },
      "Error during Brevo email dispatch"
    );
    return { sent: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Builds the responsive LifeOS branded password reset email template.
 */
function buildPasswordResetEmailTemplate(name: string, resetUrl: string): { html: string; text: string } {
  const greeting = name ? `Hello ${name},` : "Hello,";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your LifeOS password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #faf9f8; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e4; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f0efee;">
              <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #111827;">LifeOS</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #111827;">${greeting}</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 22px; color: #374151;">
                We received a request to reset the password for your LifeOS account. You can set a new password by clicking the button below:
              </p>
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #0075de;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset your password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 20px; color: #6b7280;">
                This link expires in <strong>30 minutes</strong> and can only be used once.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 20px; color: #6b7280;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <hr style="border: none; border-top: 1px solid #f0efee; margin: 24px 0;" />
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af; word-break: break-all;">
                If the button above does not work, copy and paste this URL into your browser:<br />
                <a href="${resetUrl}" style="color: #0075de; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #faf9f8; border-top: 1px solid #f0efee; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">LifeOS — Personal Operating System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

We received a request to reset the password for your LifeOS account.

Reset your password using the link below:
${resetUrl}

This link expires in 30 minutes and can only be used once.

If you did not request this, ignore this email. Your password will remain unchanged.

— The LifeOS Team`;

  return { html, text };
}

/**
 * Builds the email informing a user that their account is linked with Google Sign-In.
 */
function buildGoogleAccountNoticeTemplate(name: string): { html: string; text: string } {
  const greeting = name ? `Hello ${name},` : "Hello,";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Sign-in notice for LifeOS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e4; border-radius: 8px; padding: 32px;">
          <tr>
            <td>
              <span style="font-size: 20px; font-weight: 700; color: #111827;">LifeOS</span>
              <p style="margin: 24px 0 16px 0; font-size: 15px; color: #111827;">${greeting}</p>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #374151;">
                We received a password reset request for this email address. However, your LifeOS account was registered using <strong>Google Sign-In</strong> and does not have a separate password.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #374151;">
                To log in, simply click <strong>Continue with Google</strong> on the sign-in page.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">LifeOS — Personal Operating System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

We received a password reset request for your LifeOS account. However, your account uses Google Sign-In and does not have a password.

To sign in, please click "Continue with Google" on the login page.

— The LifeOS Team`;

  return { html, text };
}

/**
 * Builds the confirmation email sent after a password has been successfully reset.
 */
function buildPasswordChangedConfirmationTemplate(name: string): { html: string; text: string } {
  const greeting = name ? `Hello ${name},` : "Hello,";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Password changed successfully</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e4; border-radius: 8px; padding: 32px;">
          <tr>
            <td>
              <span style="font-size: 20px; font-weight: 700; color: #111827;">LifeOS</span>
              <p style="margin: 24px 0 16px 0; font-size: 15px; color: #111827;">${greeting}</p>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #374151;">
                The password for your LifeOS account was just successfully updated. All other active sessions have been signed out.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 20px; color: #dc2626;">
                If you did not make this change, please contact support or reset your password immediately.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">LifeOS — Personal Operating System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

Your LifeOS password has been successfully updated. All other active sessions have been signed out.

If you did not make this change, please contact support or reset your password immediately.

— The LifeOS Team`;

  return { html, text };
}

/**
 * Sends a password reset email with expiring token link.
 * Supports both (to, name, resetUrl) and ({ toEmail, resetToken, ... }) signatures.
 */
export async function sendPasswordResetEmail(
  toOrParams: string | SendPasswordResetEmailParams,
  nameParam?: string,
  resetUrlParam?: string
): Promise<{ sent: boolean }> {
  let toEmail = "";
  let name = "";
  let resetUrl = "";

  if (typeof toOrParams === "string") {
    toEmail = toOrParams;
    name = nameParam || "";
    resetUrl = resetUrlParam || "";
  } else {
    toEmail = toOrParams.to || toOrParams.toEmail || "";
    name = toOrParams.name || "";
    resetUrl = toOrParams.resetUrl || `${env.FRONTEND_URL}/reset-password?token=${toOrParams.resetToken || ""}`;
  }

  // If Brevo API key is missing in non-production, log the reset URL for developer testing
  if (!env.BREVO_API_KEY && env.NODE_ENV !== "production") {
    logger.info(`[DEV EMAIL] Password reset URL for ${toEmail}: ${resetUrl}`);
  }

  const { html, text } = buildPasswordResetEmailTemplate(name, resetUrl);

  return sendEmail({
    to: toEmail,
    name,
    subject: "Reset your LifeOS password",
    html,
    text
  });
}

/**
 * Sends a notification to Google-only users attempting a password reset.
 */
export async function sendGoogleAccountNoticeEmail(
  toEmail: string,
  name: string
): Promise<{ sent: boolean }> {
  const { html, text } = buildGoogleAccountNoticeTemplate(name);
  return sendEmail({
    to: toEmail,
    name,
    subject: "Sign-in notice for your LifeOS account",
    html,
    text
  });
}

/**
 * Sends a confirmation email after successful password reset.
 */
export async function sendPasswordChangedConfirmationEmail(
  toEmail: string,
  name: string
): Promise<{ sent: boolean }> {
  const { html, text } = buildPasswordChangedConfirmationTemplate(name);
  return sendEmail({
    to: toEmail,
    name,
    subject: "Your LifeOS password was changed",
    html,
    text
  });
}
