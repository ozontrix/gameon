import nodemailer from "nodemailer";
import { ACCOUNT_DELETION_EMAIL, deletionReplyEmail, type AccountDeletionInput } from "./account-deletion";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderDeletionEmail(input: AccountDeletionInput, reference: string, submittedAt: string, copy = false) {
  const title = copy ? "Your account deletion request" : "New account deletion request";
  const introduction = copy
    ? "We received your request to delete your Game On account and related personal information. This is a copy of your submission, not confirmation that your account has been deleted. Our team will review the request and may contact you to verify account ownership."
    : "A user submitted an account and related-information deletion request. Verify account ownership before taking any action. This form does not authenticate the requester or automatically delete data.";
  const rows = [
    ["Request reference", reference],
    ["Account identifier type", input.accountType === "email" ? "Email" : "Phone number"],
    ["Account identifier", input.identifier],
    ["Contact / copy email", deletionReplyEmail(input)],
    ["Submitted at", submittedAt],
    ["Request message", input.message],
  ];
  const text = [title, "", introduction, "", ...rows.map(([label, value]) => `${label}: ${value}`), "",
    `Questions or corrections? Reply to ${ACCOUNT_DELETION_EMAIL} and include your reference.`].join("\n");
  const html = `<!DOCTYPE html><html lang="en"><body style="margin:0;background:#0B0B0C;padding:24px;font-family:Arial,sans-serif;">
    <table role="presentation" style="width:100%;max-width:600px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;">
      <tr><td style="padding:24px;background:#1A1D23;color:#F38F2F;font-size:22px;font-weight:bold;">GAME ON</td></tr>
      <tr><td style="padding:24px;color:#1A1D23;"><h1 style="font-size:22px;">${title}</h1><p style="line-height:1.6;">${introduction}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;">${rows.map(([label, value]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #ddd;vertical-align:top;font-size:12px;width:35%;">${escapeHtml(label)}</td><td style="padding:12px;border-bottom:1px solid #ddd;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;">${escapeHtml(value)}</td></tr>`).join("")}</table>
        <p style="font-size:13px;line-height:1.6;">Questions or corrections? Reply to ${ACCOUNT_DELETION_EMAIL} and include your reference.</p>
      </td></tr>
    </table></body></html>`;
  return { subject: `${title} · ${reference}`, text, html };
}

/** Send the staff request first. A failed user copy must not lose an accepted request. */
export async function sendAccountDeletionRequest(input: AccountDeletionInput, reference: string) {
  const user = process.env.SMTP_USER ?? "";
  const pass = (process.env.SMTP_APP_PASSWORD ?? "").replace(/\s+/g, "");
  if (!user || !pass) return { accepted: false, copySent: false, unavailable: true };

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  });
  const from = { name: "Game On · Account Support", address: user };
  const replyEmail = deletionReplyEmail(input);
  const submittedAt = `${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`;
  try {
    const staff = await transport.sendMail({
      from, to: ACCOUNT_DELETION_EMAIL, replyTo: replyEmail,
      ...renderDeletionEmail(input, reference, submittedAt),
    });
    if (!staff.accepted?.length) return { accepted: false, copySent: false, unavailable: false };
    try {
      const copy = await transport.sendMail({
        from, to: replyEmail, replyTo: ACCOUNT_DELETION_EMAIL,
        ...renderDeletionEmail(input, reference, submittedAt, true),
      });
      return { accepted: true, copySent: Boolean(copy.accepted?.length), unavailable: false };
    } catch {
      return { accepted: true, copySent: false, unavailable: false };
    }
  } catch {
    // Avoid logging account identifiers, request messages or SMTP credentials.
    console.error("Account deletion: request email could not be accepted by SMTP.");
    return { accepted: false, copySent: false, unavailable: false };
  } finally {
    transport.close();
  }
}