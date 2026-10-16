'use client';

/**
 * The "Apply GameOn Wallet" block at checkout — the web twin of the app
 * `components/payment/wallet-block.tsx`. Amounts are in GameOn Points; only the
 * remainder is in rupees. The server clamps the real figure, so this field is
 * display-only and cannot over-spend.
 */

import { useState } from 'react';

import { points, price } from '@/lib/mobile/constants/config';
import { Brand, InputText, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { Card, Ion } from '../ui';

/** One label/value row of the block, divided from the row above it. */
const ROW = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: Spacing.md,
  borderTop: `1px solid ${Brand.divider}`,
  paddingLeft: Spacing.md,
  paddingRight: Spacing.md,
  paddingTop: Spacing.md,
  paddingBottom: Spacing.md,
} as const;

export function WalletBlock({
  /** GameOn Points on the account. */
  balance,
  /** Most Points this booking can absorb. */
  maxUsable,
  enabled,
  onToggle,
  /** Points currently being redeemed. */
  amount,
  onAmountChange,
  /** Rupee value of the redeemed Points. */
  walletValue,
  amountToPay,
}: {
  balance: number;
  maxUsable: number;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  amount: number;
  onAmountChange: (points: number) => void;
  walletValue: number;
  amountToPay: number;
}) {
  const [editing, setEditing] = useState(false);
  const [buffer, setBuffer] = useState(String(amount));

  const commit = () => {
    const parsed = Number(buffer.replace(/\D/g, ''));
    onAmountChange(Math.min(Number.isFinite(parsed) ? parsed : 0, maxUsable));
    setEditing(false);
  };

  const startEditing = () => {
    setBuffer(String(amount));
    setEditing(true);
  };

  return (
    <Card padded={false}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Spacing.sm,
          padding: Spacing.md,
        }}>
        <span style={{ ...Typography.blockTitle, color: Brand.text }}>Apply GameOn Wallet</span>
        <span style={{ ...Typography.caption, color: Brand.success }}>
          Available Balance: {points(balance)}
        </span>
      </div>

      <div style={ROW}>
        <span
          style={{
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: Radius.pill,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Brand.accentSoft,
          }}>
          <Ion name="walletOutline" size={16} color={Brand.accent} />
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...Typography.label, color: Brand.text, display: 'block' }}>
            Use Wallet Points
          </span>
          <span style={{ ...Typography.caption, color: Brand.textMuted, display: 'block' }}>
            (You can use up to {points(maxUsable)} on this booking)
          </span>
        </span>

        {/*
          A native checkbox styled as the switch the app shows. The knob is a
          radial gradient rather than a child element, so the control needs no
          extra DOM.
        */}
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          aria-label="Use GameOn Points on this booking"
          onChange={(event) => onToggle(event.target.checked)}
          style={{
            appearance: 'none',
            width: 44,
            height: 26,
            flexShrink: 0,
            borderRadius: Radius.pill,
            backgroundColor: enabled ? Brand.accent : Brand.backgroundSelected,
            border: `1px solid ${enabled ? Brand.accent : Brand.cardBorder}`,
            cursor: 'pointer',
            transition: 'background-color 180ms ease',
            backgroundImage: `radial-gradient(circle at ${enabled ? '31px' : '12px'} 13px, ${Brand.white} 0 9px, transparent 9px)`,
          }}
        />
      </div>

      {enabled ? (
        <>
          <div style={ROW}>
            <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
              Points to Redeem
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: Spacing.md }}>
              {editing ? (
                <input
                  className="mobile-input"
                  autoFocus
                  inputMode="numeric"
                  aria-label="Points to redeem"
                  value={buffer}
                  onChange={(event) => setBuffer(event.target.value)}
                  onBlur={commit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commit();
                  }}
                  style={{
                    ...InputText.sm,
                    color: Brand.text,
                    width: 72,
                    textAlign: 'right',
                    borderBottom: `1px solid ${Brand.accent}`,
                  }}
                />
              ) : (
                <span style={{ ...Typography.label, color: Brand.text }}>{points(amount)}</span>
              )}

              <button
                type="button"
                onClick={editing ? commit : startEditing}
                aria-label={editing ? 'Save points to redeem' : 'Edit points to redeem'}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  ...Typography.micro,
                  color: Brand.accent,
                }}>
                {editing ? 'DONE' : 'EDIT'}
              </button>
            </span>
          </div>

          <div style={ROW}>
            <span style={{ ...Typography.caption, color: Brand.textSecondary }}>Points Value</span>
            <span style={{ ...Typography.label, color: Brand.text }}>-{price(walletValue)}</span>
          </div>

          <div style={{ ...ROW, backgroundColor: Brand.backgroundSelected }}>
            <span style={{ ...Typography.label, color: Brand.text }}>Amount to Pay</span>
            <span style={{ ...Typography.priceSmall, color: Brand.accent }}>
              {price(amountToPay)}
            </span>
          </div>
        </>
      ) : null}
    </Card>
  );
}
