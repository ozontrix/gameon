import { NextRequest, NextResponse } from "next/server";
import { createSmtpTransport, GAMEON_NOTIFICATION_EMAIL, getNotificationRecipients, getSmtpConfig, logSmtpFailure, smtpAcceptedAll } from "@/lib/email/smtp";
import { withRateLimit } from "@/lib/middlewares/rate-limiter";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface NotifyPayload {
  type: "early-access" | "newsletter";
  name?: string;
  email: string;
  phone?: string;
  submittedAt: string;
}


function buildEmailText({ type, name, email, phone, submittedAt }: NotifyPayload) {
  const isNewsletter = type === "newsletter";
  const heading = isNewsletter ? "Newsletter Signup" : "Early Access Request";
  const details = isNewsletter
    ? `Email: ${email}\nForm: Footer · Stay in the loop`
    : `Name: ${name || "—"}\nEmail: ${email}\nPhone: ${phone || "—"}\nForm: Hero · Get Early Access`;

  return `Game On — ${heading}

A new submission just came in from the Game On website:

${details}

Submitted: ${submittedAt} (IST)

— Game On · Where the City Unplugs & GameOn Begins —`;
}

function buildCustomerConfirmation({ type, name }: NotifyPayload) {
  const newsletter = type === "newsletter";
  const title = newsletter ? "You're subscribed to GameOn updates" : "We've received your early access request";
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const message = newsletter
    ? "Thanks for subscribing to GameOn Multi Sports updates. We'll keep you in the loop about upcoming sports, events and venue news."
    : "Thanks for your interest in GameOn Multi Sports. Our team has received your early access request and will share updates with you.";
  const footer = newsletter
    ? `If you didn't request these updates or want to stop receiving them, reply to ${GAMEON_NOTIFICATION_EMAIL}.`
    : `Questions? Reply to ${GAMEON_NOTIFICATION_EMAIL}. This confirms your request, not a paid booking or reserved slot.`;
  return {
    subject: `${title} | GameOn Multi Sports`,
    text: ["GameOn Multi Sports", "", greeting, "", message, "", footer, "", "Team GameOn Multi Sports"].join("\n"),
    html: `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:24px;background:#0B0B0C;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" style="width:100%;max-width:540px;margin:auto;background:#FFFFFF;border-collapse:collapse;"><tr><td style="padding:28px;background:#1A1D23;color:#F38F2F;font-size:24px;font-weight:bold;">GAMEON MULTI SPORTS</td></tr><tr><td style="padding:28px;color:#1A1D23;"><h1 style="font-size:24px;">${escapeHtml(title)}</h1><p>${escapeHtml(greeting)}</p><p style="line-height:1.7;">${escapeHtml(message)}</p><p style="font-size:13px;line-height:1.7;">${escapeHtml(footer)}</p><p>Team GameOn Multi Sports</p></td></tr></table></body></html>`,
  };
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  const incomingOrigin = `${url.protocol}//${req.headers.get("host") || url.host}`;
  if ((origin && origin !== url.origin && origin !== incomingOrigin) || req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false, error: "Please submit this request from our website." }, { status: 403 });
  }
  return withRateLimit(req, { limit: 5, windowMs: 15 * 60_000, keyPrefix: "notify" }, sendNotification);
}

async function sendNotification(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const type: NotifyPayload["type"] = body?.type === "newsletter" ? "newsletter" : "early-access";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (email.length > 254 || !EMAIL_RE.test(email) || name.length > 120 || phone.length > 40 || /[\r\n]/.test(name + phone)) {
      return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
    }

    const smtp = getSmtpConfig();
    if (!smtp) {
      console.error("Notify: SMTP not configured (SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL).");
      return NextResponse.json({ ok: false, error: "Email is not configured." }, { status: 500 });
    }

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const subject =
      type === "newsletter"
        ? `🎉 New newsletter signup — ${email}`
        : `🔥 New early access request — ${name || email}`;

    const transporter = createSmtpTransport(smtp);
    try {
      const staff = getNotificationRecipients();
      const payload = { type, name, email, phone, submittedAt };
      // Separate messages keep staff details private. Both attempts finish even if one fails.
      const results = await Promise.allSettled([
        transporter.sendMail({
          from: smtp.from,
          to: staff.join(", "),
          replyTo: email,
          subject,
          html: buildEmailHtml(payload),
          text: buildEmailText(payload),
        }),
        transporter.sendMail({
          from: smtp.from,
          to: email,
          replyTo: GAMEON_NOTIFICATION_EMAIL,
          ...buildCustomerConfirmation(payload),
        }),
      ]);
      let failed = false;
      results.forEach((result, index) => {
        const expected = index === 0 ? staff : [email];
        if (result.status === "rejected" || !smtpAcceptedAll(result.value.accepted, expected)) {
          failed = true;
          const error = result.status === "rejected" ? result.reason
            : { code: "EENVELOPE", command: "RCPT TO" };
          logSmtpFailure(index === 0 ? "Notify staff notification" : "Notify customer confirmation", error);
        }
      });
      if (failed) return NextResponse.json({ ok: false, error: "Failed to send email." }, { status: 500 });
    } finally {
      transporter.close();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logSmtpFailure("Notify", error);
    return NextResponse.json({ ok: false, error: "Failed to send email." }, { status: 500 });
  }
}


function buildEmailHtml({ type, name, email, phone, submittedAt }: NotifyPayload) {
  const isNewsletter = type === "newsletter";
  const title = isNewsletter ? "Newsletter Signup" : "Early Access Request";

  const rows: Array<[string, string]> = isNewsletter
    ? [
        ["Email", email],
        ["Form", "Footer · Stay in the loop"],
      ]
    : [
        ["Name", name || "—"],
        ["Email", email],
        ["Phone", phone || "—"],
        ["Form", "Hero · Get Early Access"],
      ];

  const rowHtml = rows
    .map(
      ([key, value]) => `<tr><td style="padding:12px 18px;border-bottom:1px solid #efece6;color:#9a9388;font-size:11px;width:110px;vertical-align:top;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">${escapeHtml(
        key
      )}</td><td style="padding:12px 18px;border-bottom:1px solid #efece6;color:#1a1d23;font-size:15px;font-weight:600;vertical-align:top;">${escapeHtml(
        value
      )}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#0B0B0C;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0B0C;padding:36px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #e6e2da;">
          <tr><td style="background:linear-gradient(135deg,#1A1D23 0%,#0B0B0C 100%);padding:30px 32px;text-align:center;">
            <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:2px;color:#FFFFFF;font-family:Arial,sans-serif;">GAME<span style="color:#F38F2F;">ON</span></p>
            <p style="margin:8px 0 0;font-size:12px;color:#F38F2F;text-transform:uppercase;letter-spacing:3px;font-family:Arial,sans-serif;font-weight:700;">${title}</p>
          </td></tr>
          <tr><td style="padding:30px 32px;font-family:Arial,sans-serif;">
            <p style="margin:0 0 18px;font-size:15px;color:#1a1d23;line-height:1.6;">A new submission just came in from the <strong>Game On</strong> website. Here are the details:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e2da;border-radius:12px;overflow:hidden;">${rowHtml}</table>
            <p style="margin:20px 0 0;font-size:13px;color:#9a9388;">Submitted: <strong style="color:#1a1d23;">${escapeHtml(
              submittedAt
            )}</strong> (IST)</p>
          </td></tr>
          <tr><td style="padding:16px 32px 26px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#b3ada3;">— Game On · Where the City Unplugs &amp; GameOn Begins —</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
