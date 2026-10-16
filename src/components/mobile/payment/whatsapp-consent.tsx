'use client';

/**
 * The WhatsApp consent row at checkout — the web twin of the app
 * `components/payment/whatsapp-consent.tsx`.
 *
 * It is a consent, not a preference: it is sent with the hold and recorded on the
 * booking, so the player can be messaged about this slot.
 */

import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion } from '../ui';

export function WhatsAppConsent({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: Spacing.md,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}>
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        style={{
          width: 20,
          height: 20,
          marginTop: 2,
          flexShrink: 0,
          accentColor: Brand.accent,
          cursor: disabled ? 'default' : 'pointer',
        }}
      />

      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.xs }}>
          <Ion name="logoWhatsapp" size={14} color={Brand.success} />
          <span style={{ ...Typography.label, color: Brand.text }}>
            Send me booking updates on WhatsApp
          </span>
        </span>
        <span style={{ ...Typography.caption, color: Brand.textMuted }}>
          Your confirmation, reminders and the venue’s address on the number you booked with. It is
          recorded against this booking, so it does not change your account preference.
        </span>
      </span>
    </label>
  );
}

/** A slim divider the checkout sections sit either side of. */
export function ConsentDivider() {
  return <div style={{ height: 1, backgroundColor: Brand.divider, borderRadius: Radius.xs }} />;
}
