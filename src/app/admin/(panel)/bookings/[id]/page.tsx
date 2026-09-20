import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionForm, SubmitButton } from '@/components/admin/action-form';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { BookingStatusBadge, PaymentStatusBadge, SourceBadge, needsRefund } from '@/components/admin/status';
import { Badge, Card, CardBody, CardHeader, DetailList, Notice, PageHeader, inputClass } from '@/components/admin/ui';
import { cancelBooking, checkInBooking, markRefunded, recordPayment } from '@/lib/admin/actions/bookings';
import { COUNTER_PAYMENT_METHODS } from '@/lib/admin/constants';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatTimeRange,
  shortBookingId,
  titleCase,
  todayIn,
} from '@/lib/admin/format';
import { getBooking } from '@/lib/admin/queries/bookings';
import { requireStaff } from '@/lib/admin/session';
import { DEFAULT_TIMEZONE } from '@/lib/utils/date-helpers';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Booking ${shortBookingId(id)}` };
}

const ACTION_LABELS: Record<string, string> = {
  'booking.create': 'Booked at the front desk',
  'booking.payment_recorded': 'Payment recorded',
  'booking.cancel': 'Cancelled',
  'booking.refund_recorded': 'Refund recorded',
  'booking.check_in': 'Checked in',
};

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await requireStaff();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);

  const result = await getBooking(id);
  if (!result) notFound();

  const { booking, customer, history, createdByEmail, cancelledByEmail } = result;
  const facility = booking.facilities;
  const venue = facility?.venues;
  const timeZone = venue?.timezone || DEFAULT_TIMEZONE;
  const isAdmin = session.role === 'ADMIN';

  const isToday = booking.booking_date === todayIn(timeZone);
  const canCheckIn = booking.status === 'CONFIRMED' && isToday && !booking.is_scanned;
  const canRecordPayment = booking.status === 'CONFIRMED' && booking.payment_status === 'UNPAID';
  const canCancel = isAdmin && (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
  const canRefund = isAdmin && needsRefund(booking);

  return (
    <>
      <PageHeader
        back={{ href: '/admin/bookings', label: 'All bookings' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{shortBookingId(booking.id)}</span>
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.payment_status} />
          </span>
        }
        description={`${formatDate(booking.booking_date)} · ${formatTimeRange(booking.start_time, booking.end_time)} · ${facility?.name ?? 'Unknown court'}`}
      />

      <div className="mb-4 space-y-3">
        {created ? <Notice tone="success">Booking created and confirmed.</Notice> : null}
        {needsRefund(booking) ? (
          <Notice tone="warning" title="Refund pending">
            This booking was paid and then cancelled. Refund {formatMoney(booking.amount_paid)} to the customer, then record
            it here.
          </Notice>
        ) : null}
        {booking.status === 'PENDING' ? (
          <Notice tone="info">
            The customer is paying in the app. The hold{' '}
            {booking.expires_at ? `lapses at ${formatDateTime(booking.expires_at, timeZone)}` : 'has no expiry'}.
          </Notice>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Booking" />
            <CardBody>
              <DetailList
                items={[
                  { label: 'Date', value: formatDate(booking.booking_date) },
                  { label: 'Time', value: formatTimeRange(booking.start_time, booking.end_time) },
                  { label: 'Court', value: facility?.name ?? '—' },
                  {
                    label: 'Court type',
                    value: facility
                      ? [titleCase(facility.court_types.surface_type), facility.court_types.is_indoor ? 'Indoor' : 'Outdoor', facility.court_types.has_ac ? 'AC' : 'Non-AC'].join(' · ')
                      : '—',
                  },
                  { label: 'Sport', value: facility?.court_types?.sports?.name ?? '—' },
                  { label: 'Venue', value: venue ? `${venue.name}${venue.address ? `, ${venue.address}` : ''}` : '—' },
                  { label: 'Players', value: booking.players ?? '—' },
                  { label: 'Notes', value: booking.notes || '—' },
                  { label: 'Source', value: <SourceBadge source={booking.source} /> },
                  { label: 'Booked', value: `${formatDateTime(booking.created_at, timeZone)}${createdByEmail ? ` by ${createdByEmail}` : ''}` },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment" />
            <CardBody>
              <DetailList
                items={[
                  { label: 'Amount', value: <span className="font-semibold">{formatMoney(booking.amount_paid)}</span> },
                  { label: 'Status', value: <PaymentStatusBadge status={booking.payment_status} /> },
                  { label: 'Method', value: titleCase(booking.payment_method) },
                  { label: 'Paid at', value: formatDateTime(booking.paid_at, timeZone) },
                  ...(booking.razorpay_order_id
                    ? [
                        { label: 'Razorpay order', value: <span className="font-mono text-xs">{booking.razorpay_order_id}</span> },
                        {
                          label: 'Razorpay payment',
                          value: <span className="font-mono text-xs">{booking.razorpay_payment_id ?? '—'}</span>,
                        },
                      ]
                    : []),
                  ...(booking.status === 'CANCELLED'
                    ? [
                        {
                          label: 'Cancelled',
                          value: `${formatDateTime(booking.cancelled_at, timeZone)}${cancelledByEmail ? ` by ${cancelledByEmail}` : ''}`,
                        },
                        { label: 'Reason', value: booking.cancel_reason || '—' },
                      ]
                    : []),
                  ...(booking.payment_status === 'REFUNDED'
                    ? [
                        { label: 'Refunded', value: formatDateTime(booking.refunded_at, timeZone) },
                        { label: 'Refund reference', value: booking.refund_reference || '—' },
                      ]
                    : []),
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="History" description="Changes made from the admin panel." />
            <CardBody>
              {history.length === 0 ? (
                <p className="text-sm text-zinc-500">No admin changes yet.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((entry) => {
                    const details = entry.details as Record<string, unknown>;
                    return (
                      <li key={entry.id} className="flex gap-3 text-sm">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-zinc-300" aria-hidden />
                        <div>
                          <p className="text-zinc-900">
                            {ACTION_LABELS[entry.action] ?? entry.action}
                            {typeof details.reason === 'string' ? ` — “${details.reason}”` : ''}
                            {typeof details.reference === 'string' ? ` — ref ${details.reference}` : ''}
                            {typeof details.payment_method === 'string' ? ` — ${titleCase(details.payment_method)}` : ''}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {entry.actor_email ?? 'Unknown'} · {formatDateTime(entry.created_at, timeZone)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-3">
              <div>
                <p className="font-medium text-zinc-900">{booking.contact_name || customer?.full_name || '—'}</p>
                <p className="text-sm text-zinc-500">{booking.contact_phone || customer?.phone || 'No phone'}</p>
              </div>
              {customer ? (
                <Link href={`/admin/customers/${customer.id}`} className="inline-flex text-sm font-medium text-zinc-900 hover:underline">
                  View app account →
                </Link>
              ) : (
                <p className="text-xs text-zinc-500">Not linked to an app account.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Check-in" />
            <CardBody className="space-y-3">
              {booking.is_scanned ? (
                <p className="text-sm text-zinc-700">
                  <Badge tone="blue">Checked in</Badge>
                  <span className="mt-2 block text-zinc-500">{formatDateTime(booking.scanned_at, timeZone)}</span>
                </p>
              ) : canCheckIn ? (
                <ConfirmAction
                  action={checkInBooking}
                  hidden={{ code: booking.id }}
                  trigger="Check in now"
                  triggerVariant="primary"
                  triggerSize="md"
                  title="Check this customer in?"
                  description="Confirm the customer's name before letting them in. A booking can only be checked in once."
                  confirmLabel="Check in"
                />
              ) : (
                <p className="text-sm text-zinc-500">
                  {booking.status !== 'CONFIRMED'
                    ? 'Only confirmed bookings can be checked in.'
                    : 'Check-in opens on the day of the booking.'}
                </p>
              )}
            </CardBody>
          </Card>

          {canRecordPayment || canCancel || canRefund ? (
            <Card>
              <CardHeader title="Actions" />
              <CardBody className="space-y-4">
                {canRecordPayment ? (
                  <ActionForm action={recordPayment} className="space-y-2">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-zinc-800">
                      Record payment of {formatMoney(booking.amount_paid)}
                    </label>
                    <div className="flex gap-2">
                      <select id="paymentMethod" name="paymentMethod" className={inputClass} defaultValue="CASH">
                        {COUNTER_PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {titleCase(method)}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="secondary">Mark paid</SubmitButton>
                    </div>
                  </ActionForm>
                ) : null}

                {canRefund ? (
                  <ConfirmAction
                    action={markRefunded}
                    hidden={{ bookingId: booking.id }}
                    trigger="Record refund"
                    triggerVariant="primary"
                    triggerSize="md"
                    title="Record refund"
                    description={`Refund ${formatMoney(booking.amount_paid)} in the Razorpay dashboard (or in cash) first, then record the reference here.`}
                    confirmLabel="Record refund"
                    inputs={[{ name: 'reference', label: 'Refund reference', placeholder: 'rfnd_… or “Cash, receipt 142”', required: true }]}
                  />
                ) : null}

                {canCancel ? (
                  <ConfirmAction
                    action={cancelBooking}
                    hidden={{ bookingId: booking.id }}
                    trigger="Cancel booking"
                    triggerVariant="danger"
                    triggerSize="md"
                    title="Cancel this booking?"
                    description={
                      booking.payment_status === 'PAID'
                        ? `The slot becomes free again. ${formatMoney(booking.amount_paid)} was paid, so the booking moves to the refund queue.`
                        : 'The slot becomes free again. The customer is not notified automatically.'
                    }
                    confirmLabel="Cancel booking"
                    confirmVariant="danger"
                    inputs={[{ name: 'reason', label: 'Reason', placeholder: 'e.g. Court maintenance', multiline: true, required: true }]}
                  />
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
