import type { QrCategory } from '../whatsapp/qr';

export type ConfirmationDetails = {
  category: QrCategory; id: string; name: string; title: string; date: string; time: string;
  venue: string; address: string; timezone: string; amount: number; paymentStatus: string;
  extras: [string, string][];
};
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** Email-client-safe tables, inline styling, readable text alternative, private inline QR. */
export function bookingConfirmationTemplate(details: ConfirmationDetails) {
  const kind = { booking: 'Slot booking', event: 'Event registration', tournament: 'Tournament registration' }[details.category];
  const heading = `${kind} confirmed`;
  const reference = `#${details.id.slice(0, 8).toUpperCase()}`;
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(details.amount);
  const rows: [string, string][] = [
    ['Reference', reference], ['Booking ID', details.id], ['Activity', details.title], ['Date', details.date],
    ['Time', `${details.time} (${details.timezone})`], ['Venue', details.venue], ['Address', details.address],
    ...details.extras, ['Booking total', amount], ['Payment', details.paymentStatus === 'PAID' ? 'Paid / settled' : 'Payment due at venue'],
  ];
  const intro = `Hi ${details.name}, your ${kind.toLowerCase()} is confirmed. We look forward to seeing you at GameOn.`;
  const note = 'Show this QR or your booking in the GameOn app at check-in. Keep your entry QR private. For changes or cancellation terms, open your booking in the app or reply to this email.';
  const htmlRows = rows.filter(([, value]) => value).map(([label, value]) => `<tr><td style="padding:11px 12px;border-bottom:1px solid #e8e4df;color:#655e58;font-size:13px;vertical-align:top;width:32%">${escape(label)}</td><td style="padding:11px 12px;border-bottom:1px solid #e8e4df;color:#191512;font-size:14px;word-break:break-word">${escape(value)}</td></tr>`).join('');
  return {
    subject: `GameOn | ${heading} ${reference}`,
    text: `${heading}\n\n${intro}\n\n${rows.filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${note}\n\nGameOn Multi Sports\ninfo@gameonmultisports.com`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f3f0eb;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escape(heading)} — ${escape(details.title)} — ${escape(details.date)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden"><tr><td style="background:#17120f;color:#ffb35c;padding:26px;font-size:25px;font-weight:bold">GAMEON <span style="font-size:12px;color:#ffffff">MULTI SPORTS</span></td></tr><tr><td style="padding:26px"><p style="color:#247345;font-size:12px;font-weight:bold;letter-spacing:1px">YOU’RE CONFIRMED</p><h1 style="font-size:25px;line-height:1.25;color:#191512">${escape(heading)}</h1><p style="font-size:15px;line-height:1.65;color:#514940">${escape(intro)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e4df;border-radius:8px">${htmlRows}</table><div style="text-align:center;padding:24px 0"><img src="cid:booking-qr" width="200" height="200" alt="Private entry QR. Your booking ID is listed above." style="max-width:100%;height:auto"><p style="font-size:13px;font-weight:bold;color:#191512">Your entry QR · ${escape(reference)}</p></div><p style="font-size:14px;line-height:1.7;color:#514940">${escape(note)}</p><p style="font-size:14px;line-height:1.7">Need help? <a href="mailto:info@gameonmultisports.com" style="color:#a34f06">Contact GameOn</a></p></td></tr><tr><td style="padding:20px 26px;background:#faf8f5;color:#71665b;font-size:12px;line-height:1.6">This transactional confirmation relates to your GameOn booking, not a marketing subscription. Booking status in the app is authoritative.</td></tr></table></td></tr></table></body></html>`,
  };
}