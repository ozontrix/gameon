import 'server-only';
import nodemailer from 'nodemailer';

// Dashboard values are sometimes pasted with shell-style surrounding quotes.
function envValue(key: string, fallback = '') {
  const value = (process.env[key] ?? fallback).trim();
  return /^("[\s\S]*"|'[\s\S]*')$/.test(value) ? value.slice(1, -1).trim() : value;
}

/** Server-only SMTP settings shared by every GameOn transactional sender. */
export function getSmtpConfig() {
  const host = envValue('SMTP_HOST', 'smtp-relay.brevo.com');
  const port = Number(envValue('SMTP_PORT', '587'));
  const user = envValue('SMTP_USER');
  const pass = envValue('SMTP_PASSWORD');
  const address = envValue('SMTP_FROM_EMAIL');
  const name = envValue('SMTP_FROM_NAME', 'GameOn Multi Sports');

  // Never use the technical SMTP login as the sender or fall back to Gmail.
  if (!host || !user || !pass || !address || !name
    || !Number.isInteger(port) || port < 1 || port > 65535
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
    || /@smtp-brevo\.com$/i.test(address)
    || [host, user, pass, address, name].some(value => /[\r\n]/.test(value))
    || (host.toLowerCase() === 'smtp-relay.brevo.com' && (pass.startsWith('xkeysib-') || ![587, 465, 2525].includes(port)))) return null;

  return { host, port, user, pass, from: { name, address } };
}

/** Only fixed messages and allowlisted protocol fields leave this helper. Never log raw errors. */
export function getSmtpFailure(error: unknown) {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const codes = ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'EDNS', 'ESOCKET', 'ECONNREFUSED', 'ECONNRESET', 'EENVELOPE', 'EMESSAGE', 'ETLS'];
  const code = typeof details.code === 'string' && codes.includes(details.code) ? details.code : 'UNKNOWN';
  const responseCode = typeof details.responseCode === 'number' && Number.isInteger(details.responseCode)
    && details.responseCode >= 400 && details.responseCode <= 599 ? details.responseCode : undefined;
  const commands = ['CONN', 'EHLO', 'HELO', 'STARTTLS', 'AUTH', 'AUTH LOGIN', 'AUTH PLAIN', 'AUTH CRAM-MD5', 'MAIL FROM', 'RCPT TO', 'DATA'];
  const command = typeof details.command === 'string' && commands.includes(details.command) ? details.command : undefined;
  // Inspect provider text for classification, but do not return it: it may contain PII or secrets.
  const response = typeof details.response === 'string' ? details.response.toLowerCase() : '';
  let reason = 'UNKNOWN';
  let message = 'Email delivery failed. Check Brevo transactional logs for this attempt.';
  if (responseCode === 525 || /unauthorized ip|ip address.*not authorized/.test(response)) {
    reason = 'IP_NOT_AUTHORIZED';
    message = 'Brevo blocked the server IP. Authorize the production outbound IP in Brevo SMTP security settings.';
  } else if (code === 'EAUTH' || responseCode === 535) {
    reason = 'AUTHENTICATION';
    message = 'SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD; use a Brevo SMTP key, not an API key.';
  } else if (/credit|quota|daily limit|sending limit/.test(response)) {
    reason = 'SENDING_LIMIT';
    message = 'Brevo sending limit reached. Check transactional credits and sending limits.';
  } else if (/suspend|not activat|disabled|not enabled/.test(response)) {
    reason = 'ACCOUNT_RESTRICTED';
    message = 'Brevo transactional sending is inactive or restricted. Check the account status in Brevo.';
  } else if (/sender|from address|from email|domain.*(verif|authentic)/.test(response) || (command === 'MAIL FROM' && (responseCode ?? 0) >= 500)) {
    reason = 'SENDER_REJECTED';
    message = 'Brevo rejected the sender. Verify SMTP_FROM_EMAIL and authenticate its exact domain in Brevo.';
  } else if (code === 'ETLS') {
    reason = 'TLS';
    message = 'SMTP TLS negotiation failed. Check the SMTP host, port and certificate configuration.';
  } else if (['ECONNECTION', 'ETIMEDOUT', 'EDNS', 'ESOCKET', 'ECONNREFUSED', 'ECONNRESET'].includes(code)) {
    reason = 'CONNECTION';
    message = 'SMTP connection failed. Check production network access and SMTP_HOST/SMTP_PORT (Brevo: 587, 465 or 2525).';
  } else if (code === 'EENVELOPE' || command === 'RCPT TO') {
    reason = 'RECIPIENT_REJECTED';
    message = 'SMTP rejected the recipient. Check the recipient address and Brevo blocked-contact logs.';
  } else if (responseCode && responseCode < 500) {
    reason = 'TEMPORARY_REJECTION';
    message = 'SMTP temporarily rejected the email. Check Brevo status and retry from the admin panel.';
  }
  return { reason, code, responseCode, command, message };
}

export function logSmtpFailure(context: string, error: unknown) {
  const failure = getSmtpFailure(error);
  console.error(`${context}: email delivery failed.`, failure);
  const status = failure.responseCode ? `, SMTP ${failure.responseCode}` : '';
  return `${failure.message} (${failure.code}${status})`;
}

export function createSmtpTransport(config: NonNullable<ReturnType<typeof getSmtpConfig>>) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    dnsTimeout: 10000,
  });
}