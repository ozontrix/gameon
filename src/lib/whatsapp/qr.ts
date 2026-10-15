import QRCode from 'qrcode';
import { z } from 'zod';

export type QrCategory = 'booking' | 'event' | 'tournament';

/** Court payloads remain compatible with the mobile app and desk scanner. */
export function checkInPayload(category: QrCategory, id: string): string {
  const uuid = z.string().uuid().parse(id);
  return category === 'booking' ? uuid : `gameon:${category}:${uuid}`;
}

/** Generated privately, in memory. No third-party QR service or public URL. */
export async function generateBookingQr(category: QrCategory, id: string) {
  const payload = checkInPayload(category, id);
  const bytes = await QRCode.toBuffer(payload, {
    type: 'png', width: 640, margin: 4, errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
  return { bytes: new Uint8Array(bytes), type: 'image/png', filename: `${category}-${id}.png` };
}