import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventGallery } from '@/components/admin/event-gallery';
import { EventForm } from '@/components/admin/event-forms';
import { EventSectionsEditor } from '@/components/admin/event-sections-editor';
import { BookingStatusBadge, EventStatusBadge, PaymentStatusBadge } from '@/components/admin/status';
import { Card, CardBody, EmptyState, Notice, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import {
  addEventImage,
  deleteEventImage,
  deleteEventSection,
  moveEventImage,
  saveEventSection,
} from '@/lib/admin/actions/events';
import { formatDateTime, formatMoney } from '@/lib/admin/format';
import { listCatalogOptions } from '@/lib/admin/queries/catalog';
import { getEvent } from '@/lib/admin/queries/events';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Event' };

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [result, options] = await Promise.all([getEvent(id), listCatalogOptions()]);
  if (!result) notFound();
  const { event, images, sections, orders } = result;

  const ticketsSold = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((total, o) => total + o.tickets, 0);

  return (
    <>
      <PageHeader
        back={{ href: '/admin/events', label: 'Events' }}
        title={
          <span className="flex items-center gap-3">
            {event.title} <EventStatusBadge status={event.status} />
          </span>
        }
      />
      {created ? (
        <div className="mb-4">
          <Notice tone="success">Event created as a draft. Add its photos and sections, then set it to Published.</Notice>
        </div>
      ) : null}
      {event.status === 'draft' ? (
        <div className="mb-4">
          <Notice tone="warning">Draft — hidden from the app. Set the status to Published when it&apos;s ready to sell tickets.</Notice>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardBody>
              <EventForm event={event} venues={options.venues} sports={options.sports} />
            </CardBody>
          </Card>
          <Card>
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-900">Sections</h2>
              <p className="text-xs text-zinc-500">&quot;What&apos;s on&quot;, &quot;Good to know&quot; — free text an admin writes, no release needed.</p>
            </div>
            <CardBody>
              <EventSectionsEditor
                ownerId={event.id}
                ownerField="event_id"
                sections={sections}
                saveAction={saveEventSection}
                deleteAction={deleteEventSection}
              />
            </CardBody>
          </Card>
          <Card>
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-900">Photos</h2>
              <p className="text-xs text-zinc-500">The app&apos;s gallery shows these in order; the first is the card cover.</p>
            </div>
            <CardBody>
              <EventGallery
                ownerId={event.id}
                ownerField="eventId"
                name={event.title}
                photos={images}
                addAction={addEventImage}
                deleteAction={deleteEventImage}
                moveAction={moveEventImage}
              />
            </CardBody>
          </Card>
        </div>

        <Card>
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-900">Ticket orders</h2>
            <p className="text-xs text-zinc-500">
              {orders.length === 0 ? 'No orders yet.' : `${ticketsSold} of ${event.ticket_capacity} tickets.`}
            </p>
          </div>
          {orders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Attendee</Th>
                  <Th className="text-right">Tickets</Th>
                  <Th>Paid</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50">
                    <Td>
                      <div className="font-medium text-zinc-950">{order.attendee_name}</div>
                      <div className="text-xs text-zinc-500">{formatDateTime(order.created_at)}</div>
                    </Td>
                    <Td className="text-right tabular-nums">{order.tickets}</Td>
                    <Td className="text-xs">
                      {formatMoney(order.amount_paid)}
                      <div>
                        <PaymentStatusBadge status={order.payment_status} />
                      </div>
                    </Td>
                    <Td>
                      <BookingStatusBadge status={order.status} />
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
