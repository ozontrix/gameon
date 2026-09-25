import nodemailer from "nodemailer";
import { formatINR } from "@/components/league/data";
import {
  LEAGUE_HELP_EMAIL,
  LEAGUE_HELP_PHONE,
  LEAGUE_NAME,
  LEAGUE_VENUE,
  matchDayLabel,
} from "./constants";
import type { LeagueConfirmation } from "./confirmation";
import { confirmationBrackets } from "./confirmation";

/**
 * The paid-entry confirmation email.
 *
 * Sent from the SMTP account in `.env.local` (the same Gmail transport the
 * notify route uses). Table-based, inline-styled HTML so it survives Outlook and
 * Gmail, with the club's own copy BCC'd so the desk sees every entry.
 */

const SMTP_USER = process.env.SMTP_USER ?? "";
// Gmail app passwords are 16 chars; strip any spaces that may have been typed.
const SMTP_APP_PASSWORD = (process.env.SMTP_APP_PASSWORD ?? "").replace(/\s+/g, "");
const CLUB_RECIPIENTS = (process.env.NOTIFY_RECIPIENTS ?? "")
  .split(",")
  .map((address) => address.trim())
  .filter(Boolean);

const FONT = "Arial,Helvetica,sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const LABEL_STYLE =
  "padding:11px 16px;border-bottom:1px solid #efece6;color:#9a9388;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;width:138px;vertical-align:top;";
const VALUE_STYLE =
  "padding:11px 16px;border-bottom:1px solid #efece6;color:#1a1d23;font-size:14px;font-weight:600;vertical-align:top;";

function row(label: string, value: string, strong = false): string {
  const labelStyle = strong ? LABEL_STYLE.replace("border-bottom:1px solid #efece6;", "") : LABEL_STYLE;
  const valueStyle = strong
    ? `${VALUE_STYLE.replace("border-bottom:1px solid #efece6;", "")}font-size:17px;color:#0b0b0c;`
    : VALUE_STYLE;
  return `<tr><td style="${labelStyle}">${escapeHtml(label)}</td><td style="${valueStyle}">${escapeHtml(
    value
  )}</td></tr>`;
}

/** A titled, bordered block — the pass, the price breakdown, the add-ons. */
function block(title: string, rows: string, marginBottom = 22): string {
  return `<p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:#9a9388;font-family:${FONT};">${escapeHtml(
    title
  )}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e2da;border-radius:14px;overflow:hidden;margin-bottom:${marginBottom}px;">${rows}</table>`;
}

interface EmailContext {
  greeting: string;
  day: string;
  /** Every bracket in the entry — "Men's Singles + Men's Doubles". */
  brackets: string;
  tickets: string;
  passRows: string;
  addOnRows: string;
  priceRows: string;
}

function describe(confirmation: LeagueConfirmation): EmailContext {
  const { entry, quote } = confirmation;
  const day = matchDayLabel(entry.date);
  const brackets = confirmationBrackets(entry);

  return {
    greeting: entry.teamName ? `Team ${entry.teamName}` : entry.captainName.split(" ")[0],
    day,
    brackets,
    tickets: entry.squadSize > 1 ? `${entry.squadSize} tickets` : "1 ticket",
    passRows: [
      row("Player", entry.captainName),
      entry.teamName ? row("Team", entry.teamName) : "",
      row("Sport", entry.sportName),
      row("Category", brackets),
      row("Match day", day),
      row("Entry", `${entry.squadSize > 1 ? `${entry.squadSize} tickets` : "1 ticket"} · one pass per player`),
      row("Venue", LEAGUE_VENUE),
      row("Reference", confirmation.reference),
    ].join(""),
    addOnRows: entry.addons
      .map((addOn) => row(`${addOn.emoji} ${addOn.name} × ${addOn.qty}`, formatINR(addOn.amount)))
      .join(""),
    priceRows: [
      row(`Entry fee · ${brackets}`, formatINR(quote.entryFee)),
      quote.addOnsTotal > 0 ? row("Add-ons", formatINR(quote.addOnsTotal)) : "",
      quote.discount > 0 && quote.couponCode
        ? row(`Discount · ${quote.couponCode}`, `- ${formatINR(quote.discount)}`)
        : "",
      row("Total paid", formatINR(confirmation.amount), true),
    ].join(""),
  };
}

/** The card body: greeting, pass, add-ons, price, next steps and the CTA. */
function bodyHtml(confirmation: LeagueConfirmation, context: EmailContext): string {
  const { entry } = confirmation;

  const addOns = context.addOnRows ? block("Add-ons", context.addOnRows) : "";

  return `<tr><td style="padding:26px 30px 6px;font-family:${FONT};">
            <p style="margin:0 0 15px;font-size:15px;color:#1a1d23;line-height:1.6;">Hi <strong>${escapeHtml(
              context.greeting
            )}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#4a4a4a;line-height:1.7;">Your spot in the <strong>${escapeHtml(
              entry.sportName
            )} &middot; ${escapeHtml(
              context.brackets
            )}</strong> bracket on <strong>${escapeHtml(
              context.day
            )}</strong> is locked in. Here is everything you need on match day &mdash; keep this email handy or show the reference at the front desk.</p>

            ${block("Your entry pass", context.passRows)}
            ${addOns}
            ${block("Payment summary", context.priceRows, 24)}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f4;border-radius:14px;margin-bottom:24px;">
              <tr><td style="padding:18px 20px;font-family:${FONT};">
                <p style="margin:0 0 12px;font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:#9a9388;">What happens next</p>
                <p style="margin:0 0 9px;font-size:13px;color:#1a1d23;line-height:1.6;"><strong style="color:#F38F2F;">1.</strong> We schedule your exact match timing &mdash; it reaches you on WhatsApp <strong>24 hours before</strong> ${escapeHtml(
                  context.day
                )}.</p>
                <p style="margin:0 0 9px;font-size:13px;color:#1a1d23;line-height:1.6;"><strong style="color:#F38F2F;">2.</strong> Reach ${escapeHtml(
                  LEAGUE_VENUE
                )} 15 minutes early with a photo ID.</p>
                <p style="margin:0;font-size:13px;color:#1a1d23;line-height:1.6;"><strong style="color:#F38F2F;">3.</strong> Need to change plans? Cancellations are fully refunded up to 72 hours before your match day.</p>
              </td></tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 26px;">
              <tr><td align="center" style="border-radius:999px;background-color:#F38F2F;">
                <a href="https://game-on.in/gameon-multisports-league/bookings" style="display:inline-block;padding:14px 34px;font-family:${FONT};font-size:14px;font-weight:800;color:#0B0B0C;text-decoration:none;letter-spacing:0.6px;">View my entry</a>
              </td></tr>
            </table>
          </td></tr>`;
}

/** The outer card: brand header, orange confirmation banner, body, footer. */
function shellHtml(confirmation: LeagueConfirmation, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#0B0B0C;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0B0C;padding:34px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:22px;overflow:hidden;border:1px solid #e6e2da;">
          <tr><td style="background:linear-gradient(135deg,#1A1D23 0%,#0B0B0C 100%);padding:28px 30px 22px;text-align:center;">
            <p style="margin:0;font-size:25px;font-weight:800;letter-spacing:2px;color:#FFFFFF;font-family:${FONT};">GAME<span style="color:#F38F2F;">ON</span></p>
            <p style="margin:8px 0 0;font-size:10px;color:#F38F2F;text-transform:uppercase;letter-spacing:3px;font-family:${FONT};font-weight:700;">${escapeHtml(
              LEAGUE_NAME
            )}</p>
          </td></tr>
          <tr><td style="background-color:#F38F2F;padding:15px 30px;text-align:center;">
            <p style="margin:0;font-size:19px;font-weight:800;color:#0B0B0C;font-family:${FONT};">You&rsquo;re in &mdash; entry confirmed 🎉</p>
            <p style="margin:6px 0 0;font-size:12px;color:#3b2a05;font-family:${FONT};">Paid ${escapeHtml(
              formatINR(confirmation.amount)
            )} &middot; Razorpay ${escapeHtml(confirmation.paymentId)}</p>
          </td></tr>
          ${body}
          <tr><td style="padding:0 30px 26px;font-family:${FONT};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #efece6;">
              <tr><td style="padding-top:18px;">
                <p style="margin:0 0 6px;font-size:12px;color:#1a1d23;font-weight:700;">${escapeHtml(
                  LEAGUE_VENUE
                )}</p>
                <p style="margin:0 0 6px;font-size:12px;color:#9a9388;">Front desk ${escapeHtml(
                  LEAGUE_HELP_PHONE
                )} &middot; ${escapeHtml(LEAGUE_HELP_EMAIL)}</p>
                <p style="margin:0;font-size:12px;color:#b3ada3;">See you on court &mdash; Game On Multi Sports</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function buildText(confirmation: LeagueConfirmation, context: EmailContext): string {
  const { entry } = confirmation;

  return [
    `${LEAGUE_NAME} — entry confirmed`,
    "",
    `Hi ${context.greeting},`,
    `Your ${entry.sportName} · ${context.brackets} entry on ${context.day} is locked in.`,
    "",
    `Reference: ${confirmation.reference}`,
    `Venue: ${LEAGUE_VENUE}`,
    `Match day: ${context.day}`,
    `Entry: ${context.tickets} (one pass per player)`,
    entry.teamName ? `Team: ${entry.teamName}` : "",
    `Player: ${entry.captainName}`,
    "",
    ...entry.addons.map((addOn) => `${addOn.name} × ${addOn.qty} — ${formatINR(addOn.amount)}`),
    `Total paid: ${formatINR(confirmation.amount)}`,
    `Razorpay payment id: ${confirmation.paymentId}`,
    "",
    `Your exact match timing is shared on WhatsApp 24 hours before ${context.day}.`,
    "Reach the venue 15 minutes early with a photo ID.",
    "Free cancellation up to 72 hours before your match day.",
    "",
    `Front desk ${LEAGUE_HELP_PHONE} · ${LEAGUE_HELP_EMAIL}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function renderLeagueConfirmationEmail(confirmation: LeagueConfirmation) {
  const context = describe(confirmation);

  return {
    subject: `You're in! ${confirmation.entry.sportName} · ${confirmationBrackets(confirmation.entry)} — ${confirmation.reference}`,
    html: shellHtml(confirmation, bodyHtml(confirmation, context)),
    text: buildText(confirmation, context),
  };
}

/** Sends the confirmation. Never throws — a failed mail must not fail a payment. */
export async function sendLeagueConfirmationEmail(
  confirmation: LeagueConfirmation
): Promise<{ sent: boolean; error?: string }> {
  if (!SMTP_USER || !SMTP_APP_PASSWORD) {
    console.error("League email: SMTP is not configured (SMTP_USER, SMTP_APP_PASSWORD).");
    return { sent: false, error: "SMTP not configured" };
  }

  try {
    const { subject, html, text } = renderLeagueConfirmationEmail(confirmation);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"${LEAGUE_NAME}" <${SMTP_USER}>`,
      to: confirmation.entry.email,
      bcc: CLUB_RECIPIENTS.length ? CLUB_RECIPIENTS.join(", ") : undefined,
      replyTo: LEAGUE_HELP_EMAIL,
      subject,
      html,
      text,
    });

    return { sent: true };
  } catch (error) {
    console.error("League confirmation email failed:", error);
    return { sent: false, error: error instanceof Error ? error.message : "Send failed" };
  }
}
