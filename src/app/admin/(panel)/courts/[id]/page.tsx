import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CourtForm } from '@/components/admin/catalog-forms';
import { ActiveBadge } from '@/components/admin/status';
import { Card, CardBody, LinkButton, Notice, PageHeader } from '@/components/admin/ui';
import { getCourt, listCatalogOptions } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Court' };

export default async function CourtPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [court, options] = await Promise.all([getCourt(id), listCatalogOptions()]);
  if (!court) notFound();

  return (
    <>
      <PageHeader
        back={{ href: '/admin/courts', label: 'Courts' }}
        title={
          <span className="flex items-center gap-3">
            {court.name} <ActiveBadge active={court.is_active} />
          </span>
        }
        actions={
          <LinkButton href={`/admin/bookings?facility=${court.id}`} variant="secondary">
            Bookings on this court
          </LinkButton>
        }
      />
      {created ? (
        <div className="mb-4">
          <Notice tone="success">Court created. It takes bookings during the venue&apos;s opening hours.</Notice>
        </div>
      ) : null}
      <Card className="max-w-3xl">
        <CardBody>
          <CourtForm court={court} venues={options.venues} sports={options.sports} />
        </CardBody>
      </Card>
    </>
  );
}
