import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CourtTypeForm } from '@/components/admin/catalog-forms';
import { ActiveBadge } from '@/components/admin/status';
import { Card, CardBody, EmptyState, LinkButton, Notice, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import { getCourtType, listCatalogOptions } from '@/lib/admin/queries/catalog';
import { CourtTypePhotos } from './court-type-photos';
import { SlotOptions } from './slot-options';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Court type' };

export default async function CourtTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [result, options] = await Promise.all([getCourtType(id), listCatalogOptions()]);
  if (!result) notFound();
  const { courtType, courts, images, slotOptions } = result;

  return (
    <>
      <PageHeader
        back={{ href: '/admin/court-types', label: 'Court types' }}
        title={
          <span className="flex items-center gap-3">
            {courtType.name} <ActiveBadge active={courtType.is_active} />
          </span>
        }
        actions={
          <LinkButton href={`/admin/courts/new?type=${courtType.id}`} variant="secondary">
            <Plus className="size-4" aria-hidden /> Add a court
          </LinkButton>
        }
      />
      {created ? (
        <div className="mb-4">
          <Notice tone="success">Court type created. Add its slot lengths and prices, then its courts, to start taking bookings.</Notice>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardBody>
              <CourtTypeForm courtType={courtType} venues={options.venues} sports={options.sports} />
            </CardBody>
          </Card>
          <Card>
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-900">Slot lengths &amp; prices</h2>
              <p className="text-xs text-zinc-500">What a player can book on this card, and what each length costs.</p>
            </div>
            <CardBody>
              <SlotOptions courtTypeId={courtType.id} options={slotOptions} />
            </CardBody>
          </Card>
          <Card>
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-900">Photos</h2>
              <p className="text-xs text-zinc-500">The app&apos;s carousel shows these in order; the first is the card cover.</p>
            </div>
            <CardBody>
              <CourtTypePhotos courtTypeId={courtType.id} name={courtType.name} photos={images} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-900">Courts of this type</h2>
            <p className="text-xs text-zinc-500">
              {courts.length === 0
                ? 'None yet — this type takes no bookings until it has a court.'
                : `${courts.length} bookable ${courts.length === 1 ? 'court' : 'courts'}, all at this type's slot prices.`}
            </p>
          </div>
          {courts.length === 0 ? (
            <EmptyState title="No courts yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Court</Th>
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
                    </Td>
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
    </>
  );
}
