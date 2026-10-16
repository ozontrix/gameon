'use client';

/**
 * One row of the profile form — the web twin of the handset app's
 * `components/accounts/field-row.tsx`: an uppercase label over a bordered surface
 * that holds either an input or a read-only value, with an optional "Verified" pill
 * and an optional trailing action.
 */

import { Ion } from '@/components/mobile/ui';
import { Brand, InputText, Radius, Spacing } from '@/lib/mobile/theme';

export function FieldRow({
  label,
  value,
  onChange,
  verified,
  placeholder,
  type = 'text',
  inputMode,
  rightIcon,
  onRightPress,
}: {
  label: string;
  value: string;
  onChange?: (text: string) => void;
  verified?: boolean;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
  inputMode?: 'text' | 'email' | 'tel';
  rightIcon?: 'calendar' | 'chevron';
  onRightPress?: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.two }}>
      <span
        style={{
          color: Brand.textMuted,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        }}>
        {label}
      </span>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.two,
          backgroundColor: Brand.card,
          border: `1px solid ${Brand.cardBorder}`,
          borderRadius: 14,
          paddingLeft: Spacing.three,
          paddingRight: Spacing.three,
          paddingTop: 13,
          paddingBottom: 13,
        }}>
        {onChange ? (
          <input
            className="mobile-input"
            aria-label={label}
            placeholder={placeholder}
            type={type}
            inputMode={inputMode}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            style={{ ...InputText.md, flex: 1, color: Brand.text }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              color: value === 'Not set' ? Brand.textMuted : Brand.text,
              fontSize: 15,
              fontWeight: 600,
            }}>
            {value}
          </span>
        )}

        {verified ? <VerifiedPill /> : null}

        {rightIcon ? (
          <button
            type="button"
            aria-label={label}
            onClick={onRightPress}
            className="mobile-press"
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}>
            <Ion
              name={rightIcon === 'calendar' ? 'calendarOutline' : 'chevronDown'}
              size={18}
              color={Brand.accent}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function VerifiedPill() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Brand.successSoft,
        border: `1px solid ${Brand.success}`,
        borderRadius: Radius.md,
        paddingLeft: 9,
        paddingRight: 9,
        paddingTop: 4,
        paddingBottom: 4,
      }}>
      <Ion name="checkmarkCircle" size={15} color={Brand.success} />
      <span style={{ color: Brand.success, fontSize: 11, fontWeight: 700 }}>Verified</span>
    </span>
  );
}

export { InputText };
