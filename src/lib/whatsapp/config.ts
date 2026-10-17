import 'server-only';

// Dashboard values are sometimes pasted with shell-style surrounding quotes.
function envValue(key: string, fallback = '') {
  const value = (process.env[key] ?? fallback).trim();
  return /^("[\s\S]*"|'[\s\S]*')$/.test(value) ? value.slice(1, -1).trim() : value;
}

/** Reads one WhatsApp setting, for callers that need it before the config is usable. */
export function whatsAppEnv(key: string, fallback = ''): string {
  return envValue(key, fallback);
}

/** The template approved on Meta for booking confirmations. */
export const DEFAULT_WHATSAPP_TEMPLATE = 'booking_with_qr_new';

/**
 * Meta retires Graph API versions roughly two years after release. Override
 * `WHATSAPP_API_VERSION` with the version shown in the Cloud API dashboard.
 */
export const DEFAULT_WHATSAPP_VERSION = 'v25.0';

/** Uploaded media ids expire after 30 days; refresh well before that. */
export const WHATSAPP_MEDIA_MAX_AGE_DAYS = 25;

export type WhatsAppConfig = {
  /** Authorized user/system-user access token. Never logged or sent to the client. */
  token: string;
  phoneNumberId: string;
  /** e.g. `v22.0`, substituted for `{{Version}}` in the Graph URL. */
  version: string;
  templateName: string;
  language: string;
  /** India-only booking recipients, digits only. */
  countryCode: string;
  verifyToken: string | null;
  appSecret: string | null;
};

/**
 * The server-only Cloud API settings. Returns `null` when the integration
 * cannot work — a missing token or malformed phone number id — so callers skip sending instead of failing a
 * booking. Mirrors `getSmtpConfig`.
 */
export function getWhatsAppConfig(): WhatsAppConfig | null {
  const token = envValue('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = envValue('WHATSAPP_PHONE_NUMBER_ID');
  const version = envValue('WHATSAPP_API_VERSION', DEFAULT_WHATSAPP_VERSION);
  const templateName = envValue('WHATSAPP_TEMPLATE_NAME', DEFAULT_WHATSAPP_TEMPLATE);
  const language = envValue('WHATSAPP_TEMPLATE_LANGUAGE', 'en');
  const countryCode = '91';
  const verifyToken = envValue('WHATSAPP_VERIFY_TOKEN') || null;
  const appSecret = envValue('WHATSAPP_APP_SECRET') || null;

  if (!token || !/^\d+$/.test(phoneNumberId) || !/^[a-z0-9_]+$/.test(templateName) || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)) return null;
  if (!/^v\d{1,2}\.\d$/.test(version)) return null;
  // The header is generated from each booking, never from a shared image/id.
  if ([token, phoneNumberId, templateName, language].some((value) => /[\r\n]/.test(value))) return null;

  return {
    token,
    phoneNumberId,
    version,
    templateName,
    language,
    countryCode,
    verifyToken,
    appSecret,
  };
}

/** The Graph endpoint a message is posted to. */
export function messagesUrl(config: Pick<WhatsAppConfig, 'version' | 'phoneNumberId'>): string {
  return `https://graph.facebook.com/${config.version}/${config.phoneNumberId}/messages`;
}

/** The Graph endpoint media is uploaded to. */
export function mediaUrl(config: Pick<WhatsAppConfig, 'version' | 'phoneNumberId'>): string {
  return `https://graph.facebook.com/${config.version}/${config.phoneNumberId}/media`;
}
