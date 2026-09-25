import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EventStatusBadge } from '@/components/admin/status';
import { Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { formatDate, formatMoney, titleCase } from '@/lib/admin/format';
import { listCatalogOptions } from '@/lib/admin/queries/catalog';
import { listTournaments } from '@/lib/admin/queries/events';
import { requireAdmin } from '@/lib/admin/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Tournaments' };

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; status?: string }>;
}) {
  await requireAdmin();
  const filters = await searchParams;
  const [tournaments, options] = await Promise.all([listTournaments(filters), listCatalogOptions()]);

  return (
    <>
      <PageHeader
        title="Tournaments"
        description="Team competitions run on one court type. Entering takes a team slot at a fixed fee — there's no session picker."
        actions={
          <LinkButton href="/admin/tournaments/new">
            <Plus className="size-4" aria-hidden /> Add tournament
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
        {tournaments.length === 0 ? (
          <EmptyState title="No tournaments found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Tournament</Th>
                <Th>Venue / court</Th>
                <Th>Dates</Th>
                <Th className="text-right">Teams</Th>
                <Th>Entry fee</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tournament) => (
                <tr key={tournament.id} className="hover:bg-zinc-50">
                  <Td>
                    <Link href={`/admin/tournaments/${tournament.id}`} className="font-medium text-zinc-950 hover:underline">
                      {tournament.title}
                    </Link>
                    <div className="text-xs text-zinc-500">{tournament.match_type}</div>
                  </Td>
                  <Td className="text-xs">
                    {tournament.venues?.name ?? '—'}
                    <div className="text-zinc-500">{tournament.court_types?.name}</div>
                    {tournament.court_types ? (
                      <div className="text-zinc-400">
                        {[
                          titleCase(tournament.court_types.surface_type),
                          tournament.court_types.is_indoor ? 'Indoor' : 'Outdoor',
                          tournament.court_types.has_ac ? 'AC' : 'Non-AC',
                        ].join(' · ')}
                      </div>
                    ) : null}
                  </Td>
                  <Td className="text-xs">
                    {formatDate(tournament.starts_on)} – {formatDate(tournament.ends_on)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {tournament.teamsIn} / {tournament.team_capacity}
                  </Td>
                  <Td>{formatMoney(tournament.entry_fee)}</Td>
                  <Td>
                    <EventStatusBadge status={tournament.status} />
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
