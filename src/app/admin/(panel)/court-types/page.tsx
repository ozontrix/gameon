import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ActiveBadge } from '@/components/admin/status';
import { Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { formatMoney, titleCase } from '@/lib/admin/format';
import { listCatalogOptions, listCourtTypes } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Court types & pricing' };

export default async function CourtTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; sport?: string }>;
}) {
  await requireAdmin();
  const filters = await searchParams;
  const [courtTypes, options] = await Promise.all([listCourtTypes(filters), listCatalogOptions()]);

  return (
    <>
      <PageHeader
        title="Court types & pricing"
        description="What the app lists and prices. Each type sells its own slot lengths at its own prices; its courts are the bookable units."
        actions={
          <LinkButton href="/admin/court-types/new">
            <Plus className="size-4" aria-hidden /> Add court type
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
        {courtTypes.length === 0 ? (
          <EmptyState title="No court types found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Court type</Th>
                <Th>Venue</Th>
                <Th>Attributes</Th>
                <Th className="text-right">Courts</Th>
                <Th>Slot lengths &amp; prices</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {courtTypes.map((type) => (
                <tr key={type.id} className="hover:bg-zinc-50">
                  <Td>
                    <Link href={`/admin/court-types/${type.id}`} className="font-medium text-zinc-950 hover:underline">
                      {type.name}
                    </Link>
                    <div className="text-xs text-zinc-500">{type.sports?.name}</div>
                  </Td>
                  <Td>{type.venues?.name ?? '—'}</Td>
                  <Td className="text-xs">
                    {[titleCase(type.surface_type), type.is_indoor ? 'Indoor' : 'Outdoor', type.has_ac ? 'AC' : 'Non-AC'].join(' · ')}
                  </Td>
                  <Td className="text-right tabular-nums">{type.courtCount}</Td>
                  <Td className="text-xs">
                    {type.slotOptions.length === 0 ? (
                      <span className="text-amber-700">None — hidden from the app</span>
                    ) : (
                      type.slotOptions.map((option) => (
                        <div key={option.duration_minutes} className="tabular-nums">
                          {option.duration_minutes} min · {formatMoney(option.price)}
                        </div>
                      ))
                    )}
                  </Td>
                  <Td>
                    <ActiveBadge active={type.is_active} />
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
