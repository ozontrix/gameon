import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmAction } from '@/components/admin/confirm-action';
import { BookingStatusBadge, PaymentStatusBadge, SourceBadge } from '@/components/admin/status';
import { Card, CardBody, CardHeader, DetailList, EmptyState, PageHeader, StatCard, Table, Td, Th } from '@/components/admin/ui';
import { adjustCustomerWallet } from '@/lib/admin/actions/wallet';
import { formatDate, formatDateTime, formatMoney, formatTimeRange, shortBookingId, titleCase } from '@/lib/admin/format';
import { getCustomer } from '@/lib/admin/queries/customers';
import { requireStaff } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Customer' };

const WALLET_REASON_LABEL: Record<string, string> = {
  refund_credit: 'Refund credited',
  refund_credit_release: 'Refund reversed',
  booking_redeem: 'Redeemed at checkout',
  booking_redeem_release: 'Redemption returned',
  admin_adjustment: 'Admin adjustment',
};

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const { id } = await params;
  const result = await getCustomer(id);
  if (!result) notFound();
  const { customer, bookings, bookingCount, spent, lastBooking, wallet, walletTransactions } = result;

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

        <Card className="h-fit">
          <CardHeader
            title="GameOn Wallet"
            action={
              session.role === 'ADMIN' ? (
                <ConfirmAction
                  action={adjustCustomerWallet}
                  hidden={{ userId: customer.id }}
                  trigger="Adjust balance"
                  title="Adjust GameOn Points"
                  description={`Current balance: ${wallet.balance.toLocaleString('en-IN')} PTS. A positive amount credits, a negative amount debits.`}
                  confirmLabel="Save adjustment"
                  inputs={[
                    { name: 'points', label: 'Points (e.g. 100 or -50)', required: true },
                    { name: 'note', label: 'Reason', placeholder: 'Why is this adjustment being made?', multiline: true, required: true },
                  ]}
                />
              ) : undefined
            }
          />
          <CardBody>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-semibold tabular-nums text-zinc-950">{wallet.balance.toLocaleString('en-IN')}</p>
                <p className="text-xs text-zinc-500">Balance</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums text-emerald-600">{wallet.totalEarned.toLocaleString('en-IN')}</p>
                <p className="text-xs text-zinc-500">Earned</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums text-red-600">{wallet.totalUsed.toLocaleString('en-IN')}</p>
                <p className="text-xs text-zinc-500">Used</p>
              </div>
            </div>

            {walletTransactions.length === 0 ? (
              <EmptyState title="No wallet activity yet" />
            ) : (
              <div className="space-y-2">
                {walletTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between border-t border-zinc-100 pt-2 text-sm first:border-t-0 first:pt-0">
                    <div>
                      <div className="text-zinc-800">{WALLET_REASON_LABEL[txn.reason] ?? txn.reason}</div>
                      <div className="text-xs text-zinc-500">{formatDateTime(txn.createdAt)}</div>
                    </div>
                    <div className={`tabular-nums font-medium ${txn.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {txn.points > 0 ? '+' : ''}
                      {txn.points}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
