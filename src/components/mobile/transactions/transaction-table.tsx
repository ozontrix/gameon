'use client';

/**
 * The ledger table shared by the Wallet and Transactions screens — the web twin of
 * the handset app's `components/transactions/transaction-table.tsx`.
 *
 * One row is either a gateway payment (rupees, with the Points it consumed beside
 * it) or a Points movement (PTS). Keeping the two units apart is the point: a
 * booking paid by card never appears in the Points ledger, so a row must never
 * silently mix them.
 */

import { Card, Ion, type IonName } from '@/components/mobile/ui';
import type { AccountTransaction, TxnCategory } from '@/lib/mobile/constants/transactions';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

const LEADING = 32;
const DATE_WIDTH = 74;
const POINTS_WIDTH = 92;

function TxnIcon({ category }: { category: TxnCategory }) {
  if (category === 'refund' || category === 'earned') {
    // The Points mark: a G with a plus, for Points that arrived.
    return (
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          border: `1.5px solid ${Brand.accent}`,
          backgroundColor: Brand.accentSoft,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
        <span style={{ color: Brand.accent, fontSize: 15, fontWeight: 800 }}>G</span>
        <span
          style={{
            color: Brand.success,
            fontSize: 11,
            fontWeight: 800,
            position: 'absolute',
            top: -4,
            right: 2,
          }}>
          +
        </span>
      </span>
    );
  }

  const glyph: IonName =
    category === 'event'
      ? 'ticketOutline'
      : category === 'tournament'
        ? 'trophyOutline'
        : category === 'wallet'
          ? 'walletOutline'
          : 'calendar';

  return <Ion name={glyph} size={20} color={Brand.accent} />;
}

function TransactionRow({ txn }: { txn: AccountTransaction }) {
  const payment = txn.amount !== undefined && txn.amount !== null;
  const credit = payment ? (txn.amount as number) > 0 : txn.points > 0;
  const tint = credit ? Brand.success : payment ? Brand.text : Brand.danger;

  const amountLabel = payment
    ? `${(txn.amount as number) > 0 ? '+' : (txn.amount as number) < 0 ? '−' : ''}₹${Math.abs(
        txn.amount as number,
      ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : `${txn.points > 0 ? '+' : ''}${txn.points} PTS`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        padding: Spacing.md,
      }}>
      <span style={{ width: LEADING, flexShrink: 0, display: 'inline-flex', justifyContent: 'center' }}>
        <TxnIcon category={txn.category} />
      </span>

      <span style={{ width: DATE_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ ...Typography.caption, color: Brand.text, fontWeight: 600 }}>
          {txn.date}
        </span>
        <span style={{ ...Typography.caption, fontSize: 11.5, color: Brand.textMuted }}>
          {txn.time}
        </span>
      </span>

      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ ...Typography.label, color: Brand.text, lineHeight: '18px' }}>
          {txn.title}
        </span>
        <span style={{ ...Typography.caption, color: Brand.textSecondary }}>{txn.subtitle}</span>
        {txn.bookingId !== '–' ? (
          <span style={{ ...Typography.caption, fontSize: 11.5, color: Brand.textMuted }}>
            Reference: {txn.bookingId}
          </span>
        ) : null}
        {txn.paymentReference ? (
          <span
            style={{
              ...Typography.caption,
              fontSize: 11.5,
              color: Brand.textMuted,
              userSelect: 'text',
            }}>
            Payment: {txn.paymentReference}
          </span>
        ) : null}
      </span>

      <span
        style={{
          width: POINTS_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 2,
        }}>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: tint }}>{amountLabel}</span>
        {payment && (txn.pointsUsed ?? 0) > 0 ? (
          <span style={{ ...Typography.caption, fontSize: 11.5, color: Brand.textMuted }}>
            {txn.pointsUsed} PTS used
          </span>
        ) : null}
        <span style={{ ...Typography.caption, fontSize: 11.5, color: Brand.textMuted }}>
          {txn.status}
        </span>
      </span>
    </div>
  );
}

export function TransactionTable({ transactions }: { transactions: AccountTransaction[] }) {
  return (
    <Card padded={false}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Spacing.sm,
          padding: Spacing.md,
          borderBottom: `1px solid ${Brand.divider}`,
        }}>
        <span style={{ width: LEADING, flexShrink: 0 }} />
        <span style={{ ...Typography.caption, color: Brand.textMuted, fontWeight: 700, width: DATE_WIDTH }}>
          Date
        </span>
        <span style={{ ...Typography.caption, color: Brand.textMuted, fontWeight: 700, flex: 1 }}>
          Description
        </span>
        <span
          style={{
            ...Typography.caption,
            color: Brand.textMuted,
            fontWeight: 700,
            width: POINTS_WIDTH,
            textAlign: 'right',
          }}>
          Amount / PTS
        </span>
      </div>

      {transactions.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: Spacing.sm,
            paddingTop: Spacing.five,
            paddingBottom: Spacing.five,
          }}>
          <Ion name="receiptOutline" size={28} color={Brand.textMuted} />
          <span style={{ ...Typography.caption, color: Brand.textMuted }}>
            No transactions found
          </span>
        </div>
      ) : (
        transactions.map((txn, index) => (
          <div key={txn.id}>
            {index > 0 ? <div style={{ height: 1, background: Brand.divider }} /> : null}
            <TransactionRow txn={txn} />
          </div>
        ))
      )}
    </Card>
  );
}
