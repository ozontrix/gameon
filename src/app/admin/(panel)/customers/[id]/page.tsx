import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BookingStatusBadge, PaymentStatusBadge, SourceBadge } from '@/components/admin/status';
import { Card, CardBody, CardHeader, DetailList, EmptyState, PageHeader, StatCard, Table, Td, Th } from '@/components/admin/ui';
import { formatDate, formatDateTime, formatMoney, formatTimeRange, shortBookingId, titleCase } from '@/lib/admin/format';
import { getCustomer } from '@/lib/admin/queries/customers';
import { requireStaff } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const result = await getCustomer(id);
  if (!result) notFound();
  const { customer, bookings, bookingCount, spent, lastBooking } = result;

  return (
    <>
      <PageHeader
        back={{ href: '/admin/customers', label: 'Customers' }}
        title={customer.full_name || customer.phone || customer.email || 'Customer'}
        description={`Joined ${formatDateTime(customer.created_at)}`}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Confirmed bookings" value={bookingCount} />
        <StatCard label="Total paid" value={formatMoney(spent)} />
        <StatCard label="Last booking" value={lastBooking ? formatDate(lastBooking, { weekday: false }) : '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="Profile" />
          <CardBody>
            <DetailList
              items={[
                { label: 'Phone', value: customer.phone || '—' },
                { label: 'Email', value: customer.email || '—' },
                { label: 'City', value: customer.city || '—' },
                { label: 'Gender', value: titleCase(customer.gender) },
                { label: 'Birthday', value: customer.date_of_birth ? formatDate(customer.date_of_birth, { weekday: false }) : '—' },
                {
                  label: 'Sports',
                  value: customer.preferred_sports.length ? customer.preferred_sports.map(titleCase).join(', ') : '—',
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Bookings" />
          {bookings.length === 0 ? (
            <EmptyState title="No bookings yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Booking</Th>
                  <Th>Court</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Status</Th>
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
                    </Td>
                    <Td>
                      <div>{booking.facilities?.name ?? '—'}</div>
                      <SourceBadge source={booking.source} />
                    </Td>
                    <Td className="text-right tabular-nums">{formatMoney(booking.amount_paid)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <BookingStatusBadge status={booking.status} />
                        <PaymentStatusBadge status={booking.payment_status} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
