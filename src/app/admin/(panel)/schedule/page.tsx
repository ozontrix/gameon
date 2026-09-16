import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, EmptyState, LinkButton, Notice, PageHeader, buttonClass, inputClass } from '@/components/admin/ui';
import { addDays, formatDate, formatTime, todayIn } from '@/lib/admin/format';
import { getSchedule, type ScheduleCell } from '@/lib/admin/queries/schedule';
import { requireStaff } from '@/lib/admin/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Schedule' };

function Legend() {
  const items = [
    { label: 'Free', className: 'border border-dashed border-zinc-300 bg-white' },
    { label: 'Booked', className: 'bg-emerald-100 ring-1 ring-emerald-300' },
    { label: 'Unpaid', className: 'bg-amber-100 ring-1 ring-amber-300' },
    { label: 'Paying in app', className: 'bg-sky-100 ring-1 ring-sky-300' },
    { label: 'Closed', className: 'bg-zinc-200' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={cn('inline-block size-3 rounded-sm', item.className)} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Cell({ cell, facilityId, date }: { cell: ScheduleCell; facilityId: string; date: string }) {
  const base = 'flex h-14 w-full flex-col justify-center rounded-md px-2 text-left text-xs leading-tight';

  switch (cell.state) {
    case 'booked':
    case 'held': {
      const tone =
        cell.state === 'held'
          ? 'bg-sky-100 text-sky-900 ring-sky-300'
          : cell.booking.paid
            ? 'bg-emerald-100 text-emerald-900 ring-emerald-300'
            : 'bg-amber-100 text-amber-900 ring-amber-300';
      return (
        <Link
          href={`/admin/bookings/${cell.booking.id}`}
          className={cn(base, 'ring-1 ring-inset transition hover:brightness-95', tone)}
          title={`${cell.booking.name ?? 'Booking'} · ${formatTime(cell.start)}`}
        >
          <span className="truncate font-medium">{cell.state === 'held' ? 'Paying…' : (cell.booking.name ?? 'Booked')}</span>
          <span className="truncate opacity-75">
            {cell.state === 'held' ? 'App checkout' : cell.booking.checkedIn ? 'Checked in' : cell.booking.paid ? 'Paid' : 'Unpaid'}
          </span>
        </Link>
      );
    }
    case 'closed':
      return (
        <div className={cn(base, 'bg-zinc-200 text-zinc-600')} title={cell.reason}>
          <span className="truncate font-medium">Closed</span>
          <span className="truncate">{cell.reason}</span>
        </div>
      );
    case 'past':
      return <div className={cn(base, 'bg-zinc-50 text-zinc-300')} aria-label="Past" />;
    case 'free':
      return (
        <Link
          href={`/admin/bookings/new?facility=${facilityId}&date=${date}&start=${cell.start}`}
          className={cn(base, 'border border-dashed border-zinc-300 bg-white text-zinc-400 transition hover:border-zinc-900 hover:text-zinc-900')}
          aria-label={`Book ${formatTime(cell.start)}`}
        >
          <span className="font-medium">+ Book</span>
        </Link>
      );
  }
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; date?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const requestedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;
  const date = requestedDate ?? todayIn();

  const { venues, venue, slots, rows, closedAllDay } = await getSchedule(params.venue, date);
  const link = (target: string) => `/admin/schedule?${new URLSearchParams({ ...(venue ? { venue: venue.id } : {}), date: target })}`;
  const today = todayIn(venue?.timezone ?? undefined);

  return (
    <>
      <PageHeader
        title="Schedule"
        description={venue ? `${venue.name} · ${formatDate(date)}` : 'No active venues'}
        actions={<LinkButton href="/admin/bookings/new">New booking</LinkButton>}
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <form method="get" className="flex flex-wrap items-center gap-2">
            {venues.length > 1 ? (
              <select name="venue" defaultValue={venue?.id} className={cn(inputClass, 'w-auto')} aria-label="Venue">
                {venues.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            ) : venue ? (
              <input type="hidden" name="venue" value={venue.id} />
            ) : null}
            <input type="date" name="date" defaultValue={date} className={cn(inputClass, 'w-auto')} aria-label="Date" />
            <button type="submit" className={buttonClass('secondary')}>
              Go
            </button>
          </form>
          <div className="flex items-center gap-2">
            <Link href={link(addDays(date, -1))} className={buttonClass('secondary', 'sm')} aria-label="Previous day">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={link(today)} className={buttonClass('secondary', 'sm')}>
              Today
            </Link>
            <Link href={link(addDays(date, 1))} className={buttonClass('secondary', 'sm')} aria-label="Next day">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="border-t border-zinc-100 px-4 py-3">
          <Legend />
        </div>
      </Card>

      {!venue ? (
        <Card>
          <EmptyState title="No active venues" description="Add a venue and its courts to see the schedule." />
        </Card>
      ) : closedAllDay ? (
        <Notice tone="warning">{venue.name} is closed all day on {formatDate(date)}.</Notice>
      ) : slots.length === 0 ? (
        <Notice tone="warning">
          {venue.name} has no opening hours on {formatDate(date, { year: false })}. Set them under Venues &amp; hours.
        </Notice>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="No active courts" description="Add courts to this venue to start taking bookings." />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 p-2 text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 min-w-44 bg-white px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Court
                  </th>
                  {slots.map((slot) => (
                    <th key={slot.start_time} scope="col" className="min-w-24 px-1 py-2 text-left text-xs font-medium text-zinc-500">
                      {formatTime(slot.start_time)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ court, cells }) => (
                  <tr key={court.id}>
                    <th scope="row" className="sticky left-0 z-10 bg-white px-2 text-left align-middle">
                      <div className="font-medium text-zinc-900">{court.name}</div>
                      <div className="text-xs font-normal text-zinc-500">{court.sports?.name}</div>
                    </th>
                    {cells.map((cell) => (
                      <td key={cell.start} className="p-0">
                        <Cell cell={cell} facilityId={court.id} date={date} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
