'use client';

/**
 * The app's form fields.
 *
 * The wrapper owns the height and the border, and the input inside it is a
 * plain, naturally sized text box — the same rule the handset build settled on,
 * where constraining an input's own height was the cause of every clipping bug.
 * `mobile.css` gives the wrapper its focus ring via `:focus-within`.
 */

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { Brand, InputText, Radius, Spacing, Typography } from '@/lib/mobile/theme';

type SharedFieldProps = {
  label?: string;
  /** A reason the value was rejected, if one is known. */
  error?: string | null;
  /** Guidance shown under the field while the value is still accepted. */
  hint?: string;
  disabled?: boolean;
};

type TextFieldProps = SharedFieldProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal';
  autoComplete?: string;
  maxLength?: number;
  /** Static text shown before the input — the `+91` dial code, for a phone field. */
  prefix?: string;
  autoFocus?: boolean;
  name?: string;
  /** Fired on Enter, so a single-field form submits from the keyboard. */
  onEnter?: () => void;
  style?: CSSProperties;
};

function FieldShell({
  label,
  error,
  hint,
  disabled,
  children,
}: SharedFieldProps & { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm, width: '100%' }}>
      {label ? (
        <span style={{ ...Typography.label, color: Brand.textSecondary }}>{label}</span>
      ) : null}
      <div
        className="mobile-field"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.sm,
          minHeight: 50,
          padding: `0 ${Spacing.md}px`,
          borderRadius: Radius.md,
          border: `1px solid ${error ? Brand.danger : Brand.cardBorder}`,
          background: Brand.highlightWash,
          opacity: disabled ? 0.6 : 1,
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

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
  maxLength,
  prefix,
  error,
  hint,
  disabled,
  autoFocus,
  name,
  onEnter,
  style,
}: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} disabled={disabled}>
      {prefix ? (
        <span style={{ ...InputText.md, color: Brand.textSecondary }}>{prefix}</span>
      ) : null}
      <input
        className="mobile-input"
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onEnter) onEnter();
        }}
        style={{ ...InputText.md, flex: 1, minWidth: 0, color: Brand.text, ...style }}
      />
    </FieldShell>
  );
}

/**
 * The six-digit SMS code field.
 *
 * Digits are collected into one string and drawn across `length` boxes: typing
 * advances, backspace retreats, and pasting a code from the SMS notification
 * fills every box at once — the same behaviour the handset build gets from its
 * single hidden input.
 */
export function CodeField({
  value,
  onChange,
  length = 6,
  autoFocus,
  error,
  hint,
  label,
}: SharedFieldProps & {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
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

  return (
    <FieldShell label={label} error={error} hint={hint}>
      <div
        style={{
          display: 'flex',
          gap: Spacing.sm,
          width: '100%',
          padding: `${Spacing.sm}px 0`,
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
            style={{
              ...InputText.lg,
              width: 46,
              height: 54,
              textAlign: 'center',
              color: Brand.text,
              borderRadius: Radius.md,
              border: `1px solid ${digit ? Brand.accentBorder : Brand.cardBorder}`,
              background: digit ? Brand.accentGlass : Brand.highlightWash,
            }}
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
  disabled,
  onEnter,
}: Omit<TextFieldProps, 'type' | 'inputMode' | 'prefix'>) {
  const [revealed, setRevealed] = useState(false);
  return (
    <FieldShell label={label} error={error} hint={hint} disabled={disabled}>
      <input
        className="mobile-input"
        type={revealed ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onEnter) onEnter();
        }}
        style={{ ...InputText.md, flex: 1, minWidth: 0, color: Brand.text }}
      />
      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        className="mobile-link"
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
