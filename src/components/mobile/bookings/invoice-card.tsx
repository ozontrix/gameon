'use client';

/**
 * The invoice block: order reference, rail used, amount, and the way into the full
 * invoice — the web twin of the handset app's `components/bookings/invoice-card.tsx`.
 */

import { Button, Card, Ion } from '@/components/mobile/ui';
import type { BookingInvoice } from '@/lib/mobile/constants/bookings';
import { price } from '@/lib/mobile/constants/config';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

export function InvoiceCard({
  invoice,
  onViewInvoice,
}: {
  invoice: BookingInvoice;
  onViewInvoice: () => void;
}) {
  return (
    <Card>
      <span
        style={{
          ...Typography.label,
          color: Brand.text,
          display: 'block',
          marginBottom: Spacing.md,
        }}>
        Invoice
      </span>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.md }}>
        <Fact label="Order ID" value={invoice.orderId} />
        <Fact label="Payment Method" value={invoice.paymentMethod} />
        <Fact label="Amount Paid" value={price(invoice.amountPaid)} />
        <Button
          label="View Invoice"
          variant="secondary"
          size="sm"
          icon={<Ion name="downloadOutline" size={14} color={Brand.accent} />}
          onPress={onViewInvoice}
        />
      </div>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xxs, minWidth: 0 }}>
      <span style={{ ...Typography.caption, color: Brand.textMuted }}>{label}</span>
      <span
        style={{
          ...Typography.caption,
          color: Brand.text,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
        {value}
      </span>
    </span>
  );
}
