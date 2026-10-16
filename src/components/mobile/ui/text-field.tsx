'use client';

/**
 * A labelled input matching the booking-details and profile forms: the label
 * sits inside the bordered surface with the value beneath it. The web twin of
 * the app `components/ui/text-field.tsx`.
 *
 * The wrapper owns the height and the border and the input inside is a plain,
 * naturally sized text box — the rule the handset build settled on, where
 * constraining an input's own height was the cause of every clipping bug.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Brand, INPUT_MULTILINE_LINE_HEIGHT, InputText, Radius, Spacing, Typography } from '@/lib/mobile/theme';

export type TextFieldProps = {
  /** Muted label rendered inside the field, above the value. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  /** Validation message; turns the border and text danger-coloured. */
  error?: string | null;
  /** Guidance shown under the field while the value is still accepted. */
  hint?: string;
  /** Right-aligned counter, e.g. "0/100" on the booking notes field. */
  counter?: string;
  /** Grow the field for multi-line entry. */
  multilineRows?: number;
  /** Let the field share a row equally with a sibling. */
  grow?: boolean;
  /** Static text shown before the input — the `+91` dial code, for a phone field. */
  prefix?: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password';
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal';
  autoComplete?: string;
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  name?: string;
  /** Fired on Enter, so a single-field form submits from the keyboard. */
  onEnter?: () => void;
  style?: CSSProperties;
};

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  icon,
  error,
  hint,
  counter,
  multilineRows,
  grow = false,
  prefix,
  type = 'text',
  inputMode,
  autoComplete,
  maxLength,
  autoFocus,
  disabled,
  name,
  onEnter,
  style,
}: TextFieldProps) {
  const invalid = Boolean(error);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: Spacing.xs,
        width: '100%',
        ...(grow ? { flex: 1, minWidth: 0 } : null),
        ...style,
      }}>
      <div
        className="mobile-field"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: multilineRows ? 'flex-start' : 'center',
          gap: Spacing.sm,
          minHeight: 48,
          borderRadius: Radius.md,
          border: `1px solid ${invalid ? Brand.danger : Brand.cardBorder}`,
          backgroundColor: Brand.backgroundElement,
          paddingLeft: Spacing.md,
          paddingRight: Spacing.md,
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.sm,
          ...(disabled ? { opacity: 0.6 } : null),
        }}>
        {icon ? <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span> : null}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...Typography.caption, color: Brand.textMuted }}>{label}</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
            {prefix ? (
              <span style={{ ...InputText.md, color: Brand.textSecondary }}>{prefix}</span>
            ) : null}

            {multilineRows ? (
              <textarea
                className="mobile-input"
                name={name}
                rows={multilineRows}
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                style={{
                  ...InputText.md,
                  color: Brand.text,
                  height: multilineRows * parseInt(INPUT_MULTILINE_LINE_HEIGHT, 10),
                  lineHeight: INPUT_MULTILINE_LINE_HEIGHT,
                  resize: 'none',
                }}
              />
            ) : (
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
                style={{ ...InputText.sm, color: Brand.text }}
              />
            )}
          </div>
        </div>

        {counter ? (
          <span style={{ ...Typography.caption, color: Brand.textMuted, alignSelf: 'flex-end' }}>
            {counter}
          </span>
        ) : null}
      </div>

      {error ? (
        <span style={{ ...Typography.caption, color: Brand.danger, paddingLeft: Spacing.xs }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ ...Typography.caption, color: Brand.textMuted, paddingLeft: Spacing.xs }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
