'use client';

/**
 * The six-digit SMS code field, and the password field that sits beside it on
 * the auth screens.
 *
 * Digits are collected into one string and drawn across `length` boxes: typing
 * advances, backspace retreats, and pasting a code from the SMS fills every box
 * at once. The handset build gets the same behaviour from one hidden input; a
 * browser makes per-box inputs the simpler shape, because each box can take
 * focus on its own.
 */

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { Brand, InputText, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Ion, type IonName } from '../ui';

/** The bordered surface both fields sit on, matching `ui/text-field.tsx`. */
function FieldShell({
  label,
  error,
  hint,
  children,
}: {
  label?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs, width: '100%' }}>
      {label ? (
        <span style={{ ...Typography.label, color: Brand.textSecondary }}>{label}</span>
      ) : null}
      <div
        className="mobile-field"
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 50,
          borderRadius: Radius.md,
          border: `1px solid ${error ? Brand.danger : Brand.cardBorder}`,
          backgroundColor: Brand.backgroundElement,
          paddingLeft: Spacing.md,
          paddingRight: Spacing.md,
        }}>
        {children}
      </div>
      {error ? (
        <span style={{ ...Typography.caption, color: Brand.danger }}>{error}</span>
      ) : hint ? (
        <span style={{ ...Typography.caption, color: Brand.textMuted }}>{hint}</span>
      ) : null}
    </div>
  );
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  error,
  hint,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: string | null;
  hint?: string;
  label?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const focusAt = (index: number) => {
    const target = refs.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  const settle = (next: string) => {
    const code = next.replace(/\D/g, '').slice(0, length);
    onChange(code);
    focusAt(code.length);
  };

  const boxStyle = (filled: boolean): CSSProperties => ({
    ...InputText.lg,
    width: 46,
    height: 54,
    textAlign: 'center',
    color: Brand.text,
    borderRadius: Radius.md,
    border: `1px solid ${filled ? Brand.accentBorder : Brand.cardBorder}`,
    background: filled ? Brand.accentGlass : Brand.backgroundElement,
  });

  return (
    <FieldShell label={label} error={error} hint={hint}>
      <div
        style={{
          display: 'flex',
          gap: Spacing.sm,
          width: '100%',
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.sm,
          justifyContent: 'space-between',
        }}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            className="mobile-input"
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${index + 1} of ${length}`}
            maxLength={1}
            value={digit}
            autoFocus={autoFocus && index === 0}
            onChange={(event) => {
              const typed = event.target.value.replace(/\D/g, '');
              if (!typed) {
                settle(value.slice(0, index));
                return;
              }
              settle(`${value.slice(0, index)}${typed}`);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace') {
                event.preventDefault();
                settle(digit ? value.slice(0, index) : value.slice(0, Math.max(0, index - 1)));
                focusAt(digit ? index : index - 1);
              }
              if (event.key === 'ArrowLeft') focusAt(index - 1);
              if (event.key === 'ArrowRight') focusAt(index + 1);
            }}
            onPaste={(event) => {
              event.preventDefault();
              settle(`${value.slice(0, index)}${event.clipboardData.getData('text')}`);
            }}
            style={boxStyle(Boolean(digit))}
          />
        ))}
      </div>
    </FieldShell>
  );
}

/** A password field with a show/hide toggle, so a mistyped password is visible. */
export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  error,
  hint,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  hint?: string;
  onEnter?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <FieldShell label={label} error={error} hint={hint}>
      <input
        className="mobile-input"
        type={revealed ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onEnter) onEnter();
        }}
        style={{
          ...InputText.md,
          color: Brand.text,
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.sm,
        }}
      />
      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        aria-label={revealed ? 'Hide password' : 'Show password'}
        style={{
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          ...Typography.label,
          color: Brand.accent,
        }}>
        {revealed ? 'Hide' : 'Show'}
      </button>
    </FieldShell>
  );
}

/** A leading glyph in the muted tone the auth fields use. */
export function FieldIcon({ name }: { name: IonName }) {
  return <Ion name={name} size={15} color={Brand.textSecondary} />;
}
