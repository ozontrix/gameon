import { Download, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Pagination, pageFrom } from '@/components/admin/pagination';
import { BookingStatusBadge, PaymentStatusBadge, SourceBadge } from '@/components/admin/status';
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
  buttonClass,
  inputClass,
} from '@/components/admin/ui';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDate, formatMoney, formatTimeRange, shortBookingId } from '@/lib/admin/format';
import { filterParams, listBookings, listFilterOptions, readBookingFilters } from '@/lib/admin/queries/bookings';
import { requireStaff } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Bookings' };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();
  const params = await searchParams;
  const filters = readBookingFilters(params);
  const page = pageFrom(params.page);

  const [{ bookings, total }, options] = await Promise.all([listBookings(filters, page), listFilterOptions()]);
  const query = new URLSearchParams(
    Object.entries(filterParams(filters)).filter((entry): entry is [string, string] => Boolean(entry[1]))
  ).toString();
  const hasFilters = query.length > 0;

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every confirmed and cancelled booking, from the app and the front desk."
        actions={
          <>
            <a href={`/admin/bookings/export${query ? `?${query}` : ''}`} className={buttonClass('secondary')}>
              <Download className="size-4" aria-hidden /> Export CSV
            </a>
            <LinkButton href="/admin/bookings/new">
              <Plus className="size-4" aria-hidden /> New booking
            </LinkButton>
          </>
        }
      />

      <Card className="mb-4">
        <form method="get" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="q" className="sr-only">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Booking ID, customer name or phone"
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="from">
              From
            </label>
            <input id="from" name="from" type="date" defaultValue={filters.from} className={inputClass} aria-label="From date" />
            <label className="sr-only" htmlFor="to">
              To
            </label>
            <input id="to" name="to" type="date" defaultValue={filters.to} className={inputClass} aria-label="To date" />
          </div>
          <select name="status" defaultValue={filters.status ?? ''} className={inputClass} aria-label="Booking status">
            <option value="">Confirmed & cancelled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PENDING">Awaiting payment (app checkout)</option>
          </select>
          <select name="payment" defaultValue={filters.payment ?? ''} className={inputClass} aria-label="Payment status">
            <option value="">Any payment</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <select name="source" defaultValue={filters.source ?? ''} className={inputClass} aria-label="Source">
            <option value="">App & front desk</option>
            <option value="APP">App</option>
            <option value="ADMIN">Front desk</option>
          </select>
          <select name="venue" defaultValue={filters.venue ?? ''} className={inputClass} aria-label="Venue">
            <option value="">All venues</option>
            {options.venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
          <select name="facility" defaultValue={filters.facility ?? ''} className={inputClass} aria-label="Court">
            <option value="">All courts</option>
            {options.facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
            {hasFilters ? (
              <Link href="/admin/bookings" className={buttonClass('ghost')}>
                Reset
              </Link>
            ) : null}
            <button type="submit" className={buttonClass('primary')}>
              Apply filters
            </button>
          </div>
        </form>
      </Card>

      <Card>
        {bookings.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No bookings match these filters' : 'No bookings yet'}
            description={hasFilters ? 'Try a wider date range or clear the filters.' : 'Bookings from the app and the front desk will appear here.'}
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Booking</Th>
                  <Th>Date & time</Th>
                  <Th>Court</Th>
                  <Th>Customer</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Status</Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-zinc-50">
                    <Td>
                      <Link href={`/admin/bookings/${booking.id}`} className="font-mono text-sm font-medium text-zinc-950 hover:underline">
                        {shortBookingId(booking.id)}
                      </Link>
                      {booking.is_scanned ? (
                        <div className="mt-1">
                          <Badge tone="blue">Checked in</Badge>
                        </div>
                      ) : null}
                    </Td>
                    <Td>
                      <div className="font-medium text-zinc-900">{formatDate(booking.booking_date)}</div>
                      <div className="text-xs text-zinc-500">{formatTimeRange(booking.start_time, booking.end_time)}</div>
                    </Td>
                    <Td>
                      <div className="text-zinc-900">{booking.facilities.name}</div>
                      <div className="text-xs text-zinc-500">
                        {[booking.facilities.court_types?.sports?.name, booking.facilities.venues?.name].filter(Boolean).join(' · ')}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-zinc-900">{booking.contact_name || '—'}</div>
                      <div className="text-xs text-zinc-500">{booking.contact_phone || (booking.user_id ? 'App customer' : '')}</div>
                    </Td>
                    <Td className="text-right tabular-nums">{formatMoney(booking.amount_paid)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <BookingStatusBadge status={booking.status} />
                        <PaymentStatusBadge status={booking.payment_status} />
                      </div>
                    </Td>
                    <Td>
                      <SourceBadge source={booking.source} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination basePath="/admin/bookings" params={filterParams(filters)} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </Card>
    </>
  );
}
