import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ActiveBadge } from '@/components/admin/status';
import { Card, EmptyState, LinkButton, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import { listVenues } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Venues & hours' };

export default async function VenuesPage() {
  await requireAdmin();
  const venues = await listVenues();

  return (
    <>
      <PageHeader
        title="Venues & hours"
        description="Each venue has its own address, timezone, weekly opening hours and courts."
        actions={
          <LinkButton href="/admin/venues/new">
            <Plus className="size-4" aria-hidden /> Add venue
          </LinkButton>
        }
      />
      <Card>
        {venues.length === 0 ? (
          <EmptyState title="No venues yet" description="Add your first venue, then its courts and opening hours." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Venue</Th>
                <Th>Timezone</Th>
                <Th className="text-right">Courts</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr key={venue.id} className="hover:bg-zinc-50">
                  <Td>
                    <Link href={`/admin/venues/${venue.id}`} className="font-medium text-zinc-950 hover:underline">
                      {venue.name}
                    </Link>
                    <div className="text-xs text-zinc-500">{venue.address || 'No address'}</div>
                  </Td>
                  <Td>{venue.timezone}</Td>
                  <Td className="text-right tabular-nums">{venue.courtCount}</Td>
                  <Td>
                    <ActiveBadge active={venue.is_active} />
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
