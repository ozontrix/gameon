import type { Metadata } from 'next';
import Link from 'next/link';

import { ConfirmAction } from '@/components/admin/confirm-action';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Card, EmptyState, Notice, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import { markRefunded } from '@/lib/admin/actions/bookings';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDate, formatDateTime, formatMoney, formatTimeRange, shortBookingId, titleCase } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';

export const metadata: Metadata = { title: 'Refunds' };

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = pageFrom(params.page);
  const showDone = params.view === 'done';
  const from = (page - 1) * PAGE_SIZE;

  let query = supabaseAdmin
    .from('bookings')
    .select(
      'id, booking_date, start_time, end_time, amount_paid, payment_method, razorpay_payment_id, contact_name, contact_phone, cancel_reason, cancelled_at, refunded_at, refund_reference, facilities ( name )',
      { count: 'exact' }
    )
    .eq('status', 'CANCELLED');

  query = showDone
    ? query.eq('payment_status', 'REFUNDED').order('refunded_at', { ascending: false })
    : query.eq('payment_status', 'PAID').order('cancelled_at', { ascending: true, nullsFirst: true });

  const { data: bookings, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  return (
    <>
      <PageHeader
        title="Refunds"
        description="Bookings that were paid and then cancelled — by an admin, or because the slot was taken while the customer was paying."
      />

      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm sm:w-fit">
        <Link
          href="/admin/refunds"
          className={`rounded-md px-3 py-1.5 ${showDone ? 'text-zinc-600 hover:text-zinc-900' : 'bg-white font-medium text-zinc-900 shadow-sm'}`}
        >
          To refund
        </Link>
        <Link
          href="/admin/refunds?view=done"
          className={`rounded-md px-3 py-1.5 ${showDone ? 'bg-white font-medium text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
        >
          Refunded
        </Link>
      </div>

      {!showDone ? (
        <div className="mb-4">
          <Notice tone="info">
            The panel does not move money. Issue the refund in the Razorpay dashboard (Payments → the payment ID → Refund) or
            in cash, then record the reference here.
          </Notice>
        </div>
      ) : null}

      <Card>
        {!bookings?.length ? (
          <EmptyState
            title={showDone ? 'No refunds recorded yet' : 'Nothing to refund'}
            description={showDone ? undefined : 'Paid bookings that get cancelled will show up here.'}
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Booking</Th>
                  <Th>Customer</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Payment</Th>
                  <Th>{showDone ? 'Refund' : 'Cancelled'}</Th>
                  {showDone ? null : <Th className="text-right">Action</Th>}
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-zinc-50">
                    <Td>
                      <Link href={`/admin/bookings/${booking.id}`} className="font-mono font-medium text-zinc-950 hover:underline">
                        {shortBookingId(booking.id)}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {formatDate(booking.booking_date)} · {formatTimeRange(booking.start_time, booking.end_time)}
                      </div>
                      <div className="text-xs text-zinc-500">{booking.facilities?.name}</div>
                    </Td>
                    <Td>
                      <div className="text-zinc-900">{booking.contact_name || '—'}</div>
                      <div className="text-xs text-zinc-500">{booking.contact_phone}</div>
                    </Td>
                    <Td className="text-right font-medium tabular-nums">{formatMoney(booking.amount_paid)}</Td>
                    <Td>
                      <div>{titleCase(booking.payment_method)}</div>
                      {booking.razorpay_payment_id ? (
                        <div className="font-mono text-xs text-zinc-500">{booking.razorpay_payment_id}</div>
                      ) : null}
                    </Td>
                    <Td>
                      {showDone ? (
                        <>
                          <div>{formatDateTime(booking.refunded_at)}</div>
                          <div className="text-xs text-zinc-500">{booking.refund_reference}</div>
                        </>
                      ) : (
                        <>
                          <div>{booking.cancelled_at ? formatDateTime(booking.cancelled_at) : 'Slot taken during payment'}</div>
                          <div className="text-xs text-zinc-500">{booking.cancel_reason}</div>
                        </>
                      )}
                    </Td>
                    {showDone ? null : (
                      <Td className="text-right">
                        <ConfirmAction
                          action={markRefunded}
                          hidden={{ bookingId: booking.id }}
                          trigger="Record refund"
                          title={`Record refund for ${shortBookingId(booking.id)}`}
                          description={`Confirm you have refunded ${formatMoney(booking.amount_paid)} to ${booking.contact_name || 'the customer'}.`}
                          confirmLabel="Record refund"
                          inputs={[{ name: 'reference', label: 'Refund reference', placeholder: 'rfnd_… or “Cash, receipt 142”', required: true }]}
                        />
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              basePath="/admin/refunds"
              params={{ view: showDone ? 'done' : undefined }}
              page={page}
              pageSize={PAGE_SIZE}
              total={count ?? 0}
            />
          </>
        )}
      </Card>
    </>
  );
}
