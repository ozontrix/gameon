import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const SMTP_USER = process.env.SMTP_USER ?? "";
// Gmail app passwords are 16 chars; strip any spaces the user may have typed.
const SMTP_APP_PASSWORD = (process.env.SMTP_APP_PASSWORD ?? "").replace(/\s+/g, "");
const RECIPIENTS = (process.env.NOTIFY_RECIPIENTS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const type: NotifyPayload["type"] = body?.type === "newsletter" ? "newsletter" : "early-access";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
    }

    if (!SMTP_USER || !SMTP_APP_PASSWORD || RECIPIENTS.length === 0) {
      console.error("Notify: SMTP not configured (SMTP_USER, SMTP_APP_PASSWORD, NOTIFY_RECIPIENTS).");
      return NextResponse.json({ ok: false, error: "Email is not configured." }, { status: 500 });
    }

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const subject =
      type === "newsletter"
        ? `🎉 New newsletter signup — ${email}`
        : `🔥 New early access request — ${name || email}`;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"Game On" <${SMTP_USER}>`,
      to: RECIPIENTS.join(", "),
      replyTo: email,
      subject,
      html: buildEmailHtml({ type, name, email, phone, submittedAt }),
      text: buildEmailText({ type, name, email, phone, submittedAt }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notify email error:", err);
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
            <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:2px;color:#FFFFFF;font-family:Arial,sans-serif;">GAME<span style="color:#F28218;">ON</span></p>
            <p style="margin:8px 0 0;font-size:12px;color:#F28218;text-transform:uppercase;letter-spacing:3px;font-family:Arial,sans-serif;font-weight:700;">${title}</p>
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
