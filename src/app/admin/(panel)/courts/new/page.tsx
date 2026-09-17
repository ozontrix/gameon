import type { Metadata } from 'next';

import { CourtForm } from '@/components/admin/catalog-forms';
import { Card, CardBody, PageHeader } from '@/components/admin/ui';
import { listCatalogOptions } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Add court' };

export default async function NewCourtPage({ searchParams }: { searchParams: Promise<{ venue?: string }> }) {
  await requireAdmin();
  const [{ venue }, options] = await Promise.all([searchParams, listCatalogOptions()]);

  return (
    <>
      <PageHeader back={{ href: '/admin/courts', label: 'Courts' }} title="Add court" />
      <Card className="max-w-3xl">
        <CardBody>
          <CourtForm venues={options.venues} sports={options.sports} defaultVenueId={venue} />
        </CardBody>
      </Card>
    </>
  );
}
