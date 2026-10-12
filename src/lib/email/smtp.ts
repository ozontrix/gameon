import 'server-only';
import nodemailer from 'nodemailer';

/** Server-only SMTP settings shared by every GameOn transactional sender. */
export function getSmtpConfig() {
  const host = (process.env.SMTP_HOST ?? 'smtp-relay.brevo.com').trim();
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = (process.env.SMTP_USER ?? '').trim();
  const pass = (process.env.SMTP_PASSWORD ?? '').trim();
  const address = (process.env.SMTP_FROM_EMAIL ?? '').trim();
  const name = (process.env.SMTP_FROM_NAME ?? 'GameOn Multi Sports').trim();

  // Never use the technical SMTP login as the sender or fall back to Gmail.
  if (!host || !user || !pass || !address || !name
    || !Number.isInteger(port) || port < 1 || port > 65535
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
    || /@smtp-brevo\.com$/i.test(address)) return null;

  return { host, port, user, pass, from: { name, address } };
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