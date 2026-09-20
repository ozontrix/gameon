import type { Metadata } from 'next';

import { CourtTypeForm } from '@/components/admin/catalog-forms';
import { Card, CardBody, PageHeader } from '@/components/admin/ui';
import { listCatalogOptions } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Add court type' };

export default async function NewCourtTypePage({ searchParams }: { searchParams: Promise<{ venue?: string }> }) {
  await requireAdmin();
  const [{ venue }, options] = await Promise.all([searchParams, listCatalogOptions()]);

  return (
    <>
      <PageHeader
        back={{ href: '/admin/court-types', label: 'Court types' }}
        title="Add court type"
        description="Create the priced category first, then add its courts."
      />
      <Card className="max-w-3xl">
        <CardBody>
          <CourtTypeForm venues={options.venues} sports={options.sports} defaultVenueId={venue} />
        </CardBody>
      </Card>
    </>
  );
}
