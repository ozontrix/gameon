import type { WhatsAppConfig } from './config';

/** The five body variables the approved `booking_with_qr_new` template expects. */
export const TEMPLATE_BODY_PARAMS = ['customer_name', 'booking_id', 'sport', 'booking_date', 'booking_time'] as const;

export type TemplateParams = {
  to: string;
  mediaId: string;
  customerName: string;
  bookingId: string;
  sport: string;
  date: string;
  time: string;
};

/**
 * WhatsApp rejects a parameter that is empty, over 1024 characters, or padded
 * with whitespace, and a rejection is reported against the whole message. So
 * every value is collapsed and given a stand-in rather than dropped.
 */
export function templateValue(value: string | null | undefined, fallback = '—'): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 1024) : fallback;
}

/** `"2026-09-28"` → `"28 September 2026"`, exactly as the template's sample shows. */
export function longDate(date: string | null | undefined): string {
  if (!date) return '';
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(Date.UTC(year, month - 1, day))
    .toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
}

/** `19:00:00`–`20:00:00` → `"7:00 PM - 8:00 PM"`. */
export function bookingTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return '';
  return `${clock(start)} - ${clock(end)}`;
}

function clock(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = Number(hours);
  if (!Number.isFinite(hour)) return time;
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/**
 * The message body. Named parameters are used because that is how the template
 * on Meta is defined — the `parameter_name` has to match the placeholder name.
 */
export function buildTemplatePayload(config: WhatsAppConfig, params: TemplateParams) {
  const body: Record<string, string> = {
    customer_name: params.customerName,
    booking_id: params.bookingId,
    sport: params.sport,
    booking_date: params.date,
    booking_time: params.time,
  };

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: params.to,
    type: 'template',
    template: {
      name: config.templateName,
      language: { code: config.language },
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { id: params.mediaId } }] },
        {
          type: 'body',
          parameters: TEMPLATE_BODY_PARAMS.map((name) => ({
            type: 'text',
            parameter_name: name,
            text: templateValue(body[name]),
          })),
        },
      ],
    },
  } as const;
}
