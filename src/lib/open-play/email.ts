import 'server-only';
import nodemailer from 'nodemailer';
import { OPEN_PLAY_DATE_LABEL, OPEN_PLAY_MAP_URL, OPEN_PLAY_PHONE, OPEN_PLAY_SPORTS, OPEN_PLAY_VENUE, PAID_PLAY_DATE_LABEL } from './constants';
import type { OpenPlayRegistration } from './server';

const HELP_EMAIL = 'info@gameonmultisports.com';
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderOpenPlayConfirmationEmail(registration: OpenPlayRegistration) {
  const sport = OPEN_PLAY_SPORTS.find(item => item.id === registration.sport)?.name ?? registration.sport;
  const reference = `OP-${registration.id.slice(0, 8).toUpperCase()}`;
  const rows = [['Preferred sport', sport], ['When', OPEN_PLAY_DATE_LABEL], ['Where', OPEN_PLAY_VENUE], ['City / neighbourhood', registration.city], ['Playing fee', '₹0 — free open play'], ['Registration reference', reference]];
  const text = [
    'GameOn Multi Sports', 'Your Sunday. On us.', '', `Hi ${registration.full_name},`, '',
    `You're on the list! Your ${sport} open play registration has been saved.`, '',
    ...rows.map(([label, value]) => `${label}: ${value}`), '',
    'The team will share exact open play timings using your registered contact details.',
    'This registers your interest, not a private court or a timed slot. Playing turns will be coordinated at the venue. No payment is needed.', '',
    'Stay for the evening vibe: a DJ party, pizza party and coffee party, with a little dandiya too.',
    'Free access refers to sports open play. Exact evening timings and food & beverage arrangements will be shared by the team.', '',
    `Get directions: ${OPEN_PLAY_MAP_URL}`, 'Save the date: https://game-on.in/open-play/october-18.ics',
    `Paid court booking slots start from ${PAID_PLAY_DATE_LABEL}.`, '',
    `Questions? Reply to ${HELP_EMAIL} or call ${OPEN_PLAY_PHONE}.`, '',
    'See you on the courts,', 'Team GameOn Multi Sports',
  ].join('\n');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#0B0B0C;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">Your free ${escapeHtml(sport)} open play registration for October 18 is saved.</div>
    <table role="presentation" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:#FFFFFF;">
      <tr><td style="padding:30px;background:#171719;color:#F3F2ED;"><p style="margin:0;font-size:20px;font-weight:bold;">GAME<span style="color:#F38F2F;">ON</span> <span style="font-size:12px;">MULTI SPORTS</span></p><p style="margin:26px 0 0;color:#F38F2F;font-size:12px;letter-spacing:2px;">FREE OPEN PLAY · 18 OCTOBER 2026</p><h1 style="margin:12px 0 0;font-size:40px;line-height:1.12;">YOUR SUNDAY.<br><span style="color:#F38F2F;">ON US.</span></h1></td></tr>
      <tr><td style="padding:28px;color:#1A1D23;"><p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(registration.full_name)},</p><h2 style="font-size:24px;margin:0 0 12px;">You’re on the list.</h2><p style="font-size:15px;line-height:1.7;">Your <strong>${escapeHtml(sport)}</strong> open play registration has been saved. We can’t wait to get your game on.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;">${rows.map(([label, value]) => `<tr><td style="width:34%;padding:12px 0;border-bottom:1px solid #E8E8E8;vertical-align:top;font-size:12px;color:#555;">${escapeHtml(label)}</td><td style="padding:12px;border-bottom:1px solid #E8E8E8;font-size:14px;overflow-wrap:anywhere;">${escapeHtml(value)}</td></tr>`).join('')}</table>
        <p style="font-size:14px;line-height:1.7;">The team will share exact timings using your registered contact details. This is an open play registration, <strong>not a private court booking or a reserved timed slot</strong>. Playing turns will be coordinated at the venue. No payment is needed.</p>
        <table role="presentation" style="width:100%;background:#FFF4E8;"><tr><td style="padding:18px;"><h3 style="margin:0;font-size:17px;">Good games. Great afters.</h3><p style="font-size:14px;line-height:1.7;margin:10px 0;">Stay for the evening DJ party, pizza party and coffee party — with a little dandiya too.</p><p style="font-size:12px;line-height:1.6;margin:0;color:#555;">Free access refers to sports open play. Evening timings and food &amp; beverage arrangements will be shared by the team.</p></td></tr></table>
        <p style="margin:26px 0;"><a href="${escapeHtml(OPEN_PLAY_MAP_URL)}" style="display:inline-block;background:#F38F2F;color:#0B0B0C;padding:14px 22px;text-decoration:none;font-size:15px;font-weight:bold;border-radius:10px;">Get directions →</a></p><p style="font-size:14px;"><a href="https://game-on.in/open-play/october-18.ics" style="color:#8F4300;">Save October 18 to your calendar</a></p>
        <p style="font-size:14px;line-height:1.7;">Keep the game going: paid court booking slots start from <strong>${PAID_PLAY_DATE_LABEL}</strong>.</p><p style="font-size:14px;line-height:1.7;">See you on the courts,<br><strong>Team GameOn Multi Sports</strong></p>
      </td></tr><tr><td style="padding:22px 28px;background:#F3F2ED;color:#555;font-size:12px;line-height:1.8;">Questions? Reply to <a href="mailto:${HELP_EMAIL}" style="color:#8F4300;">${HELP_EMAIL}</a> or call <a href="tel:+917494825740" style="color:#8F4300;">${OPEN_PLAY_PHONE}</a>.<br>This is your event registration confirmation, not a marketing subscription.</td></tr>
    </table></body></html>`;
  return { subject: `You're on the list! ${sport} Open Play · 18 October | GameOn Multi Sports`, text, html };
}

/** SMTP failure must never invalidate a saved attendee registration. */
export async function sendOpenPlayConfirmationEmail(registration: OpenPlayRegistration): Promise<{ sent: boolean; error?: string }> {
  const user = process.env.SMTP_USER ?? '';
  const pass = (process.env.SMTP_APP_PASSWORD ?? '').replace(/\s+/g, '');
  if (!user || !pass) return { sent: false, error: 'SMTP not configured' };
  if (!registration.email) return { sent: false, error: 'No email on this registration' };
  const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000, dnsTimeout: 8000 });
  try {
    const result = await transport.sendMail({ from: { name: 'GameOn Multi Sports', address: user }, to: registration.email, replyTo: HELP_EMAIL, ...renderOpenPlayConfirmationEmail(registration) });
    return result.accepted?.length ? { sent: true } : { sent: false, error: 'SMTP did not accept the confirmation recipient' };
  } catch {
    console.error('Open play: confirmation email was not accepted by SMTP.');
    return { sent: false, error: 'Confirmation email delivery failed' };
  } finally { transport.close(); }
}