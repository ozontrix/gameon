import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ActiveBadge } from '@/components/admin/status';
import { Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { formatMoney, titleCase } from '@/lib/admin/format';
import { listCatalogOptions, listCourts } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Courts & pricing' };

export default async function CourtsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; sport?: string }>;
}) {
  await requireAdmin();
  const filters = await searchParams;
  const [courts, options] = await Promise.all([listCourts(filters), listCatalogOptions()]);

  return (
    <>
      <PageHeader
        title="Courts & pricing"
        description="Bookable courts, nets and turfs with their hourly price."
        actions={
          <LinkButton href="/admin/courts/new">
            <Plus className="size-4" aria-hidden /> Add court
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
          <select name="sport" defaultValue={filters.sport ?? ''} className={cn(inputClass, 'w-auto')} aria-label="Sport">
            <option value="">All sports</option>
            {options.sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass('secondary')}>
            Filter
          </button>
        </form>
      </Card>

      <Card>
        {courts.length === 0 ? (
          <EmptyState title="No courts found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Court</Th>
                <Th>Venue</Th>
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
                  <Td>{court.venues?.name ?? '—'}</Td>
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
    </>
  );
}
