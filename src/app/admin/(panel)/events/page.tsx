import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EventStatusBadge } from '@/components/admin/status';
import { Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { formatDate, formatMoney } from '@/lib/admin/format';
import { listCatalogOptions } from '@/lib/admin/queries/catalog';
import { listEvents } from '@/lib/admin/queries/events';
import { requireAdmin } from '@/lib/admin/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Events' };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; status?: string }>;
}) {
  await requireAdmin();
  const filters = await searchParams;
  const [events, options] = await Promise.all([listEvents(filters), listCatalogOptions()]);

  return (
    <>
      <PageHeader
        title="Events"
        description="Occasions at a venue — carnivals, festivals, community days. Sell tickets by the head, no team, no court reservation."
        actions={
          <LinkButton href="/admin/events/new">
            <Plus className="size-4" aria-hidden /> Add event
          </LinkButton>
        }
      />

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-center gap-2 p-4">
          <select name="venue" defaultValue={filters.venue ?? ''} className={cn(inputClass, 'w-auto')} aria-label="Venue">
            <option value="">All venues</option>
            {options.venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={filters.status ?? ''} className={cn(inputClass, 'w-auto')} aria-label="Status">
            <option value="">All statuses</option>
            {['draft', 'published', 'registration_closed', 'completed', 'cancelled'].map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass('secondary')}>
            Filter
          </button>
        </form>
      </Card>

      <Card>
        {events.length === 0 ? (
          <EmptyState title="No events found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Venue</Th>
                <Th>Dates</Th>
                <Th className="text-right">Tickets</Th>
                <Th>Fee</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-zinc-50">
                  <Td>
                    <Link href={`/admin/events/${event.id}`} className="font-medium text-zinc-950 hover:underline">
                      {event.title}
                    </Link>
                    <div className="text-xs text-zinc-500">{event.category}</div>
                  </Td>
                  <Td className="text-xs">{event.venues?.name ?? '—'}</Td>
                  <Td className="text-xs">
                    {formatDate(event.starts_on)} – {formatDate(event.ends_on)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {event.ticketsSold} / {event.ticket_capacity}
                  </Td>
                  <Td>{event.entry_fee === null ? 'Free' : `${formatMoney(event.entry_fee)} ${event.fee_unit}`}</Td>
                  <Td>
                    <EventStatusBadge status={event.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
