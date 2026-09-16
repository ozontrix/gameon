import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OperatingHoursForm, VenueForm } from '@/components/admin/catalog-forms';
import { ActiveBadge } from '@/components/admin/status';
import { Card, CardBody, CardHeader, EmptyState, LinkButton, Notice, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import { formatDate, formatMoney, formatTimeRange, titleCase } from '@/lib/admin/format';
import { getVenue } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Venue' };

export default async function VenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const result = await getVenue(id);
  if (!result) notFound();
  const { venue, hours, courts, closures } = result;

  return (
    <>
      <PageHeader
        back={{ href: '/admin/venues', label: 'Venues' }}
        title={
          <span className="flex items-center gap-3">
            {venue.name} <ActiveBadge active={venue.is_active} />
          </span>
        }
        description={venue.address ?? undefined}
        actions={<LinkButton href={`/admin/schedule?venue=${venue.id}`} variant="secondary">View schedule</LinkButton>}
      />

      {created ? (
        <div className="mb-4">
          <Notice tone="success" title="Venue created">
            Next, set the opening hours below and add its courts. The venue takes no bookings until both exist.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <Card>
            <CardHeader title="Opening hours" description="Slots are generated from these hours for every court at this venue." />
            <CardBody>
              <OperatingHoursForm venueId={venue.id} hours={hours} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Courts"
              action={
                <LinkButton href={`/admin/courts/new?venue=${venue.id}`} size="sm">
                  <Plus className="size-4" aria-hidden /> Add court
                </LinkButton>
              }
            />
            {courts.length === 0 ? (
              <EmptyState title="No courts at this venue" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Court</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Per hour</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {courts.map((court) => (
                    <tr key={court.id} className="hover:bg-zinc-50">
                      <Td>
                        <Link href={`/admin/courts/${court.id}`} className="font-medium text-zinc-950 hover:underline">
                          {court.name}
                        </Link>
                        <div className="text-xs text-zinc-500">{court.sports?.name}</div>
                      </Td>
                      <Td className="text-xs">
                        {[titleCase(court.surface_type), court.is_indoor ? 'Indoor' : 'Outdoor', court.has_ac ? 'AC' : 'Non-AC'].join(' · ')}
                      </Td>
                      <Td className="text-right tabular-nums">{formatMoney(court.price_per_hour)}</Td>
                      <Td>
                        <ActiveBadge active={court.is_active} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Venue details" />
            <CardBody>
              <VenueForm venue={venue} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Upcoming closures"
              action={
                <LinkButton href="/admin/closures" variant="secondary" size="sm">
                  Manage
                </LinkButton>
              }
            />
            <CardBody>
              {closures.length === 0 ? (
                <p className="text-sm text-zinc-500">No upcoming closures.</p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {closures.map((closure) => (
                    <li key={closure.id} className="py-2 text-sm">
                      <p className="font-medium text-zinc-900">{formatDate(closure.date)}</p>
                      <p className="text-zinc-500">
                        {closure.start_time ? formatTimeRange(closure.start_time, closure.end_time) : 'All day'} ·{' '}
                        {closure.facilities?.name ?? 'Whole venue'} · {closure.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
