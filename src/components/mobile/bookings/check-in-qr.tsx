'use client';

/**
 * The check-in QR card — the web twin of the handset app's
 * `components/bookings/check-in-qr.tsx`.
 *
 * The code carries the booking's full ID, which venue staff scan into
 * `POST /api/v1/admin/bookings/verify-qr`. It is a real QR code, built by the same
 * `qrcode` encoder the handset uses, at the same error-correction level, and drawn
 * as one SVG path — so what a scanner reads here is what it reads on the phone.
 *
 * Error correction is the highest level (H, ~30%) because the brand mark is drawn
 * over the centre of the code.
 */

import { create } from 'qrcode';
import { useMemo } from 'react';

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion } from '../ui';

/** Light modules kept around the code so scanners can find its edges. */
const QUIET_ZONE = 2;

/** One SVG path covering every dark module of a real QR code for `payload`. */
function buildQr(payload: string): { path: string; size: number } {
  const { modules } = create(payload, { errorCorrectionLevel: 'H' });
  const size = modules.size + QUIET_ZONE * 2;

  let path = '';
  for (let row = 0; row < modules.size; row += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (modules.get(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return { path, size };
}

export function CheckInQr({
  payload,
  validTill,
  size = 148,
}: {
  payload: string;
  validTill: string;
  size?: number;
}) {
  const qr = useMemo(() => buildQr(payload), [payload]);
  const centre = qr.size / 2;
  // Covers well under the 30% the H level can recover.
  const logo = qr.size * 0.16;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: Spacing.sm,
        borderRadius: Radius.md,
        border: `1px solid ${Brand.cardBorder}`,
        backgroundColor: Brand.backgroundElement,
        padding: Spacing.md,
      }}>
      <span style={{ ...Typography.label, color: Brand.text }}>Check-in QR Code</span>
      <span style={{ ...Typography.caption, color: Brand.textMuted, textAlign: 'center' }}>
        Show this code at the facility for quick check-in
      </span>

      <div style={{ borderRadius: Radius.sm, padding: Spacing.sm, backgroundColor: Brand.white }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${qr.size} ${qr.size}`}
          role="img"
          aria-label="Check-in QR code for this booking">
          <rect x={0} y={0} width={qr.size} height={qr.size} fill={Brand.white} />
          {/* QR modules must be true black on white to stay scannable. */}
          <path d={qr.path} fill="#000000" />
          <circle cx={centre} cy={centre} r={logo / 2} fill={Brand.accent} />
          <circle cx={centre} cy={centre} r={logo / 4} fill={Brand.white} />
        </svg>
      </div>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.xs }}>
        <Ion name="timeOutline" size={12} color={Brand.textMuted} />
        <span style={{ ...Typography.caption, color: Brand.textMuted }}>
          Valid till {validTill}
        </span>
      </span>
    </div>
  );
}
