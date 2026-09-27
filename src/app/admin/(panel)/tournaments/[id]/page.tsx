import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventGallery } from '@/components/admin/event-gallery';
import { TournamentForm } from '@/components/admin/event-forms';
import { EventSectionsEditor } from '@/components/admin/event-sections-editor';
import { BookingStatusBadge, EventStatusBadge, PaymentStatusBadge } from '@/components/admin/status';
import { Card, CardBody, EmptyState, Notice, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import {
  addTournamentImage,
  deleteTournamentImage,
  deleteTournamentSection,
  moveTournamentImage,
  saveTournamentSection,
} from '@/lib/admin/actions/events';
import { formatDateTime, formatMoney } from '@/lib/admin/format';
import { listCatalogOptions } from '@/lib/admin/queries/catalog';
import { getTournament } from '@/lib/admin/queries/events';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Tournament' };

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [result, options] = await Promise.all([getTournament(id), listCatalogOptions()]);
  if (!result) notFound();
  const { tournament, images, sections, registrations } = result;

  return (
    <>
      <PageHeader
        back={{ href: '/admin/tournaments', label: 'Tournaments' }}
        title={
          <span className="flex items-center gap-3">
            {tournament.title} <EventStatusBadge status={tournament.status} />
          </span>
        }
      />
      {created ? (
        <div className="mb-4">
          <Notice tone="success">Tournament created as a draft. Add its photos and sections, then set it to Published.</Notice>
        </div>
      ) : null}
      {tournament.status === 'draft' ? (
        <div className="mb-4">
          <Notice tone="warning">Draft — hidden from the app. Set the status to Published when it&apos;s ready to take entries.</Notice>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardBody>
              <TournamentForm tournament={tournament} courtTypes={options.courtTypes} />
            </CardBody>
          </Card>
          <Card>
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-900">Sections</h2>
              <p className="text-xs text-zinc-500">Prizes, rules, what you get — free text an admin writes, no release needed.</p>
            </div>
            <CardBody>
              <EventSectionsEditor
                ownerId={tournament.id}
                ownerField="tournament_id"
                sections={sections}
                saveAction={saveTournamentSection}
                deleteAction={deleteTournamentSection}
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
                ownerId={tournament.id}
                ownerField="tournamentId"
                name={tournament.title}
                photos={images}
                addAction={addTournamentImage}
                deleteAction={deleteTournamentImage}
                moveAction={moveTournamentImage}
              />
            </CardBody>
          </Card>
        </div>

        <Card>
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-900">Teams entered</h2>
            <p className="text-xs text-zinc-500">
              {registrations.length === 0
                ? 'No entries yet.'
                : `${registrations.filter((r) => r.status !== 'CANCELLED').length} of ${tournament.team_capacity} team slots.`}
            </p>
          </div>
          {registrations.length === 0 ? (
            <EmptyState title="No entries yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Team</Th>
                  <Th>Captain</Th>
                  <Th>Paid</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr key={registration.id} className="hover:bg-zinc-50">
                    <Td>
                      <div className="font-medium text-zinc-950">{registration.team_name}</div>
                      <div className="text-xs text-zinc-500">{formatDateTime(registration.created_at)}</div>
                    </Td>
                    <Td className="text-xs">
                      {registration.captain_name}
                      <div className="text-zinc-500">{registration.contact_phone}</div>
                    </Td>
                    <Td className="text-xs">
                      {formatMoney(registration.amount_paid)}
                      <div>
                        <PaymentStatusBadge status={registration.payment_status} />
                      </div>
                    </Td>
                    <Td>
                      <BookingStatusBadge status={registration.status} />
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
